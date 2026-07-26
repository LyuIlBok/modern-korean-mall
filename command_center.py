import os
import sys
import json
import time
import subprocess
import urllib.request

# ANSI Terminal Colors
C_GREEN = "\033[92m"
C_CYAN = "\033[96m"
C_YELLOW = "\033[93m"
C_RED = "\033[91m"
C_BOLD = "\033[1m"
C_RESET = "\033[0m"

KEY_FILE = "gemini_key.txt"
APP_FILE = "leitner_app.html"

def load_or_request_api_key():
    if os.path.exists(KEY_FILE):
        with open(KEY_FILE, "r", encoding="utf-8") as f:
            key = f.read().strip()
            if key:
                return key
    
    print(f"\n{C_YELLOW}[안내] 단어 학습 앱 자동 수정을 위해 Gemini API Key가 필요합니다.{C_RESET}")
    print("      (이 키는 로컬 컴퓨터의 'gemini_key.txt' 파일에 안전하게 저장됩니다.)")
    key = input("🔑 Gemini API Key를 입력해 주십시오: ").strip()
    if key:
        with open(KEY_FILE, "w", encoding="utf-8") as f:
            f.write(key)
        print(f"{C_GREEN} -> API 키가 로컬에 정상 저장되었습니다!{C_RESET}")
        return key
    else:
        print(f"{C_RED}[오류] API 키를 입력하지 않아 프로그램을 기동할 수 없습니다.{C_RESET}")
        sys.exit(1)

