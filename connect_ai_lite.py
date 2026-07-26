import os
import sys
import json
import time
import subprocess
import urllib.request

# ANSI Terminal Colors for Premium Cockpit Look
C_GREEN = "\033[92m"
C_CYAN = "\033[96m"
C_YELLOW = "\033[93m"
C_RED = "\033[91m"
C_BOLD = "\033[1m"
C_PURPLE = "\033[95m"
C_RESET = "\033[0m"

KEY_FILE = "gemini_key.txt"
CONFIG_FILE = "connect_ai_config.json"

DEFAULT_CONFIG = {
    "engine": "gemini",  # gemini or ollama
    "ollama_url": "http://localhost:11434",
    "ollama_model": "qwen2.5-coder:7b"  # or llama3, codegemma
}

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            pass
    return DEFAULT_CONFIG.copy()

def save_config(config):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)

def load_gemini_key():
    if os.path.exists(KEY_FILE):
        with open(KEY_FILE, "r", encoding="utf-8") as f:
            return f.read().strip()
    return ""

# --- TOOL IMPLEMENTATIONS ---
def tool_read_file(path):
    print(f" -> 🛠️  [Tool] 파일 읽는 중: {path}")
    if not os.path.exists(path):
        return f"Error: File '{path}' does not exist."
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
            return f"Success: Content of {path} (length: {len(content)}):\n{content}"
    except Exception as e:
        return f"Error reading file: {e}"

def tool_write_file(path, content):
    print(f" -> 🛠️  [Tool] 파일 저장 중: {path}")
    try:
        # Create backup if exists
        if os.path.exists(path):
            backup_path = path + ".bak"
            with open(path, "r", encoding="utf-8") as orig:
                orig_data = orig.read()
            with open(backup_path, "w", encoding="utf-8") as bak:
                bak.write(orig_data)
                
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return f"Success: File '{path}' written successfully. Safety backup saved as '{path}.bak'."
    except Exception as e:
        return f"Error writing file: {e}"

def tool_run_command(command):
    print(f" -> 🛠️  [Tool] 쉘 명령어 실행 요청: {command}")
    # Security prompt for command execution
    print(f"\n{C_YELLOW}[에이전트 권한 요청] 아래 명령어를 가동하려고 합니다:{C_RESET}")
    print(f"      ==> {C_BOLD}{command}{C_RESET}")
    confirm = input("이 명령 실행을 허가하시겠습니까? (y/n): ").strip().lower()
    if confirm != 'y':
        return "Error: Command execution denied by user."
        
    try:
        res = subprocess.run(command, capture_output=True, text=True, shell=True, timeout=45)
        output = res.stdout + "\n" + res.stderr
        return f"Exit Code: {res.returncode}\nOutput:\n{output.strip()}"
    except subprocess.TimeoutExpired:
        return "Error: Command execution timed out after 45 seconds."
    except Exception as e:
        return f"Error executing command: {e}"

def tool_list_dir(path="."):
    print(f" -> 🛠️  [Tool] 디렉터리 목록 조회: {path}")
    try:
        files = os.listdir(path)
        return f"Success: Directory contents of '{path}':\n" + "\n".join(files)
    except Exception as e:
        return f"Error listing directory: {e}"

def execute_action(action, parameters):
    if action == "read_file":
        return tool_read_file(parameters.get("path"))
    elif action == "write_file":
        return tool_write_file(parameters.get("path"), parameters.get("content"))
    elif action == "run_command":
        return tool_run_command(parameters.get("command"))
    elif action == "list_dir":
        return tool_list_dir(parameters.get("path", "."))
    else:
        return f"Error: Unknown tool action '{action}'."

# --- API ROUTERS ---
def call_gemini_api(api_key, system_instruction, conversation_history):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {'Content-Type': 'application/json'}
    
    # Combine history into a single prompt block
    prompt = f"{system_instruction}\n\n"
    prompt += "--- CONVERSATION HISTORY & OBSERVATIONS ---\n"
    for turn in conversation_history:
        prompt += f"Role: {turn['role']}\nContent:\n{turn['content']}\n\n"
        
    prompt += "Next Step Action (Please output exactly 1 JSON object):"
    
    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json"
        }
    }
    
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            return res_data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print(f"{C_RED}[API 오류] Gemini 호출 실패: {e}{C_RESET}")
        return None

