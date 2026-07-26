const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');

// ANSI colors for backend terminal console
const C_GREEN = "\x1b[92m";
const C_CYAN = "\x1b[96m";
const C_YELLOW = "\x1b[93m";
const C_RED = "\x1b[91m";
const C_BOLD = "\x1b[1m";
const C_RESET = "\x1b[0m";

const PORT = 5001;
const KEY_FILE = "gemini_key.txt";
const APP_FILE = "leitner_app.html";
const STATE_FILE = "agent_state.json";

// Global state of the AI Agent to stream to Unity
let agentState = {
    status: "IDLE", // IDLE, THINKING, EXECUTING, SUCCESS, ERROR, OFFLINE
    thought: "Unity 연결 대기 중...",
    currentAction: "None",
    observation: "None",
    goal: "None",
    step: 0,
    maxSteps: 10
};

// Recursive helper to list valid project source files (excluding Temp, Library, .git, etc.)
function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    const ignoreFolders = ['.git', 'node_modules', 'Temp', 'Library', 'obj', 'bin', 'mobile_app', 'web_deploy'];
    
    files.forEach((file) => {
        const fullPath = path.join(dirPath, file);
        const relPath = path.relative(__dirname, fullPath).replace(/\\/g, '/');
        
        if (fs.statSync(fullPath).isDirectory()) {
            if (!ignoreFolders.includes(file)) {
                getAllFiles(fullPath, arrayOfFiles);
            }
        } else {
            // Only list relevant editable and previewable code/config/text files
            const ext = path.extname(file).toLowerCase();
            const validExts = ['.js', '.py', '.html', '.cs', '.md', '.json', '.sql', '.txt', '.bat'];
            if (validExts.includes(ext)) {
                arrayOfFiles.push(relPath);
            }
        }
    });
    return arrayOfFiles;
}

// Save state to disk for robustness against reboots
function saveState() {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(agentState, null, 2), 'utf8');
    } catch (e) {
        console.error(`[State Save Error]: ${e.message}`);
    }
}

// Load state from disk to recover from reboots
function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const data = fs.readFileSync(STATE_FILE, 'utf8');
            const loaded = JSON.parse(data);
            
            // If the server crashed or was restarted while the agent was running,
            // change status to ERROR/IDLE with a clean explanation instead of getting stuck in THINKING.
            if (loaded.status === "THINKING" || loaded.status === "EXECUTING") {
                loaded.status = "ERROR";
                loaded.thought = "이전 작업 수행 중 서버가 예기치 않게 재부팅되어 작업이 중단되었습니다. 새로 명령을 전송해 주세요.";
                loaded.currentAction = "Interrupted";
            }
            
            agentState = loaded;
            saveState(); // Update file with the resolved interrupted state
            
            console.log(`\n💾 ${C_CYAN}[State Recovered] 이전 저장된 상태를 성공적으로 복구했습니다:${C_RESET}`);
            console.log(`   - Status: ${agentState.status}`);
            console.log(`   - Goal: ${agentState.goal}`);
            console.log(`   - Step: ${agentState.step}/${agentState.maxSteps}`);
        }
    } catch (e) {
        console.error(`[State Load Error]: ${e.message}`);
    }
}

function loadGeminiKey() {
    if (fs.existsSync(KEY_FILE)) {
        return fs.readFileSync(KEY_FILE, 'utf8').trim();
    }
    return "";
}

