import os
import sys
import time
import subprocess

# Title for the command prompts
TITLE_ALPHA = "AgriLeitner - Agent Alpha (Frontend)"
TITLE_BETA = "AgriLeitner - Agent Beta (Backend)"

def launch_and_arrange():
    print("=" * 70)
    print("  🍃 AgriLeitner Pro - Dual Agent Parallel Team Orchestrator  ")
    print("=" * 70)
    print("\n[시스템] 두 개의 Gemini CLI 개발자 에이전트를 가동합니다...")
    
    # Launch Agent Alpha (Frontend)
    # /k keeps the window open, title sets the window title, gemini starts the CLI
    cmd_alpha = f'start cmd.exe /k "title {TITLE_ALPHA} && gemini"'
    subprocess.Popen(cmd_alpha, shell=True)
    print(" -> 에이전트 Alpha(프론트엔드) 가동 완료")
    time.sleep(1.2)  # Wait for window to spawn
    
    # Launch Agent Beta (Backend)
    cmd_beta = f'start cmd.exe /k "title {TITLE_BETA} && gemini"'
    subprocess.Popen(cmd_beta, shell=True)
    print(" -> 에이전트 Beta(백엔드) 가동 완료")
    time.sleep(1.2)  # Wait for window to spawn

    if sys.platform == 'win32':
        try:
            import ctypes
            user32 = ctypes.windll.user32
            
            # Get screen width and height (excluding taskbar space if possible, or just screen bounds)
            screen_w = user32.GetSystemMetrics(0) # SM_CXSCREEN
            screen_h = user32.GetSystemMetrics(1) # SM_CYSCREEN
            
            # Position calculations: Left half and Right half
            w = screen_w // 2
            h = int(screen_h * 0.9) # 90% of screen height to leave taskbar visible
            
            # Move Alpha to Left Half and Beta to Right Half
            alpha_found = False
            beta_found = False
            
            print("\n[시스템] 화면 분할 정렬을 최적화하는 중...")
            for _ in range(8): # Retry a few times in case windows are slow to initialize
                if not alpha_found:
                    hwnd_alpha = user32.FindWindowW(None, TITLE_ALPHA)
                    if hwnd_alpha:
                        # Move to left half (0, 0)
                        user32.MoveWindow(hwnd_alpha, 0, 0, w, h, True)
                        alpha_found = True
                if not beta_found:
                    hwnd_beta = user32.FindWindowW(None, TITLE_BETA)
                    if hwnd_beta:
                        # Move to right half (w, 0)
                        user32.MoveWindow(hwnd_beta, w, 0, w, h, True)
                        beta_found = True
                if alpha_found and beta_found:
                    break
                time.sleep(0.4)
                
            if alpha_found and beta_found:
                print("[성공] 화면 좌/우 50% 분할 배치가 완벽하게 정렬되었습니다! 🖥️")
            else:
                print("[안내] 에이전트 창들이 성공적으로 기동되었습니다. 수동으로 창 위치를 편하신 곳에 정렬해 주세요.")
        except Exception as e:
            print(f"[안내] 창 정렬 처리 중 일부 제약이 있었습니다: {e}")
            
    print("\n[가이드] 1번 창(왼쪽)에서 '1. Agent Alpha (Frontend)'를 선택하고,")
    print("         2번 창(오른쪽)에서 '2. Agent Beta (Backend/Data)'를 선택하세요.")
    print("         실시간 협업 메신저 로그는 'COOP.md' 파일을 통해 두 AI가 자동 연계해 나갑니다.")
    print("\n이 오케스트레이터 관리 제어창을 종료하려면 엔터키를 누르세요...")
    input()

if __name__ == "__main__":
    launch_and_arrange()
