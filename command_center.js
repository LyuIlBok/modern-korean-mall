const fs = require('fs');
const { exec, execSync } = require('child_process');
const readline = require('readline');

// ANSI Terminal Colors
const C_GREEN = "\x1b[92m";
const C_CYAN = "\x1b[96m";
const C_YELLOW = "\x1b[93m";
const C_RED = "\x1b[91m";
const C_BOLD = "\x1b[1m";
const C_RESET = "\x1b[0m";

const KEY_FILE = "gemini_key.txt";
const APP_FILE = "leitner_app.html";

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

async function loadOrRequestApiKey() {
    let key = loadGeminiKey();
    if (key) return key;
    
    console.log(`\n${C_YELLOW}[안내] 단어 학습 앱 자동 수정을 위해 Gemini API Key가 필요합니다.${C_RESET}`);
    console.log("      (이 키는 로컬 컴퓨터의 'gemini_key.txt' 파일에 안전하게 저장됩니다.)");
    key = await askQuestion("🔑 Gemini API Key를 입력해 주십시오: ");
    if (key) {
        fs.writeFileSync(KEY_FILE, key, 'utf8');
        console.log(`${C_GREEN} -> API 키가 로컬에 정상 저장되었습니다!${C_RESET}`);
        return key;
    } else {
        console.log(`${C_RED}[오류] API 키를 입력하지 않아 프로그램을 기동할 수 없습니다.${C_RESET}`);
        process.exit(1);
    }
}

