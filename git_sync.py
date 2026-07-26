import os
import sys
import subprocess

def run_cmd(args):
    try:
        res = subprocess.run(args, capture_output=True, text=True, shell=True, check=True)
        return res.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f" -> [Git 오류] {e.stderr.strip()}")
        return None

def main():
    if len(sys.argv) < 3:
        print("사용법: python git_sync.py [Alpha|Beta] \"커밋 메시지\"")
        sys.exit(1)
        
    agent = sys.argv[1]
    msg = sys.argv[2]
    
    print("=" * 60)
    print(f" 🐙 [{agent}] GitHub 실시간 원격 동기화 엔진 가동")
    print("=" * 60)
    
    # 1. Initialize Git if not exists
    if not os.path.exists(".git"):
        print("[시스템] 로컬 Git 저장소가 없습니다. 초기화(git init)를 실행합니다...")
        run_cmd("git init")
        run_cmd("git branch -M main")
        print(" -> 로컬 Git 저장소 초기화 완료 (기본 브랜치: main)")

    # 2. Check if remote origin is set
    remote_check = run_cmd("git remote -v")
    if not remote_check or "origin" not in remote_check:
        print("\n[안내] 아직 GitHub 원격 저장소(origin)가 연결되어 있지 않습니다.")
        print("       원격 저장소를 연결하려면 아래 명령어를 입력하십시오:")
        print("       ==> git remote add origin [사용자님의_깃허브_리포지토리_주소]")
        print("       (원격 저장소가 연결되기 전까지는 로컬 커밋만 수행됩니다.)\n")
        has_remote = False
    else:
        has_remote = True

    # 3. Add files to stage
    print("[시스템] 변경된 모든 파일 스테이징 중 (git add .)...")
    run_cmd("git add .")
    
    # 4. Commit changes with agent signature
    full_commit_msg = f"[{agent}] {msg}"
    print(f"[시스템] 로컬 커밋 작성 중: \"{full_commit_msg}\"")
    commit_res = run_cmd(f'git commit -m "{full_commit_msg}"')
    if commit_res:
        print(" -> 로컬 커밋 성공!")
    else:
        print(" -> [안내] 새롭게 변경된 파일 내용이 없어 커밋을 건너뜁니다.")

    # 5. Remote Sync (Pull & Push)
    if has_remote:
        print("\n[시스템] 원격 저장소와 동기화 중 (Pull & Push)...")
        # Pull first to prevent merge conflicts
        print(" -> 최신 원격 변경사항 가져오는 중 (git pull --rebase)...")
        run_cmd("git pull --rebase origin main")
        
        # Push to remote main
        print(" -> 원격 저장소에 코드 업로드 중 (git push origin main)...")
        push_res = run_cmd("git push origin main")
        if push_res is not None:
            print("\n🎉 [성공] GitHub 원격 저장소에 모든 협업 코드가 완벽하게 업로드되었습니다!")
        else:
            print("\n❌ [오류] 원격 Push에 실패했습니다. GitHub 토큰/인증 세팅을 확인하십시오.")
    else:
        print("\n🎉 [로컬 완료] GitHub 연결이 없어 로컬 Git에 커밋 저장을 마쳤습니다.")
        
    print("=" * 60)

if __name__ == "__main__":
    main()