// Autonomous Agent Logic (Modified to update state for Unity in real-time)
async function runUnityAgentLoop(goal) {
    const apiKey = loadGeminiKey();
    if (!apiKey) {
        agentState.status = "ERROR";
        agentState.thought = "Gemini API Key가 누락되었습니다. gemini_key.txt 파일에 입력해 주십시오.";
        saveState();
        return;
    }

    agentState.goal = goal;
    agentState.status = "THINKING";
    agentState.thought = "과업 분석을 시작합니다...";
    agentState.step = 1;
    agentState.currentAction = "Initializing";
    agentState.observation = "None";
    saveState();

    const systemInstruction = `You are 'Connect AI Lite for Unity', an elite autonomous AI game assistant.
Your objective is to complete the user's goal by using the provided tools step-by-step.
Your actions will drive the 3D animations and UI displays in the Unity game client in real-time!

AVAILABLE TOOLS:
1. read_file: Read a file's content. Parameters: {"path": "filename"}
2. write_file: Rewrite a file. Parameters: {"path": "filename", "content": "full code content"}
3. run_command: Run a shell command. Parameters: {"command": "shell command"}
4. list_dir: List files in directory. Parameters: {"path": "directory_path"}
5. done: Mark the goal as complete. Parameters: {"message": "final summary of changes"}

MANDATORY FORMAT:
You MUST output EXACTLY ONE JSON object with 'thought', 'action', and 'parameters' fields. No other text.`;

    const conversationHistory = [
        { role: "user", content: `Please complete this goal autonomously: ${goal}` }
    ];

    while (agentState.step <= agentState.maxSteps) {
        agentState.status = "THINKING";
        agentState.thought = "다음 행동을 계획하는 중...";
        saveState();
        
        // 1. Call Gemini
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        let prompt = `${systemInstruction}\n\n`;
        prompt += "--- CONVERSATION HISTORY ---\n";
        for (const turn of conversationHistory) {
            prompt += `Role: ${turn.role}\nContent:\n${turn.content}\n\n`;
        }
        prompt += "Next Step Action (Output exactly 1 JSON object):";

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
        };

        let aiRes = "";
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const resData = await response.json();
            aiRes = resData.candidates[0].content.parts[0].text;
        } catch (e) {
            agentState.status = "ERROR";
            agentState.thought = `Gemini API 호출 중 네트워크 오류가 발생했습니다: ${e.message}`;
            saveState();
            break;
        }

        // 2. Clean and Parse JSON
        let aiResClean = aiRes.trim();
        if (aiResClean.startsWith("```json")) aiResClean = aiResClean.substring(7);
        if (aiResClean.startsWith("```")) aiResClean = aiResClean.substring(3);
        if (aiResClean.endsWith("```")) aiResClean = aiResClean.substring(0, aiResClean.length - 3);
        aiResClean = aiResClean.trim();

        let actionData = null;
        try {
            actionData = JSON.parse(aiResClean);
        } catch (e) {
            agentState.status = "ERROR";
            agentState.thought = "AI의 응답 데이터 수신 오류 (JSON 파싱 실패).";
            saveState();
            break;
        }

        const thought = actionData.thought || "생각 중...";
        const action = actionData.action;
        const parameters = actionData.parameters || {};

        // Update state for Unity
        agentState.thought = thought;
        agentState.currentAction = action;
        agentState.status = "THINKING";
        saveState();

        console.log(`\n 🤔 [AI 생각]: ${thought}`);
        console.log(` 🛠️  [AI 행동 요청]: ${action}`);

        if (action === "done") {
            agentState.status = "SUCCESS";
            agentState.thought = `모든 작업을 성공적으로 완료했습니다! 🎉`;
            agentState.observation = parameters.message || "완료";
            saveState();
            console.log(`\n${C_GREEN}🎉 [성공] 자율 AI 에이전트 과업 완수!${C_RESET}`);
            break;
        }

        // 3. Execute Tool
        agentState.status = "EXECUTING";
        saveState();
        
        let observation = "";
        if (action === "read_file") {
            // Check file
            const fPath = parameters.path;
            if (fs.existsSync(fPath)) {
                observation = fs.readFileSync(fPath, 'utf8');
            } else {
                observation = `Error: File '${fPath}' not found.`;
            }
        } else if (action === "write_file") {
            try {
                fs.writeFileSync(parameters.path, parameters.content, 'utf8');
                observation = `Success: File written.`;
            } catch (e) {
                observation = `Error writing file: ${e.message}`;
            }
        } else if (action === "run_command") {
            // Auto-approve for Unity pipeline
            try {
                observation = execSync(parameters.command, { encoding: 'utf8', timeout: 30000 });
            } catch (e) {
                observation = `Error executing command: ${e.message}`;
            }
        } else if (action === "list_dir") {
            try {
                observation = fs.readdirSync(parameters.path || ".").join("\n");
            } catch (e) {
                observation = `Error: ${e.message}`;
            }
        } else {
            observation = `Error: Unknown action '${action}'.`;
        }

        agentState.observation = observation;
        saveState();
        console.log(` 📊 [실행 결과]: ${observation.substring(0, 150)}...`);

        conversationHistory.push({ role: "assistant", content: aiResClean });
        conversationHistory.push({ role: "user", content: `[OBSERVATION]\n${observation}` });

        agentState.step++;
        await new Promise(r => setTimeout(r, 2000)); // Delay for smooth Unity UI feedback
    }

    if (agentState.step > agentState.maxSteps && agentState.status !== "SUCCESS") {
        agentState.status = "ERROR";
        agentState.thought = "허용된 가동 단계를 초과하여 에이전트 루프가 비정상 종료되었습니다.";
        saveState();
    }
}

