const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');
const readline = require('readline');

// ANSI Terminal Colors for Premium Cockpit Look
const C_GREEN = "\x1b[92m";
const C_CYAN = "\x1b[96m";
const C_YELLOW = "\x1b[93m";
const C_RED = "\x1b[91m";
const C_BOLD = "\x1b[1m";
const C_PURPLE = "\x1b[95m";
const C_RESET = "\x1b[0m";

const KEY_FILE = "gemini_key.txt";
const CONFIG_FILE = "connect_ai_config.json";
const APP_FILE = "leitner_app.html";

const DEFAULT_CONFIG = {
    engine: "gemini",  // gemini or ollama
    ollama_url: "http://localhost:11434",
    ollama_model: "qwen2.5-coder:7b"
};

function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        } catch (e) {}
    }
    return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

function loadGeminiKey() {
    if (fs.existsSync(KEY_FILE)) {
        return fs.readFileSync(KEY_FILE, 'utf8').trim();
    }
    return "";
}

const askQuestion = (query) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => rl.question(query, (ans) => {
        rl.close();
        resolve(ans.trim());
    }));
};

// --- TOOL IMPLEMENTATIONS ---
function toolReadFile(filePath) {
    console.log(` -> 🛠️  [Tool] 파일 읽는 중: ${filePath}`);
    if (!fs.existsSync(filePath)) {
        return `Error: File '${filePath}' does not exist.`;
    }
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return `Success: Content of ${filePath} (length: ${content.length}):\n${content}`;
    } catch (e) {
        return `Error reading file: ${e.message}`;
    }
}

function toolWriteFile(filePath, content) {
    console.log(` -> 🛠️  [Tool] 파일 저장 중: ${filePath}`);
    try {
        // Create backup if exists
        if (fs.existsSync(filePath)) {
            const backupPath = filePath + ".bak";
            fs.writeFileSync(backupPath, fs.readFileSync(filePath, 'utf8'), 'utf8');
        }
        fs.writeFileSync(filePath, content, 'utf8');
        return `Success: File '${filePath}' written successfully. Safety backup saved as '${filePath}.bak'.`;
    } catch (e) {
        return `Error writing file: ${e.message}`;
    }
}

async function toolRunCommand(command) {
    console.log(` -> 🛠️  [Tool] 쉘 명령어 실행 요청: ${command}`);
    console.log(`\n${C_YELLOW}[에이전트 권한 요청] 아래 명령어를 가동하려고 합니다:${C_RESET}`);
    console.log(`      ==> ${C_BOLD}${command}${C_RESET}`);
    
    const confirm = await askQuestion("이 명령 실행을 허가하시겠습니까? (y/n): ");
    if (confirm.toLowerCase() !== 'y') {
        return "Error: Command execution denied by user.";
    }
        
    try {
        // Run asynchronously but wait for completion
        return new Promise((resolve) => {
            exec(command, { timeout: 45000 }, (error, stdout, stderr) => {
                const output = (stdout || "") + "\n" + (stderr || "");
                if (error) {
                    resolve(`Exit Code: ${error.code}\nOutput:\n${output.trim()}`);
                } else {
                    resolve(`Exit Code: 0\nOutput:\n${output.trim()}`);
                }
            });
        });
    } catch (e) {
        return `Error executing command: ${e.message}`;
    }
}

function toolListDir(dirPath = ".") {
    console.log(` -> 🛠️  [Tool] 디렉터리 목록 조회: ${dirPath}`);
    try {
        const files = fs.readdirSync(dirPath);
        return `Success: Directory contents of '${dirPath}':\n` + files.join("\n");
    } catch (e) {
        return `Error listing directory: ${e.message}`;
    }
}

async function executeAction(action, parameters) {
    if (action === "read_file") {
        return toolReadFile(parameters.path);
    } else if (action === "write_file") {
        return toolWriteFile(parameters.path, parameters.content);
    } else if (action === "run_command") {
        return await toolRunCommand(parameters.command);
    } else if (action === "list_dir") {
        return toolListDir(parameters.path || ".");
    } else {
        return `Error: Unknown tool action '${action}'.`;
    }
}

