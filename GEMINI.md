# AgriLeitner Pro SaaS - Project Instructions

This project is a single-file SaaS web application called **AgriLeitner Pro SaaS** located at `C:\Users\유일복\Desktop\word_app\leitner_app.html`. It is a vocabulary trainer based on the Leitner system for high-difficulty agricultural/engineering terminology.

## Core Tech Stack
- **Frontend**: React (v18), Tailwind CSS, Babel (running in-browser via CDNs for zero-install execution).
- **Backend**: Supabase (used for Authentication and cloud Database persistence).
- **Database Tables**:
  - `public.agri_profiles`: Handles billing tiers ('Free', 'Pro') and AI generation counts.
  - `public.agri_cards`: Stores user-specific flashcards.

## API Configurations
- **Supabase URL**: `https://cfimyvvecsoqeicsjezo.supabase.co`
- **Supabase Anon Key**: `[REDACTED_SECURELY] (Refer to private project memory .gemini/tmp/project/memory/MEMORY.md)`
- **Google OAuth Client ID**: `[REDACTED_SECURELY] (Refer to private project memory .gemini/tmp/project/memory/MEMORY.md)`
- **Google OAuth Client Secret**: `[REDACTED_SECURELY] (Refer to private project memory .gemini/tmp/project/memory/MEMORY.md)`
- **Google OAuth Redirect URI**: `https://cfimyvvecsoqeicsjezo.supabase.co/auth/v1/callback`

## 🎛️ One-Stop AI Command Control Center (`command_center.py`)
To make development completely frictionless, we have built a **Unified AI Command Control Center** program. Instead of managing multiple separate agents or terminal windows, you can control the entire project from a single, interactive CLI cockpit.

### 🌟 Core Capabilities
1. **🤖 Natural Language AI Code Editor**: Type any feature request or design modification in plain Korean (e.g., *"구글페이 결제 완료 성공 모달창 더 이쁘게 다듬어줘"*). The console directly communicates with the Gemini 1.5 Flash API, surgically rewrites `leitner_app.html`, creates an automatic safety backup, and saves the file!
2. **💻 Integrated Local Server**: Launch the background local test server (`http://localhost:5000`) and automatically open the app in your default browser with a single press of a button.
3. **🐙 Automated GitOps GitHub Sync**: Instantly stage, commit, and push your entire codebase directly to your GitHub repository.
4. **💾 Safety Rollback**: Did the AI write something you want to undo? Instantly restore the previous version of your code from the automatically generated `.bak` safety file.

### 🎮 How to Launch
1. Double-click **`Run_Command_Center.bat`** in your project directory.
2. Enter your Gemini API Key on first launch (saved locally to `gemini_key.txt`).
3. Speak, test, and sync your application to GitHub with absolute zero friction!
