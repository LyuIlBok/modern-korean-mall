# 🎓 AgriLeitner Pro: AI Collaboration Tool Development Curriculum

This curriculum outlines the step-by-step roadmap to build, polish, and deploy your Unity-based AI Collaboration Cockpit. 
You will use **Unity** for the visual frontend dashboard, **Node.js** as the local agent server, and **Gemini CLI (me) + Google Gems (your partner)** as your co-developers.

---

## 📅 Phase 1: Project Scaffolding & Network Core (유니티 뼈대 및 통신 연동)
*Goal: Initialize the Unity project and verify that the 3D client can communicate with the Node.js agent backend in real-time.*

1. **Unity Project Setup**:
   - Open Unity Hub, click **`새 프로젝트`**, select the **`3D Core`** template, and name it `AgriLeitner_MetaSpace`.
   - Save the project inside `D:\Unity\Projects\` (to save C: drive space).
2. **Import Network Controller**:
   - Drag and drop **`AIWorkspaceManager.cs`** from your desktop `word_app` folder into the Unity `Assets/Scripts/` directory.
3. **Verify API Communication**:
   - Launch the Node.js backend using **`Run_Unity_Backend.bat`**.
   - Create an empty GameObject named `AI_Manager` in your Unity scene, and attach the `AIWorkspaceManager` script to it.
   - Run the Unity Scene in Play Mode. Check the Unity Console to verify that it logs status updates (e.g., `Status Polled: IDLE`) successfully from `http://localhost:5001`.

---

## 📅 Phase 2: Visualizing the Agent (에이전트 시각화 및 UI 설계)
*Goal: Create a clean, cyberpunk-themed 3D UI display in Unity that dynamically reflects the AI's thoughts and actions.*

1. **Design the UI Canvas**:
   - Create a Unity World Space Canvas. Place it in your 3D office scene (e.g., as a giant floating computer screen).
   - Add UI Text components for:
     - **Goal**: The active task.
     - **Thought**: What the AI is thinking (bubble text).
     - **Status/Action**: Current executing tool (`read_file`, `write_file`, etc.).
2. **Bind C# Script to UI**:
   - Ask **Google Gems** to modify `AIWorkspaceManager.cs` (or ask me) to bind the text variables directly to your Unity UI Text components.
3. **Trigger Animation Transitions (Optional)**:
   - Import a simple character model (e.g., a cute robot or farmer model).
   - Set up Animator states (`Pondering`, `Typing`, `Celebration`).
   - The C# script will automatically flip the animator parameters (`isThinking`, `isTyping`) based on the Node.js status polled!

---

## 📅 Phase 3: File Explorer & Live Code Inspector (프로젝트 파일 가시화)
*Goal: Allow the user to view all project files in a 3D list and inspect/preview code directly inside Unity.*

1. **Create File List UI**:
   - Add a ScrollView UI in Unity for the "Project Files Explorer".
2. **Fetch Files List via REST API**:
   - Unity C# calls `GET http://localhost:5001/api/files` to retrieve the active workspace files.
   - For each file returned, instantiate a UI Button in the ScrollView.
3. **Inspect File Content**:
   - When a button is clicked, Unity calls `GET http://localhost:5001/api/file_content?path=filename`.
   - Display the returned code text inside a large Unity Scrollable Text Area, creating a gorgeous in-game code editor preview!

---

## 📅 Phase 4: Multi-Agent Synergy & One-Click Deploy (멀티 에이전트 연동 및 배포)
*Goal: Integrate Git/GitHub commands and prepare the app for WebGL, PC Standalone, and Mobile deployment.*

1. **Integrated Controls Panel**:
   - Add interactive 3D buttons in your scene for:
     - **Run Server**: Calls `POST http://localhost:5001/api/run_server` to launch the test web app.
     - **Git Sync**: Calls `POST http://localhost:5001/api/git_sync` to automatically commit and push to your GitHub.
     - **Restore**: Calls `POST http://localhost:5001/api/restore` to safely roll back changes.
2. **Publishing (WebGL Build)**:
   - Go to Unity **Build Settings**, switch the platform to **WebGL**, and click **Build**.
   - Place the compiled WebGL folder into the Node.js server directories so you can load your 3D Unity interface directly inside Chrome at `http://localhost:5001`!