// --- API ROUTERS ---
async function callGeminiApi(apiKey, systemInstruction, conversationHistory) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    let prompt = `${systemInstruction}\n\n`;
    prompt += "--- CONVERSATION HISTORY & OBSERVATIONS ---\n";
    for (const turn of conversationHistory) {
        prompt += `Role: ${turn.role}\nContent:\n${turn.content}\n\n`;
    }
    prompt += "Next Step Action (Please output exactly 1 JSON object):";
    
    const payload = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
        }
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }
        
        const resData = await response.json();
        return resData.candidates[0].content.parts[0].text;
    } catch (e) {
        console.error(`${C_RED}[API 오류] Gemini 호출 실패: ${e.message}${C_RESET}`);
        return null;
    }
}

async function callOllamaApi(ollamaUrl, model, systemInstruction, conversationHistory) {
    const url = `${ollamaUrl}/api/generate`;
    
    let prompt = `${systemInstruction}\n\n`;
    prompt += "--- CONVERSATION HISTORY & OBSERVATIONS ---\n";
    for (const turn of conversationHistory) {
        prompt += `Role: ${turn.role}\nContent:\n${turn.content}\n\n`;
    }
    prompt += "Next Step Action (Output 1 JSON object):";
    
    const payload = {
        model: model,
        prompt: prompt,
        stream: false,
        options: {
            temperature: 0.2
        }
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }
        
        const resData = await response.json();
        return resData.response;
    } catch (e) {
        console.error(`${C_RED}[API 오류] Ollama 호출 실패: ${e.message}${C_RESET}`);
        return null;
    }
}