def call_gemini_api(api_key, system_instruction, user_prompt):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {'Content-Type': 'application/json'}
    
    full_prompt = f"{system_instruction}\n\n[USER COMMAND]\n{user_prompt}"
    
    payload = {
        "contents": [{
            "parts": [{
                "text": full_prompt
            }]
        }],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "text/plain"
        }
    }
    
    req = urllib.request.Request(
        url, 
        data=json.dumps(payload).encode('utf-8'), 
        headers=headers, 
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            text_res = res_data["candidates"][0]["content"]["parts"][0]["text"]
            return text_res
    except Exception as e:
        print(f"{C_RED} -> [API 오류] Gemini 통신 실패: {e}{C_RESET}")
        return None

def run_local_server():
    print(f"\n{C_CYAN}[서버] 로컬 개발 서버(http://localhost:5000/leitner_app.html)를 가동합니다...{C_RESET}")
    # Run in background on Windows without blocking python loop
    try:
        subprocess.Popen("start cmd.exe /c \"title AgriLeitner Local Server && python -m http.server 5000\"", shell=True)
        print(f"{C_GREEN} -> 서버 기동 완료! 자동으로 브라우저 주소를 띄웁니다.{C_RESET}")
        time.sleep(1)
        os.system("start http://localhost:5000/leitner_app.html")
    except Exception as e:
        print(f"{C_RED} -> [서버 오류] 기동 실패: {e}{C_RESET}")

def run_github_sync(msg):
    print(f"\n{C_CYAN}[GitOps] 수정 사항을 로컬 및 GitHub 원격 저장소에 업로드합니다...{C_RESET}")
    try:
        # Run git_sync.py
        p = subprocess.Popen(f'python git_sync.py "AI_Center" "{msg}"', shell=True)
        p.wait()
    except Exception as e:
        print(f"{C_RED} -> [GitOps 오류] 동기화 실패: {e}{C_RESET}")

def handle_code_modification(api_key):
    print(f"\n{C_CYAN}=== 🤖 AI 단어 학습 앱 실시간 코드 자동 편집기 ==={C_RESET}")
    print("원하시는 수정 사항을 편하게 자연어로 설명해 주십시오.")
    print("예: \"메인 화면의 단어 박스 모서리를 좀 더 둥글게 해줘\", \"학습하기 완료 후 축하 이펙트 추가해줘\"")
    instruction = input(f"\n💬 {C_BOLD}명령 입력 (취소: 엔터 빈칸){C_RESET}: ").strip()
    
    if not instruction:
        print(" -> 작업을 취소했습니다.")
        return
        
    if not os.path.exists(APP_FILE):
        print(f"{C_RED}[오류] 수정을 진행할 대상 파일 '{APP_FILE}'이 존재하지 않습니다.{C_RESET}")
        return

    print(f"\n[1/3] 현재 소스코드 파일({APP_FILE})을 읽어 분석하는 중...")
    with open(APP_FILE, "r", encoding="utf-8") as f:
        current_code = f.read()

    print("[2/3] Gemini 초거대 AI에게 코드 편집 연산 요청 중 (약 5~15초 소요)...")
    
    system_instruction = (
        "You are an elite web application software architect and Senior React/Tailwind expert.\n"
        "Your task is to modify the provided single-file HTML application code based strictly on the user's instructions.\n\n"
        "RULES:\n"
        "1. Maintain all existing database structures (Supabase, variables, API keys, Google Pay, styles) perfectly.\n"
        "2. Add high-quality, professional, modern, and beautiful designs, scripts or features according to the request.\n"
        "3. Output the ENTIRE modified file code and ONLY the code. Do not wrap the output in markdown block symbols like ```html or ```, do not include any other conversational preamble or postamble. Your response must start with <!DOCTYPE html> and end with </html>."
    )
    
    user_prompt = f"[CURRENT FILE CONTENT]\n{current_code}\n\n[USER INSTRUCTION]\n{instruction}"
    
    new_code = call_gemini_api(api_key, system_instruction, user_prompt)
    
    if not new_code:
        print(f"{C_RED}[실패] AI 코드 생성에 실패했습니다.{C_RESET}")
        return
        
    # Clean up markdown code blocks if the model ignored the raw text instruction
    new_code_clean = new_code.strip()
    if new_code_clean.startswith("```html"):
        new_code_clean = new_code_clean[7:]
    elif new_code_clean.startswith("```javascript") or new_code_clean.startswith("```"):
        new_code_clean = new_code_clean[new_code_clean.find("\n")+1:]
        
    if new_code_clean.endswith("```"):
        new_code_clean = new_code_clean[:-3]
    new_code_clean = new_code_clean.strip()

    if not new_code_clean.startswith("<!DOCTYPE html>") and not new_code_clean.startswith("<html"):
        print(f"{C_RED}[경고] 생성된 코드가 올바른 HTML 포맷이 아닙니다. 안전을 위해 원본을 보호합니다.{C_RESET}")
        print(f"AI 응답 요약: {new_code[:300]}...")
        return

    # Create safety backup
    backup_file = f"{APP_FILE}.bak"
    print(f"[3/3] 원본 파일 백업 저장 완료 ({backup_file}) 및 새 소스코드 덮어쓰기 적용 중...")
    with open(backup_file, "w", encoding="utf-8") as f:
        f.write(current_code)
        
    with open(APP_FILE, "w", encoding="utf-8") as f:
        f.write(new_code_clean)
        
    print(f"\n{C_GREEN}🎉 [대성공] AI가 사용자님의 지시대로 '{APP_FILE}' 코드를 완벽하게 자동 수정했습니다!{C_RESET}")
    print(f"          (로컬 개발 서버에서 즉시 변경 내용을 확인해 보십시오.)")
    
    # Optional auto git commit
    git_choice = input(f"\n📦 이 수정 사항을 GitHub에 즉시 백업/업로드할까요? (y/n): ").strip().lower()
    if git_choice == 'y':
        run_github_sync(f"AI Auto-Edit: {instruction}")

def show_dashboard():
    print("\n" + "=" * 65)
    print(f"  🍃 {C_BOLD}{C_GREEN}AgriLeitner Pro - One-Stop AI Command Control Center{C_RESET}  ")
    print("=" * 65)
    print(" [1] 🤖 AI에게 자연어로 앱 기능/디자인 변경 명령하기")
    print(" [2] 💻 로컬 테스트 서버 켜고 브라우저로 앱 실행하기")
    print(" [3] 🐙 변경된 모든 사항 GitHub 원격 저장소에 동기화하기")
    print(" [4] 💾 수동 코드 원본 복원하기 (가장 최근 AI 자동 백업본 사용)")
    print(" [5] 🚪 프로그램 종료하기")
    print("=" * 65)

def restore_backup():
    backup_file = f"{APP_FILE}.bak"
    if os.path.exists(backup_file):
        with open(backup_file, "r", encoding="utf-8") as f:
            bak_code = f.read()
        with open(APP_FILE, "w", encoding="utf-8") as f:
            f.write(bak_code)
        print(f"\n{C_GREEN}[성공] 가장 최근 AI 작업 직전의 원본 백업본({backup_file})으로 복구되었습니다!{C_RESET}")
    else:
        print(f"\n{C_RED}[오류] 복구할 수 있는 백업 파일({backup_file})이 존재하지 않습니다.{C_RESET}")

def main():
    # Set console title
    if sys.platform == 'win32':
        os.system("title AgriLeitner Pro AI Command Center")
        
    api_key = load_or_request_api_key()
    
    while True:
        show_dashboard()
        choice = input(f"🎯 {C_BOLD}실행할 작업 번호 선택 (1~5){C_RESET}: ").strip()
        
        if choice == '1':
            handle_code_modification(api_key)
        elif choice == '2':
            run_local_server()
        elif choice == '3':
            commit_msg = input("\n📝 GitHub 커밋 메시지를 입력하세요 (예: 회원가입 로직 완료): ").strip()
            if commit_msg:
                run_github_sync(commit_msg)
            else:
                print(" -> 메시지 미입력으로 작업을 건너뜁니다.")
        elif choice == '4':
            restore_backup()
        elif choice == '5':
            print(f"\n{C_YELLOW}👋 AgriLeitner AI 제어센터를 종료합니다. 수고하셨습니다!{C_RESET}\n")
            sys.exit(0)
        else:
            print(f"\n{C_RED}[알림] 잘못된 선택입니다. 1번부터 5번 사이의 숫자를 입력해 주십시오.{C_RESET}")
        
        time.sleep(1)

if __name__ == "__main__":
    main()