async function callGeminiApi(apiKey, systemInstruction, userPrompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const fullPrompt = `${systemInstruction}\n\n[USER COMMAND]\n${userPrompt}`;
    
    const payload = {
        contents: [{
            parts: [{
                text: fullPrompt
            }]
        }],
        generationConfig: {
            temperature: 0.1,
            responseMimeType: "text/plain"
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
        console.error(`${C_RED} -> [API 오류] Gemini 통신 실패: ${e.message}${C_RESET}`);
        return null;
    }
}

function runLocalServer() {
    console.log(`\n${C_CYAN}[서버] 로컬 개발 서버(http://localhost:5000/leitner_app.html)를 가동합니다...{C_RESET}`);
    try {
        // Run node-based static server or simple python server
        exec("start cmd.exe /c \"title AgriLeitner Local Server && npx http-server -p 5000\"", (err) => {
            if (error) {
                // fallback to python
                exec("start cmd.exe /c \"title AgriLeitner Local Server && python -m http.server 5000\"");
            }
        });
        console.log(`${C_GREEN} -> 서버 기동 완료! 자동으로 브라우저 주소를 띄웁니다.${C_RESET}`);
        setTimeout(() => {
            if (process.platform === 'win32') {
                exec("start http://localhost:5000/leitner_app.html");
            }
        }, 1000);
    } catch (e) {
        console.error(`${C_RED} -> [서버 오류] 기동 실패: ${e.message}${C_RESET}`);
    }
}

function runGithubSync(msg) {
    console.log(`\n${C_CYAN}[GitOps] 수정 사항을 로컬 및 GitHub 원격 저장소에 업로드합니다...{C_RESET}`);
    try {
        execSync(`node git_sync.js "AI_Center" "${msg}"`, { stdio: 'inherit' });
    } catch (e) {
        console.error(`${C_RED} -> [GitOps 오류] 동기화 실패: ${e.message}${C_RESET}`);
    }
}

async function handleCodeModification(apiKey) {
    console.log(`\n${C_CYAN}=== 🤖 AI 단어 학습 앱 실시간 코드 자동 편집기 ===${C_RESET}`);
    console.log("원하시는 수정 사항을 편하게 자연어로 설명해 주십시오.");
    console.log("예: \"메인 화면의 단어 박스 모서리를 좀 더 둥글게 해줘\", \"학습하기 완료 후 축하 이펙트 추가해줘\"");
    
    const instruction = await askQuestion(`\n💬 ${C_BOLD}명령 입력 (취소: 엔터 빈칸)${C_RESET}: `);
    
    if (!instruction) {
        console.log(" -> 작업을 취소했습니다.");
        return;
    }
        
    if (!fs.existsSync(APP_FILE)) {
        console.log(`${C_RED}[오류] 수정을 진행할 대상 파일 '${APP_FILE}'이 존재하지 않습니다.${C_RESET}`);
        return;
    }

    console.log(`\n[1/3] 현재 소스코드 파일(${APP_FILE})을 읽어 분석하는 중...`);
    const currentCode = fs.readFileSync(APP_FILE, 'utf8');

    console.log("[2/3] Gemini 초거대 AI에게 코드 편집 연산 요청 중 (약 5~15초 소요)...");
    
    const systemInstruction = (
        "You are an elite web application software architect and Senior React/Tailwind expert.\n"
        "Your task is to modify the provided single-file HTML application code based strictly on the user's instructions.\n\n"
        "RULES:\n"
        "1. Maintain all existing database structures (Supabase, variables, API keys, Google Pay, styles) perfectly.\n"
        "2. Add high-quality, professional, modern, and beautiful designs, scripts or features according to the request.\n"
        "3. Output the ENTIRE modified file code and ONLY the code. Do not wrap the output in markdown block symbols like ```html or ```, do not include any other conversational preamble or postamble. Your response must start with <!DOCTYPE html> and end with </html>."
    );
    
    const userPrompt = `[CURRENT FILE CONTENT]\n${currentCode}\n\n[USER INSTRUCTION]\n${instruction}`;
    
    const newCode = await callGeminiApi(apiKey, systemInstruction, userPrompt);
    
    if (!newCode) {
        console.log(`${C_RED}[실패] AI 코드 생성에 실패했습니다.${C_RESET}`);
        return;
    }
        
    // Clean up markdown code blocks if the model ignored the raw text instruction
    let newCodeClean = newCode.trim();
    if (newCodeClean.startsWith("```html")) {
        newCodeClean = newCodeClean.substring(7);
    } else if (newCodeClean.startsWith("```javascript") || newCodeClean.startsWith("```")) {
        newCodeClean = newCodeClean.substring(newCodeClean.indexOf("\n") + 1);
    }
        
    if (newCodeClean.endsWith("```")) {
        newCodeClean = newCodeClean.substring(0, newCodeClean.length - 3);
    }
    newCodeClean = newCodeClean.trim();

    if (!newCodeClean.startsWith("<!DOCTYPE html>") && !newCodeClean.startsWith("<html")) {
        console.log(`${C_RED}[경고] 생성된 코드가 올바른 HTML 포맷이 아닙니다. 안전을 위해 원본을 보호합니다.${C_RESET}`);
        console.log(`AI 응답 요약:\n${newCode.substring(0, 300)}...`);
        return;
    }

    // Create safety backup
    const backupFile = `${APP_FILE}.bak`;
    console.log(`[3/3] 원본 파일 백업 저장 완료 (${backupFile}) 및 새 소스코드 덮어쓰기 적용 중...`);
    fs.writeFileSync(backupFile, currentCode, 'utf8');
    fs.writeFileSync(APP_FILE, newCodeClean, 'utf8');
        
    console.log(`\n${C_GREEN}🎉 [대성공] AI가 사용자님의 지시대로 '${APP_FILE}' 코드를 완벽하게 자동 수정했습니다!{C_RESET}`);
    console.log(`          (로컬 개발 서버에서 즉시 변경 내용을 확인해 보십시오.)`);
    
    const gitChoice = await askQuestion(`\n📦 이 수정 사항을 GitHub에 즉시 백업/업로드할까요? (y/n): `);
    if (gitChoice.toLowerCase() === 'y') {
        runGithubSync(`AI Auto-Edit: ${instruction}`);
    }
}

function showDashboard() {
    console.log("\n" + "=" * 65);
    console.log(`  🍃 ${C_BOLD}{C_GREEN}AgriLeitner Pro - One-Stop AI Command Control Center (Node.js)${C_RESET}  `);
    console.log("=" * 65);
    console.log(" [1] 🤖 AI에게 자연어로 앱 기능/디자인 변경 명령하기");
    console.log(" [2] 💻 로컬 테스트 서버 켜고 브라우저로 앱 실행하기");
    console.log(" [3] 🐙 변경된 모든 사항 GitHub 원격 저장소에 동기화하기");
    console.log(" [4] 💾 수동 코드 원본 복원하기 (가장 최근 AI 자동 백업본 사용)");
    console.log(" [5] 🚪 프로그램 종료하기");
    console.log("=" * 65);
}

function restoreBackup() {
    const backupFile = `${APP_FILE}.bak`;
    if (fs.existsSync(backupFile)) {
        const bakCode = fs.readFileSync(backupFile, 'utf8');
        fs.writeFileSync(APP_FILE, bakCode, 'utf8');
        console.log(`\n${C_GREEN}[성공] 가장 최근 AI 작업 직전의 원본 백업본(${backupFile})으로 복구되었습니다!${C_RESET}`);
    } else {
        console.log(`\n${C_RED}[오류] 복구할 수 있는 백업 파일(${backupFile})이 존재하지 않습니다.${C_RESET}`);
    }
}

async function main() {
    // Set console title if windows
    if (process.platform === 'win32') {
        process.stdout.write('\x1b]2;AgriLeitner Pro AI Command Center\x07');
    }
        
    const apiKey = await loadOrRequestApiKey();
    
    while (true) {
        showDashboard();
        const choice = await askQuestion(`🎯 ${C_BOLD}실행할 작업 번호 선택 (1~5)${C_RESET}: `);
        
        if (choice === '1') {
            await handleCodeModification(apiKey);
        } else if (choice === '2') {
            runLocalServer();
        } else if (choice === '3') {
            const commitMsg = await askQuestion("\n📝 GitHub 커밋 메시지를 입력하세요 (예: 회원가입 로직 완료): ");
            if (commitMsg) {
                runGithubSync(commitMsg);
            } else {
                console.log(" -> 메시지 미입력으로 작업을 건너뜁니다.");
            }
        } else if (choice === '4') {
            restoreBackup();
        } else if (choice === '5') {
            console.log(`\n${C_YELLOW}👋 AgriLeitner AI 제어센터를 종료합니다. 수고하셨습니다!${C_RESET}\n`);
            process.exit(0);
        } else {
            console.log(`\n${C_RED}[알림] 잘못된 선택입니다. 1번부터 5번 사이의 숫자를 입력해 주십시오.${C_RESET}`);
        }
        
        await new Promise(r => setTimeout(r, 1000));
    }
}

main();