// --- RUN CONCURRENT AGENT LOOP ---
async function startAutonomousLoop(goal) {
    const config = loadConfig();
    const engine = config.engine;
    
    console.log("\n" + "="*70);
    console.log(` ${C_PURPLE}🤖 Connect AI Lite (Node.js) - Autonomous AI Agent Loop 구동 중...${C_RESET}`);
    console.log(` [엔진] ${engine.toUpperCase()} | [목표] ${goal}`);
    console.log("="*70);
    
    let apiKey = "";
    if (engine === "gemini") {
        apiKey = loadGeminiKey();
        if (!apiKey) {
            console.log(`${C_RED}[오류] Gemini API Key가 저장되어 있지 않습니다. gemini_key.txt 파일 혹은 키 입력 대기창에서 키를 먼저 셋업하십시오.${C_RESET}`);
            return;
        }
    }
    
    const systemInstruction = `You are 'Connect AI Lite', an elite autonomous AI software developer.
Your objective is to complete the user's goal by using the provided tools step-by-step.

AVAILABLE TOOLS:
1. read_file: Read a file's content. Parameters: {"path": "filename"}
2. write_file: Rewrite a file. Parameters: {"path": "filename", "content": "full code content"}
3. run_command: Run a shell command. Parameters: {"command": "shell command"}
4. list_dir: List files in directory. Parameters: {"path": "directory_path"}
5. done: Mark the goal as complete. Parameters: {"message": "final summary of changes"}

MANDATORY FORMAT:
In each turn, you MUST output EXACTLY ONE JSON object with 'thought', 'action', and 'parameters' fields. No other text, no markdown block syntax. You must think logically about what to do next based on observations.

FORMAT EXAMPLE:
{
  "thought": "I need to find the files in the directory to see how to proceed.",
  "action": "list_dir",
  "parameters": {"path": "."}
}`;
    
    const conversationHistory = [
        { role: "user", content: `Please complete this goal autonomously: ${goal}` }
    ];
    
    let step = 1;
    const maxSteps = 10;
    
    while (step <= maxSteps) {
        console.log(`\n${C_CYAN}[Step ${step}/${maxSteps}] 에이전트의 생각을 수신 중...{C_RESET}`);
        
        let aiRes = null;
        if (engine === "gemini") {
            aiRes = await callGeminiApi(apiKey, systemInstruction, conversationHistory);
        } else {
            aiRes = await callOllamaApi(config.ollama_url, config.ollama_model, systemInstruction, conversationHistory);
        }
            
        if (!aiRes) {
            console.log(`${C_RED} -> AI 응답 수신에 실패했습니다. 루프를 중단합니다.${C_RESET}`);
            break;
        }
            
        // Clean up markdown block if necessary
        let aiResClean = aiRes.trim();
        if (aiResClean.startsWith("```json")) {
            aiResClean = aiResClean.substring(7);
        }
        if (aiResClean.startsWith("```")) {
            aiResClean = aiResClean.substring(3);
        }
        if (aiResClean.endsWith("```")) {
            aiResClean = aiResClean.substring(0, aiResClean.length - 3);
        }
        aiResClean = aiResClean.trim();
        
        let actionData = null;
        try {
            actionData = JSON.parse(aiResClean);
        } catch (e) {
            console.log(`${C_RED}[구문 분석 오류] AI 응답이 유효한 JSON 포맷이 아닙니다: ${e.message}${C_RESET}`);
            console.log(`원시 응답:\n${aiRes}`);
            break;
        }
            
        const thought = actionData.thought || "생각 중...";
        const action = actionData.action;
        const parameters = actionData.parameters || {};
        
        console.log(` 🤔 ${C_BOLD}[에이전트 생각]${C_RESET} ${thought}`);
        
        if (action === "done") {
            console.log(`\n${C_GREEN}🎉 [목표 달성] 에이전트가 과업 완료를 선언했습니다!{C_RESET}`);
            console.log(` -> ${parameters.message}`);
            break;
        }
            
        // Execute tool action
        const observation = await executeAction(action, parameters);
        console.log(observation.length > 250 ? ` 📊 [실행 결과] ${observation.substring(0, 250)}...` : ` 📊 [실행 결과] ${observation}`);
        
        // Save to history
        conversationHistory.push({ role: "assistant", content: aiResClean });
        conversationHistory.push({ role: "user", content: `[OBSERVATION]\n${observation}` });
        
        step++;
        await new Promise(r => setTimeout(r, 1000));
    }
    
    if (step > maxSteps) {
        console.log(`\n${C_YELLOW}[경고] 허용된 최대 단계(${maxSteps} 단계)를 초과하여 에이전트 루프가 강제 중단되었습니다.${C_RESET}`);
    }
}

// --- CONFIGURATION MENU ---
async function showConfigMenu() {
    const config = loadConfig();
    while (true) {
        console.log("\n" + "="*60);
        console.log(` ⚙️  ${C_BOLD}Connect AI Lite - 환경 설정 메뉴${C_RESET}`);
        console.log("="*60);
        console.log(` [1] AI 엔진 변경 (현재: ${config.engine.toUpperCase()})`);
        console.log(` [2] Ollama 서버 주소 변경 (현재: ${config.ollama_url})`);
        console.log(` [3] Ollama 모델명 변경 (현재: ${config.ollama_model})`);
        console.log(" [4] 메인 대시보드로 돌아가기");
        console.log("="*60);
        
        const sel = await askQuestion("🎯 선택할 메뉴 번호: ");
        if (sel === '1') {
            const nextEng = config.engine === "gemini" ? "ollama" : "gemini";
            config.engine = nextEng;
            saveConfig(config);
            console.log(` -> AI 엔진이 ${nextEng.toUpperCase()}로 변경되었습니다!`);
        } else if (sel === '2') {
            const url = await askQuestion("Ollama 서버 주소 입력 (기본: http://localhost:11434): ");
            if (url) {
                config.ollama_url = url;
                saveConfig(config);
                console.log(" -> Ollama 주소가 변경되었습니다!");
            }
        } else if (sel === '3') {
            const model = await askQuestion("사용할 Ollama 로컬 모델명 입력 (예: qwen2.5-coder:7b): ");
            if (model) {
                config.ollama_model = model;
                saveConfig(config);
                console.log(" -> Ollama 모델이 변경되었습니다!");
            }
        } else if (sel === '4') {
            break;
        } else {
            console.log("잘못된 선택입니다.");
        }
    }
}

