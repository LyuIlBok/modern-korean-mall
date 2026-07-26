const fs = require('fs');
const { execSync } = require('child_process');

function runCmd(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf8' }).trim();
    } catch (e) {
        console.error(` -> [Git 오류] ${e.stderr ? e.stderr.trim() : e.message}`);
        return null;
    }
}

function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log("사용법: node git_sync.js [Alpha|Beta|AI_Center] \"커밋 메시지\"");
        process.exit(1);
    }
    
    const agent = args[0];
    const msg = args[1];
    
    console.log("=" * 60);
    console.log(` 🐙 [${agent}] GitHub 실시간 원격 동기화 엔진 가동 (Node.js)`);
    console.log("=" * 60);
    
    // 1. Initialize Git if not exists
    if (!fs.existsSync(".git")) {
        console.log("[시스템] 로컬 Git 저장소가 없습니다. 초기화(git init)를 실행합니다...");
        runCmd("git init");
        runCmd("git branch -M main");
        console.log(" -> 로컬 Git 저장소 초기화 완료 (기본 브랜치: main)");
    }

    // 2. Check if remote origin is set
    const remoteCheck = runCmd("git remote -v") || "";
    let hasRemote = false;
    if (!remoteCheck || !remoteCheck.includes("origin")) {
        console.log("\n[안내] 아직 GitHub 원격 저장소(origin)가 연결되어 있지 않습니다.");
        console.log("       원격 저장소를 연결하려면 아래 명령어를 입력하십시오:");
        console.log("       ==> git remote add origin [사용자님의_깃허브_리포지토리_주소]");
        console.log("       (원격 저장소가 연결되기 전까지는 로컬 커밋만 수행됩니다.)\n");
    } else {
        hasRemote = true;
    }

    // 3. Add files to stage
    console.log("[시스템] 변경된 모든 파일 스테이징 중 (git add .)...");
    runCmd("git add .");
    
    // 4. Commit changes with agent signature
    const fullCommitMsg = `[${agent}] ${msg}`;
    console.log(`[시스템] 로컬 커밋 작성 중: "${fullCommitMsg}"`);
    const commitRes = runCmd(`git commit -m "${fullCommitMsg}"`);
    if (commitRes) {
        console.log(" -> 로컬 커밋 성공!");
    } else {
        console.log(" -> [안내] 새롭게 변경된 파일 내용이 없어 커밋을 건너뜁니다.");
    }

    // 5. Remote Sync (Pull & Push)
    if (hasRemote) {
        console.log("\n[시스템] 원격 저장소와 동기화 중 (Pull & Push)...");
        console.log(" -> 최신 원격 변경사항 가져오는 중 (git pull --rebase)...");
        runCmd("git pull --rebase origin main");
        
        console.log(" -> 원격 저장소에 코드 업로드 중 (git push origin main)...");
        const pushRes = runCmd("git push origin main");
        if (pushRes !== null) {
            console.log("\n🎉 [성공] GitHub 원격 저장소에 모든 협업 코드가 완벽하게 업로드되었습니다!");
        } else {
            console.log("\n❌ [오류] 원격 Push에 실패했습니다. GitHub 토큰/인증 세팅을 확인하십시오.");
        }
    } else {
        console.log("\n🎉 [로컬 완료] GitHub 연결이 없어 로컬 Git에 커밋 저장을 마쳤습니다.");
    }
    
    console.log("=" * 60);
}

main();
