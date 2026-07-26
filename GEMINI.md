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

## Multi-Agent Collaboration (Alpha & Beta)
To accelerate development, you can run multiple specialized Gemini CLI instances simultaneously. We have designed an automated orchestration system to manage this setup.

### 👥 Assigned Roles
- **Agent Alpha (Frontend & UI)**: Responsible for CSS, Tailwind, layouts, views, and frontend user experience in `leitner_app.html`.
- **Agent Beta (Backend & Logic)**: Responsible for Supabase database sync, triggers, authentication, APIs, and payment validation.

### 🔄 Real-time Communication Channel
- The agents write to and monitor **`COOP.md`** to share requirements, API schemas, and synchronize tasks.

### 🖥️ 1-Click Launch & Auto-Arrangement
- **`run_collaboration_team.bat`**: Double-click this script to automatically launch both 에이전트 Alpha and 에이전트 Beta CMD instances.
- **`run_collaboration.py`**: A Python script executed by the batch file that utilizes the Windows API (`ctypes`) to automatically snap and size the two command prompts side-by-side on your screen (50% left screen, 50% right screen) for an optimal multi-agent cockpit experience.

### 🐙 Git & GitHub GitOps Sync (`git_sync.py`)
Both agents can commit and push their collaborative work to your GitHub repository automatically using **`git_sync.py`**.
- **Agent Alpha Commit**: `python git_sync.py Alpha "Commit message"`
- **Agent Beta Commit**: `python git_sync.py Beta "Commit message"`
- *Workflow*:
  1. The script auto-initializes git if needed.
  2. Stages all changes (`git add .`).
  3. Commits with a custom agent tag (e.g., `[Alpha] Added User Profile View`).
  4. Safely performs `git pull --rebase` from your remote GitHub origin to prevent merge conflicts.
  5. Pushes your synced workspace directly to `origin main`!
- *Setup*: Add your GitHub repository as origin:
  `git remote add origin https://github.com/your-username/your-repo-name.git`