async function mainDashboard() {
    // Set console title if windows
    if (process.platform === 'win32') {
        process.stdout.write('\x1b]2;Connect AI Lite - Command Studio\x07');
    }
    
    while (true) {
        console.log("\n" + "="*70);
        console.log(`  🧠 ${C_BOLD}{C_GREEN}Connect AI Lite (Node.js) - Autonomous AI Agent Studio (100% Owned)${C_RESET}  `);
        console.log("="*70);
        console.log(" [1] 🤖 자율 행동 AI 에이전트에게 과업 지시하기 (Tool Auto-Loop)");
        console.log(" [2] ⚙️  AI 에이전트 환경 설정 (Gemini Cloud ⇄ Ollama Local)");
        printGeminiKeyStatus();
        console.log(" [3] 🚪 프로그램 종료하기");
        console.log("="*70);
        
        const choice = await askQuestion(`🎯 ${C_BOLD}실행할 작업 번호 선택 (1~3)${C_RESET}: `);
        
        if (choice === '1') {
            console.log(`\n${C_CYAN}=== 🤖 AI 에이전트 자율 과업 지시 창 ===${C_RESET}`);
            console.log("에이전트가 여러 도구를 스스로 조합하여 수행할 종합 목표를 지시하세요.");
            console.log("예: \"leitner_app.html의 전체 디자인을 다크 모드에 맞춰 이쁘게 보정해주고, 수동 백업한 뒤 로컬 웹 서버를 구동해줘.\"");
            const goal = await askQuestion(`\n🏁 ${C_BOLD}목표 입력${C_RESET}: `);
            if (goal) {
                await startAutonomousLoop(goal);
            } else {
                console.log(" -> 작업을 취소했습니다.");
            }
        } else if (choice === '2') {
            await showConfigMenu();
        } else if (choice === '3') {
            console.log(`\n${C_YELLOW}👋 Connect AI Lite 프로그램을 종료합니다. 수고하셨습니다!${C_RESET}\n`);
            process.exit(0);
        } else {
            console.log(`\n${C_RED}[알림] 잘못된 입력입니다. 1~3번 중 선택하십시오.${C_RESET}`);
        }
        
        await new Promise(r => setTimeout(r, 1000));
    }
}

function printGeminiKeyStatus() {
    const key = loadGeminiKey();
    if (key) {
        console.log(`      * Gemini API Key 등록 상태: ${C_GREEN}CONNECTED (저장됨)${C_RESET}`);
    } else {
        console.log(`      * Gemini API Key 등록 상태: ${C_RED}NOT FOUND (gemini_key.txt 필요)${C_RESET}`);
    }
}

// First, make sure key file exists or ask
const key = loadGeminiKey();
if (!key) {
    console.log(`\n${C_YELLOW}[안내] 단어 학습 앱 자동 가동을 위해 Gemini API Key가 필요합니다.${C_RESET}`);
    console.log("      (이 키는 로컬 컴퓨터의 'gemini_key.txt' 파일에 안전하게 저장됩니다.)");
    askQuestion("🔑 Gemini API Key를 입력해 주십시오: ").then(inputKey => {
        if (inputKey) {
            fs.writeFileSync(KEY_FILE, inputKey, 'utf8');
            console.log(`${C_GREEN} -> API 키가 로컬에 정상 저장되었습니다!${C_RESET}`);
            mainDashboard();
        } else {
            console.log(`${C_RED}[오류] API 키를 입력하지 않아 프로그램을 기동할 수 없습니다.${C_RESET}`);
            process.exit(1);
        }
    });
} else {
    mainDashboard();
}
