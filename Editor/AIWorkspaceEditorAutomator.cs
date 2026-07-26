#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using UnityEditor.Animations;
using AgriLeitner.AI;

namespace AgriLeitner.AI.Editor
{
    /// <summary>
    /// Unity Editor Script to automate the entire Phase 2 Animator & Character setup.
    /// This script allows Gemini CLI to do the Unity editor clicking work for you!
    /// Place this file in your Assets/Editor/ folder.
    /// </summary>
    public class AIWorkspaceEditorAutomator : MonoBehaviour
    {
        [MenuItem("Tools/AI Workspace/Automate Phase 2 (Animator & Character)")]
        public static void AutomatePhase2()
        {
            // 1. Find or create AI_Manager in the active scene
            GameObject aiManagerObj = GameObject.Find("AI_Manager");
            if (aiManagerObj == null)
            {
                aiManagerObj = new GameObject("AI_Manager");
                Undo.RegisterCreatedObjectUndo(aiManagerObj, "Create AI_Manager");
                Debug.Log("[AI Automation] Created 'AI_Manager' GameObject.");
            }

            AIWorkspaceManager manager = aiManagerObj.GetComponent<AIWorkspaceManager>();
            if (manager == null)
            {
                manager = aiManagerObj.AddComponent<AIWorkspaceManager>();
                Debug.Log("[AI Automation] Attached 'AIWorkspaceManager' component.");
            }

            // 2. Create/Overwrite Animator Controller at Assets/AI_Agent_Animator.controller
            string controllerPath = "Assets/AI_Agent_Animator.controller";
            AnimatorController controller = AnimatorController.CreateAnimatorControllerAtPath(controllerPath);
            if (controller == null)
            {
                Debug.LogError("[AI Automation] Failed to create Animator Controller at " + controllerPath);
                return;
            }
            Debug.Log("[AI Automation] Animator Controller Created/Overwritten at: " + controllerPath);

            // Add Parameters
            controller.AddParameter("isThinking", AnimatorControllerParameterType.Bool);
            controller.AddParameter("isTyping", AnimatorControllerParameterType.Bool);
            controller.AddParameter("isCheering", AnimatorControllerParameterType.Bool);
            controller.AddParameter("isSad", AnimatorControllerParameterType.Bool);

            // Get root state machine
            AnimatorStateMachine rootStateMachine = controller.layers[0].stateMachine;

            // Add States
            AnimatorState idleState = rootStateMachine.AddState("Idle");
            AnimatorState thinkingState = rootStateMachine.AddState("Thinking");
            AnimatorState typingState = rootStateMachine.AddState("Typing");
            AnimatorState cheerState = rootStateMachine.AddState("Cheer");
            AnimatorState sadState = rootStateMachine.AddState("Sad");

            // Set Idle as default state
            rootStateMachine.defaultState = idleState;

            // Create transitions from Any State
            // Any State -> Thinking (isThinking == true)
            AnimatorStateTransition thinkingTransition = rootStateMachine.AddAnyStateTransition(thinkingState);
            thinkingTransition.AddCondition(AnimatorConditionMode.If, 0, "isThinking");
            thinkingTransition.duration = 0.15f;
            thinkingTransition.canTransitionToSelf = false;

            // Any State -> Typing (isTyping == true)
            AnimatorStateTransition typingTransition = rootStateMachine.AddAnyStateTransition(typingState);
            typingTransition.AddCondition(AnimatorConditionMode.If, 0, "isTyping");
            typingTransition.duration = 0.15f;
            typingTransition.canTransitionToSelf = false;

            // Any State -> Cheer (isCheering == true)
            AnimatorStateTransition cheerTransition = rootStateMachine.AddAnyStateTransition(cheerState);
            cheerTransition.AddCondition(AnimatorConditionMode.If, 0, "isCheering");
            cheerTransition.duration = 0.15f;
            cheerTransition.canTransitionToSelf = false;

            // Any State -> Sad (isSad == true)
            AnimatorStateTransition sadTransition = rootStateMachine.AddAnyStateTransition(sadState);
            sadTransition.AddCondition(AnimatorConditionMode.If, 0, "isSad");
            sadTransition.duration = 0.15f;
            sadTransition.canTransitionToSelf = false;

            // Any State -> Idle (isThinking == false && isTyping == false && isCheering == false && isSad == false)
            AnimatorStateTransition idleTransition = rootStateMachine.AddAnyStateTransition(idleState);
            idleTransition.AddCondition(AnimatorConditionMode.IfNot, 0, "isThinking");
            idleTransition.AddCondition(AnimatorConditionMode.IfNot, 0, "isTyping");
            idleTransition.AddCondition(AnimatorConditionMode.IfNot, 0, "isCheering");
            idleTransition.AddCondition(AnimatorConditionMode.IfNot, 0, "isSad");
            idleTransition.duration = 0.15f;
            idleTransition.canTransitionToSelf = false;

            // 3. Find or Create a 3D Character Placeholder (Capsule) in the scene
            GameObject agentObj = GameObject.Find("AI_Agent_Character");
            if (agentObj == null)
            {
                agentObj = GameObject.CreatePrimitive(PrimitiveType.Capsule);
                agentObj.name = "AI_Agent_Character";
                agentObj.transform.position = new Vector3(0, 1.0f, 0); // Position at center
                Undo.RegisterCreatedObjectUndo(agentObj, "Create AI_Agent_Character");
                Debug.Log("[AI Automation] Created 'AI_Agent_Character' 3D Capsule Placeholder in the scene.");
            }

            Animator animator = agentObj.GetComponent<Animator>();
            if (animator == null)
            {
                animator = agentObj.AddComponent<Animator>();
            }
            animator.runtimeAnimatorController = controller;

            // Bind the character's Animator to the AI Workspace Manager
            manager.agentCharacterAnimator = animator;
            EditorUtility.SetDirty(manager);

            // Mark current scene dirty so change can be saved
            UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(UnityEngine.SceneManagement.SceneManager.GetActiveScene());

            EditorUtility.DisplayDialog("AI Automation Success", 
                "Phase 2 Animator & Character Setup Completed Automatically! 🎉\n\n" +
                "1. 'AI_Manager' GameObject updated.\n" +
                "2. 'AI_Agent_Animator' controller created at Assets/\n" +
                "3. 'AI_Agent_Character' 3D Capsule placed in the scene.\n" +
                "4. All Animator states (Thinking, Typing, Cheer, Sad, Idle) & Bool conditions mapped perfectly.\n" +
                "5. Character attached to AIWorkspaceManager automatically.\n\n" +
                "Now, you can replace the capsule with any 3D model, and assign actual animation clips to the states in the Animator window whenever you like!", 
                "Awesome!");
        }
    }
}
#endif
