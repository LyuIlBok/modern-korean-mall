const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');

const PORT = 5001;
const KEY_FILE = "gemini_key.txt";
const APP_FILE = "leitner_app.html";

// Global state of the AI Agent
let agentState = {
    status: "IDLE", // IDLE, THINKING, EXECUTING, SUCCESS, ERROR
    thought: "대기 중... 명령을 입력하십시오.",
    currentAction: "None",
    observation: "None",
    goal: "None",
    step: 0,
    maxSteps: 10
};

function loadGeminiKey() {
    if (fs.existsSync(KEY_FILE)) {
        return fs.readFileSync(KEY_FILE, 'utf8').trim();
    }
    return "";
}

// Autonomous Agent Logic
async function runAgentLoop(goal) {
    const apiKey = loadGeminiKey();
    if (!apiKey) {
        agentState.status = "ERROR";
        agentState.thought = "Gemini API Key가 누락되었습니다. gemini_key.txt 파일에 입력해 주십시오.";
        return;
    }

    agentState.goal = goal;
    agentState.status = "THINKING";
    agentState.thought = "과업 분석 및 문제 해결을 설계 중입니다...";
    agentState.step = 1;
    agentState.currentAction = "Initializing";
    agentState.observation = "None";

    const systemInstruction = `You are 'AgriLeitner Web Agent', an elite autonomous software developer.
Your objective is to complete the user's goal by using the provided tools step-by-step.

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
            agentState.thought = `API 네트워크 오류: ${e.message}`;
            break;
        }

        // 2. Parse JSON
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
            agentState.thought = "AI 응답 JSON 분석 실패.";
            break;
        }

        const thought = actionData.thought || "분석 중...";
        const action = actionData.action;
        const parameters = actionData.parameters || {};

        agentState.thought = thought;
        agentState.currentAction = action;
        agentState.status = "THINKING";

        if (action === "done") {
            agentState.status = "SUCCESS";
            agentState.thought = `모든 작업을 완성했습니다!`;
            agentState.observation = parameters.message || "완료";
            break;
        }

        // 3. Execute Tool
        agentState.status = "EXECUTING";
        let observation = "";
        if (action === "read_file") {
            const fPath = parameters.path;
            if (fs.existsSync(fPath)) {
                observation = fs.readFileSync(fPath, 'utf8');
            } else {
                observation = `Error: File '${fPath}' not found.`;
            }
        } else if (action === "write_file") {
            try {
                // Auto backup
                const p = parameters.path;
                if (fs.existsSync(p)) {
                    fs.writeFileSync(p + ".bak", fs.readFileSync(p, 'utf8'), 'utf8');
                }
                fs.writeFileSync(p, parameters.content, 'utf8');
                observation = `Success: File written successfully. Backup created.`;
            } catch (e) {
                observation = `Error writing file: ${e.message}`;
            }
        } else if (action === "run_command") {
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
        conversationHistory.push({ role: "assistant", content: aiResClean });
        conversationHistory.push({ role: "user", content: `[OBSERVATION]\n${observation}` });

        agentState.step++;
        await new Promise(r => setTimeout(r, 1500)); // Delay for smooth UI transitions
    }

    if (agentState.step > agentState.maxSteps && agentState.status !== "SUCCESS") {
        agentState.status = "ERROR";
        agentState.thought = "허용된 최적 단계를 초과하여 가동이 중단되었습니다.";
    }
}

// Create HTTP Server
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

    // GET /api/status - Status Poller
    if (parsedUrl.pathname === '/api/status' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(agentState));
        return;
    }

    // GET /api/files - Get local workspace files list
    if (parsedUrl.pathname === '/api/files' && req.method === 'GET') {
        try {
            const files = fs.readdirSync('.').filter(f => !f.startsWith('.') && fs.statSync(f).isFile());
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ files }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // GET /api/file_content - Read file for dashboard preview
    if (parsedUrl.pathname === '/api/file_content' && req.method === 'GET') {
        const filePath = parsedUrl.searchParams.get('path');
        if (!filePath || !fs.existsSync(filePath)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: "File not found." }));
            return;
        }
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ content }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // POST /api/command - Trigger Goal
    if (parsedUrl.pathname === '/api/command' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                if (data.command) {
                    runAgentLoop(data.command);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: "STARTED" }));
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Missing 'command'" }));
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Invalid JSON" }));
            }
        });
        return;
    }

    // POST /api/run_server - Trigger Local Server
    if (parsedUrl.pathname === '/api/run_server' && req.method === 'POST') {
        try {
            exec("start cmd.exe /c \"title AgriLeitner Local Server && npx http-server -p 5000\"");
            setTimeout(() => {
                exec("start http://localhost:5000/leitner_app.html");
            }, 1000);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: "SUCCESS" }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // POST /api/git_sync - Trigger GitSync
    if (parsedUrl.pathname === '/api/git_sync' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const msg = data.message || "Manual Web Sync";
                exec(`node git_sync.js "Web_Center" "${msg}"`, (err, stdout, stderr) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: err ? "ERROR" : "SUCCESS", output: stdout + "\n" + stderr }));
                });
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // POST /api/restore - Trigger Restore
    if (parsedUrl.pathname === '/api/restore' && req.method === 'POST') {
        try {
            if (fs.existsSync(APP_FILE + ".bak")) {
                fs.writeFileSync(APP_FILE, fs.readFileSync(APP_FILE + ".bak", 'utf8'), 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: "SUCCESS" }));
            } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Backup file not found." }));
            }
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    res.writeHead(404);
    res.end();
});

server.listen(PORT, () => {
    console.log(`\n=========================================================`);
    console.log(` 🚀 AgriLeitner Web Agent Backend Server 기동 완료!`);
    console.log(` [서버 주소] http://localhost:${PORT}`);
    console.log(`=========================================================\n`);
});
