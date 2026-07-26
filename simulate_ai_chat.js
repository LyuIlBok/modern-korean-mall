const http = require('http');

const messages = [
    { agent_id: 'Commander', role: 'system', content: '보키네 농장 궤도형 살포기 블루프린트 분석을 시작하라.' },
    { agent_id: 'Custom_Llama', role: 'worker', content: '데이터 수신 완료. 수동 노동력을 최소화할 살포기 구조 분석 중.' },
    { agent_id: 'Commander', role: 'system', content: '홍고추 생육에 필요한 최적 살포 각도 계산이 필요하다.' },
    { agent_id: 'Custom_Llama', role: 'worker', content: '살포 각도 45도, 압력 1.5 bar가 가장 효율적임을 시뮬레이션함.' }
];

let currentIndex = 0;

function sendPostRequest(message) {
    const data = JSON.stringify(message);
    const options = {
        hostname: 'localhost',
        port: 5001,
        path: '/api/collaboration/messages',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = http.request(options, (res) => {
        console.log(`[Sent] ${message.agent_id}: ${message.content}`);
    });

    req.on('error', (error) => {
        console.error('Error connecting to broker:', error.message);
    });

    req.write(data);
    req.end();
}

setInterval(() => {
    if (currentIndex < messages.length) {
        sendPostRequest(messages[currentIndex]);
        currentIndex++;
    } else {
        console.log("시뮬레이션 메시지 전송 완료.");
        process.exit();
    }
}, 3000); // 3초마다 메시지 발송
