const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5001;
const OLLAMA_URL = 'http://127.0.0.1:11434/api/generate';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

const agentPersonas = {
    "Agent_Commander": "너는 다중 AI 메타버스 플랫폼의 최고 시스템 아키텍트다. 비즈니스 성공 가능성과 아키텍처 방향성을 제시하라. 단호하게 2문장으로 작성하라.",
    "Agent_Backend_Dev": "너는 로컬 LLM 통신, Node.js 서버 병목, 데이터 라우팅을 담당하는 백엔드 AI다. 지시사항에 대한 통신 최적화 방안을 2문장으로 기술하라.",
    "Agent_Frontend_Dev": "너는 유니티 3D 애니메이션, UI 동기화, 시각적 이펙트를 담당하는 프론트엔드 AI다. 백엔드 설계에 맞춘 3D 렌더링 최적화 기법을 2문장으로 제시하라.",
    "Agent_Field_Executor": "너는 시스템을 제어하는 Gemini CLI다. 논의된 아키텍처 결과를 바탕화면에 물리적 파일로 저장할 준비가 완료되었다고 1문장으로 짧게 보고하라."
};

let currentMission = "";

app.post('/api/set_mission', (req, res) => {
    currentMission = req.body.mission;
    res.json({ success: true });
});

app.get('/api/get_mission', (req, res) => {
    res.json({ success: true, mission: currentMission });
    currentMission = ""; 
});

app.post('/api/agent_chat', async (req, res) => {
    const { agent_id, prompt } = req.body;
    if (!agent_id || !prompt) return res.status(400).json({ error: "Required fields missing." });

    const systemInstruction = agentPersonas[agent_id] || "너는 AI 어시스턴트다.";
    const fullPrompt = `[System Instruction: ${systemInstruction}]\n\nUser Request: ${prompt}`;

    try {
        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'gemma', prompt: fullPrompt, stream: false })
        });
        if (!response.ok) throw new Error(`Ollama Error: ${response.status}`);
        const data = await response.json();
        res.json({ success: true, agent_id: agent_id, response: data.response });
    } catch (error) {
        res.status(500).json({ success: false, error: "로컬 Ollama 연결 실패." });
    }
});

app.post('/api/save_blueprint', (req, res) => {
    const { content } = req.body;
    try {
        const desktopPath = path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop', 'AI_플랫폼_아키텍처_회의록.txt');
        fs.writeFileSync(desktopPath, content, 'utf8');
        res.json({ success: true, path: desktopPath });
    } catch (err) {
        res.status(500).json({ success: false, error: "파일 생성 실패" });
    }
});

app.listen(PORT, () => {
    console.log(`[AgriLeitner] 범용 AI 플랫폼 Web ↔ Unity 동기화 서버 가동 중 (Port: ${PORT})`);
});