// Create HTTP Server
const server = http.createServer((req, res) => {
    // Enable CORS for Unity Client
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

    // GET /api/status - Unity polls real-time agent thought, status, and actions
    if (parsedUrl.pathname === '/api/status' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(agentState));
        return;
    }

    // GET /api/state - Unity polls overall system state (system_state.json) for continuity
    if (parsedUrl.pathname === '/api/state' && req.method === 'GET') {
        const stateFile = "system_state.json";
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        if (fs.existsSync(stateFile)) {
            const systemState = fs.readFileSync(stateFile, 'utf8');
            res.end(systemState);
        } else {
            res.end(JSON.stringify({ error: "System state file not found." }));
        }
        return;
    }

    // GET /api/files - List code/text files recursively in the project
    if (parsedUrl.pathname === '/api/files' && req.method === 'GET') {
        try {
            const filesList = getAllFiles(__dirname);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(filesList));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // GET /api/file_content - Get raw file content (UTF-8) with directory traversal protection
    if (parsedUrl.pathname === '/api/file_content' && req.method === 'GET') {
        const filePath = parsedUrl.searchParams.get('path');
        if (!filePath) {
            res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end("Error: Missing 'path' parameter.");
            return;
        }

        // Secure Path Resolution (Directory Traversal Defense)
        const safePath = path.resolve(__dirname, filePath);
        if (!safePath.startsWith(path.resolve(__dirname))) {
            res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end("Error: Access denied (Directory traversal blocked).");
            return;
        }

        try {
            if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
                const content = fs.readFileSync(safePath, 'utf8');
                res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(content);
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(`Error: File '${filePath}' not found.`);
            }
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(`Error reading file: ${e.message}`);
        }
        return;
    }

    // POST /api/command - Unity triggers a new natural language task
    if (parsedUrl.pathname === '/api/command' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const goal = data.command;
                if (!goal) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Missing 'command' parameter in body." }));
                    return;
                }

                // Run Agent Loop in the background (Non-blocking)
                runUnityAgentLoop(goal);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: "AI Agent loop initiated successfully.", status: "STARTED" }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Malformed JSON payload." }));
            }
        });
        return;
    }

    // Default 404 Route
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "Endpoint not found." }));
});

server.listen(PORT, () => {
    loadState(); // Recover state on boot (handles any interrupted run cleanly)
    console.log("\n" + "=" * 70);
    console.log(` 🎮 ${C_GREEN}Unity ⇄ Node.js Hybrid AI Agent REST API Server 가동 시작!${C_RESET}`);
    console.log(` [서버 주소] http://localhost:${PORT}`);
    console.log(` -> Unity 게임 클라이언트에서 위 주소로 HTTP 요청을 보내 통신합니다.`);
    console.log("=" * 70 + "\n");
});