def call_ollama_api(url, model, system_instruction, conversation_history):
    full_url = f"{url}/api/generate"
    headers = {'Content-Type': 'application/json'}
    
    prompt = f"{system_instruction}\n\n"
    prompt += "--- CONVERSATION HISTORY & OBSERVATIONS ---\n"
    for turn in conversation_history:
        prompt += f"Role: {turn['role']}\nContent:\n{turn['content']}\n\n"
    prompt += "Next Step Action (Output 1 JSON object):"
    
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.2
        }
    }
    
    req = urllib.request.Request(full_url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            return res_data["response"]
    except Exception as e:
        print(f"{C_RED}[API 오류] Ollama 호출 실패: {e}{C_RESET}")
        return None

# --- RUN CONCURRENT AGENT LOOP ---
def start_autonomous_loop(goal):
    config = load_config()
    engine = config["engine"]
    
    print("\n" + "="*70)
    print(f" {C_PURPLE}🤖 Connect AI Lite - Autonomous AI Agent Loop 구동 중...{C_RESET}")
    print(f" [엔진] {engine.upper()} | [목표] {goal}")
    print("="*70)
    
    api_key = ""
    if engine == "gemini":
        api_key = load_gemini_key()
        if not api_key:
            print(f"{C_RED}[오류] Gemini API Key가 저장되어 있지 않습니다. gemini_key.txt 파일 혹은 키 입력 대기창에서 키를 먼저 셋업하십시오.{C_RESET}")
            return
            
    system_instruction = (
        "You are 'Connect AI Lite', an elite autonomous AI software developer.\n"
        "Your objective is to complete the user's goal by using the provided tools step-by-step.\n\n"
        "AVAILABLE TOOLS:\n"
        "1. read_file: Read a file's content. Parameters: {\"path\": \"filename\"}\n"
        "2. write_file: Rewrite a file. Parameters: {\"path\": \"filename\", \"content\": \"full code content\"}\n"
        "3. run_command: Run a shell command. Parameters: {\"command\": \"shell command\"}\n"
        "4. list_dir: List files in directory. Parameters: {\"path\": \"directory_path\"}\n"
        "5. done: Mark the goal as complete. Parameters: {\"message\": \"final summary of changes\"}\n\n"
        "MANDATORY FORMAT:\n"
        "In each turn, you MUST output EXACTLY ONE JSON object with 'thought', 'action', and 'parameters' fields. No other text, no markdown block syntax. You must think logically about what to do next based on observations.\n\n"
        "FORMAT EXAMPLE:\n"
        "{\n"
        "  \"thought\": \"I need to find the files in the directory to see how to proceed.\",\n"
        "  \"action\": \"list_dir\",\n"
        "  \"parameters\": {\"path\": \".\"}\n"
        "}"
    )
    
    conversation_history = [
        {"role": "user", "content": f"Please complete this goal autonomously: {goal}"}
    ]
    
    step = 1
    max_steps = 10
    
    while step <= max_steps:
        print(f"\n{C_CYAN}[Step {step}/{max_steps}] 에이전트의 생각을 수신 중...{C_RESET}")
        
        # 1. Call AI
        if engine == "gemini":
            ai_res = call_gemini_api(api_key, system_instruction, conversation_history)
        else:
            ai_res = call_ollama_api(config["ollama_url"], config["ollama_model"], system_instruction, conversation_history)
            
        if not ai_res:
            print(f"{C_RED} -> AI 응답 수신에 실패했습니다. 루프를 중단합니다.{C_RESET}")
            break
            
        # 2. Parse JSON response
        ai_res_clean = ai_res.strip()
        if ai_res_clean.startswith("```json"):
            ai_res_clean = ai_res_clean[7:]
        if ai_res_clean.startswith("```"):
            ai_res_clean = ai_res_clean[3:]
        if ai_res_clean.endswith("```"):
            ai_res_clean = ai_res_clean[:-3]
        ai_res_clean = ai_res_clean.strip()
        
        try:
            action_data = json.loads(ai_res_clean)
        except Exception as e:
            print(f"{C_RED}[구문 분석 오류] AI 응답이 유효한 JSON 포맷이 아닙니다: {e}{C_RESET}")
            print(f"원시 응답: {ai_res}")
            break
            
        thought = action_data.get("thought", "생각 중...")
        action = action_data.get("action")
        parameters = action_data.get("parameters", {})
        
        print(f" 🤔 {C_BOLD}[에이전트 생각]{C_RESET} {thought}")
        
        if action == "done":
            print(f"\n{C_GREEN}🎉 [목표 달성] 에이전트가 과업 완료를 선언했습니다!{C_RESET}")
            print(f" -> {parameters.get('message')}")
            break
            
        # 3. Execute tool action
        observation = execute_action(action, parameters)
        print(f" 📊 [실행 결과] {observation[:250]}..." if len(observation) > 250 else f" 📊 [실행 결과] {observation}")
        
        # 4. Save to history
        conversation_history.append({"role": "assistant", "content": ai_res_clean})
        conversation_history.append({"role": "user", "content": f"[OBSERVATION]\n{observation}"})
        
        step += 1
        time.sleep(1)
        
    if step > max_steps:
        print(f"\n{C_YELLOW}[경고] 허용된 최대 단계({max_steps} 단계)를 초과하여 에이전트 루프가 강제 중단되었습니다.{C_RESET}")

# --- DASHBOARD & CONFIGURATION MENU ---
def show_config_menu():
    config = load_config()
    while True:
        print("\n" + "="*60)
        print(f" ⚙️  {C_BOLD}Connect AI Lite - 환경 설정 메뉴{C_RESET}")
        print("="*60)
        print(f" [1] AI 엔진 변경 (현재: {config['engine'].upper()})")
        print(f" [2] Ollama 서버 주소 변경 (현재: {config['ollama_url']})")
        print(f" [3] Ollama 모델명 변경 (현재: {config['ollama_model']})")
        print(" [4] 메인 대시보드로 돌아가기")
        print("="*60)
        
        sel = input("🎯 선택할 메뉴 번호: ").strip()
        if sel == '1':
            next_eng = "ollama" if config["engine"] == "gemini" else "gemini"
            config["engine"] = next_eng
            save_config(config)
            print(f" -> AI 엔진이 {next_eng.upper()}로 변경되었습니다!")
        elif sel == '2':
            url = input("Ollama 서버 주소 입력 (기본: http://localhost:11434): ").strip()
            if url:
                config["ollama_url"] = url
                save_config(config)
                print(" -> Ollama 주소가 변경되었습니다!")
        elif sel == '3':
            model = input("사용할 Ollama 로컬 모델명 입력 (예: qwen2.5-coder:7b): ").strip()
            if model:
                config["ollama_model"] = model
                save_config(config)
                print(" -> Ollama 모델이 변경되었습니다!")
        elif sel == '4':
            break
        else:
            print("잘못된 선택입니다.")

def main_dashboard():
    # Set console title
    if sys.platform == 'win32':
        os.system("title Connect AI Lite - Command Studio")
        
    while True:
        print("\n" + "="*70)
        print(f"  🧠 {C_BOLD}{C_GREEN}Connect AI Lite - Autonomous AI Agent Studio (100% Owned){C_RESET}  ")
        print("="*70)
        print(" [1] 🤖 자율 행동 AI 에이전트에게 과업 지시하기 (Tool Auto-Loop)")
        print(" [2] ⚙️  AI 에이전트 환경 설정 (Gemini Cloud ⇄ Ollama Local)")
        print(" [3] 🚪 프로그램 종료하기")
        print("="*70)
        
        choice = input(f"🎯 {C_BOLD}실행할 작업 번호 선택 (1~3){C_RESET}: ").strip()
        
        if choice == '1':
            print(f"\n{C_CYAN}=== 🤖 AI 에이전트 자율 과업 지시 창 ==={C_RESET}")
            print("에이전트가 여러 도구를 스스로 조합하여 수행할 종합 목표를 지시하세요.")
            print("예: \"leitner_app.html의 전체 디자인을 다크 모드에 맞춰 이쁘게 보정해주고, 수동 백업한 뒤 로컬 웹 서버를 구동해줘.\"")
            goal = input(f"\n🏁 {C_BOLD}목표 입력{C_RESET}: ").strip()
            if goal:
                start_autonomous_loop(goal)
            else:
                print(" -> 작업을 취소했습니다.")
        elif choice == '2':
            show_config_menu()
        elif choice == '3':
            print(f"\n{C_YELLOW}👋 Connect AI Lite 프로그램을 종료합니다. 수고하셨습니다!{C_RESET}\n")
            sys.exit(0)
        else:
            print(f"\n{C_RED}[알림] 잘못된 입력입니다. 1~3번 중 선택하십시오.{C_RESET}")
            
        time.sleep(1)

if __name__ == "__main__":
    main_dashboard()
