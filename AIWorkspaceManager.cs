using System;
using System.Text;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace AgriLeitner.AI
{
    /// <summary>
    /// Unity 3D UI & Character controller that connects to the Node.js AI Agent Brain.
    /// Place this script on an Empty GameObject (e.g., "AI_Workspace_Manager") in your Unity Scene.
    /// </summary>
    public class AIWorkspaceManager : MonoBehaviour
    {
        [Header("Network Configurations")]
        [Tooltip("The local address of the Node.js agent backend server.")]
        [SerializeField] private string serverUrl = "http://localhost:5001";
        
        [Tooltip("How often (in seconds) Unity polls the AI agent's status.")]
        [SerializeField] private float pollInterval = 1.0f;

        [Header("State Output (For debugging / binding to 3D UI Text)")]
        public string agentStatus = "IDLE";
        public string agentThought = "Node.js 서버 연결을 대기 중...";
        public string agentAction = "None";
        public string agentObservation = "None";
        public string currentGoal = "None";
        public int currentStep = 0;

        [Header("3D Unity Interactions & Animations")]
        [Tooltip("If you have an AI programmer character (e.g., Robot, Avatar), assign its Animator here.")]
        [SerializeField] private Animator agentCharacterAnimator;

        // Coroutines trackers
        private Coroutine pollCoroutine;

        private void Start()
        {
            Debug.Log("[AI Workspace] Unity AI Workspace Manager 가동 중...");
            // Start polling the server on startup to verify connection
            StartPolling();
        }

        /// <summary>
        /// Sends a natural language command (Goal) to the Node.js agent backend.
        /// Call this method from your Unity 3D Input Fields or Buttons!
        /// </summary>
        public void SendAgentCommand(string naturalLanguageCommand)
        {
            if (string.IsNullOrEmpty(naturalLanguageCommand)) return;
            StartCoroutine(PostCommandCoroutine(naturalLanguageCommand));
        }

        private IEnumerator PostCommandCoroutine(string cmdText)
        {
            string url = serverUrl + "/api/command";
            
            // Create JSON Payload
            string jsonPayload = $"{{\"command\": \"{cmdText}\"}}";
            byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonPayload);

            UnityWebRequest request = new UnityWebRequest(url, "POST");
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");

            Debug.Log($"[AI Workspace] 명령 전송 중: {cmdText}");
            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.ConnectionError || request.result == UnityWebRequest.Result.ProtocolError)
            {
                Debug.LogError($"[AI Workspace] 명령 전송 실패: {request.error}");
                agentThought = "서버 전송 실패 - Node.js 서버가 실행 중인지 확인하십시오.";
            }
            else
            {
                Debug.Log("[AI Workspace] 에이전트 루프가 가동되었습니다!");
                // Instantly trigger polling to catch the status transition
                PollStatusOnce();
            }
        }

        public void StartPolling()
        {
            if (pollCoroutine != null) StopCoroutine(pollCoroutine);
            pollCoroutine = StartCoroutine(PollStatusLoopCoroutine());
        }

        public void StopPolling()
        {
            if (pollCoroutine != null)
            {
                StopCoroutine(pollCoroutine);
                pollCoroutine = null;
            }
        }

        private IEnumerator PollStatusLoopCoroutine()
        {
            while (true)
            {
                yield return StartCoroutine(GetStatusCoroutine());
                yield return new WaitForSeconds(pollInterval);
            }
        }

        private void PollStatusOnce()
        {
            StartCoroutine(GetStatusCoroutine());
        }

        private IEnumerator GetStatusCoroutine()
        {
            string url = serverUrl + "/api/status";
            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.ConnectionError || request.result == UnityWebRequest.Result.ProtocolError)
                {
                    agentStatus = "OFFLINE";
                    agentThought = "백엔드 서버 오프라인 상태 (서버를 실행해 주십시오).";
                    TriggerAnimationState("Idle");
                }
                else
                {
                    string jsonResult = request.downloadHandler.text;
                    ParseServerStatus(jsonResult);
                }
            }
        }

        private void ParseServerStatus(string json)
        {
            try
            {
                // Lightweight manual JSON parser to avoid importing external JSON.NET packages in Unity
                ServerStateData state = JsonUtility.FromJson<ServerStateData>(json);

                agentStatus = state.status;
                agentThought = state.thought;
                agentAction = state.currentAction;
                agentObservation = state.observation;
                currentGoal = state.goal;
                currentStep = state.step;

                // Sync 3D Character Animations based on AI Agent's real-time state!
                HandleCharacterAnimations();
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[AI Workspace] JSON Parsing error: {e.Message}");
            }
        }

        private void HandleCharacterAnimations()
        {
            if (agentCharacterAnimator == null) return;

            // Trigger Unity 3D character animations based on AI state
            switch (agentStatus)
            {
                case "THINKING":
                    // Trigger "scratch_head", "ponder" or "think" animation
                    TriggerAnimationState("Thinking");
                    break;
                case "EXECUTING":
                    // Trigger "typing" or "coding" animation
                    TriggerAnimationState("Typing");
                    break;
                case "SUCCESS":
                    // Trigger "cheer", "jump" or "celebrate" animation
                    TriggerAnimationState("Cheer");
                    break;
                case "ERROR":
                    // Trigger "facepalm", "sad" or "shrug" animation
                    TriggerAnimationState("Sad");
                    break;
                default:
                    // Trigger standard "idle" breathing animation
                    TriggerAnimationState("Idle");
                    break;
            }
        }

        private void TriggerAnimationState(string stateName)
        {
            if (agentCharacterAnimator == null) return;
            
            // Set Unity Animator Controller parameters (e.g. integer or trigger states)
            // Example resets other booleans and sets the active state
            agentCharacterAnimator.SetBool("isThinking", stateName == "Thinking");
            agentCharacterAnimator.SetBool("isTyping", stateName == "Typing");
            agentCharacterAnimator.SetBool("isCheering", stateName == "Cheer");
            agentCharacterAnimator.SetBool("isSad", stateName == "Sad");
        }

        // Serialized class matching the Node.js server JSON contract
        [System.Serializable]
        private class ServerStateData
        {
            public string status;
            public string thought;
            public string currentAction;
            public string observation;
            public string goal;
            public int step;
            public int maxSteps;
        }
    }
}
