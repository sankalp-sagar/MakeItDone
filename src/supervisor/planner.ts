import { llm } from "../llm/client";

import {
  Capability,
} from "../capabilities/types";

import {
  Artifact,
  PlanStep,
  Observation,
} from "./state";

interface LLMPlanStep {
  id: string;

  title: string;

  capabilityId?: string;

  input?: Record<string, unknown>;
}

interface LLMPlan {
  reasoning: string;

  steps: LLMPlanStep[];
}

export type ReplanDecision =
  | "next_step"
  | "goal_complete"
  | "ask_user";

export interface ReplanResult {
  decision: ReplanDecision;

  nextStep?: PlanStep;

  question?: string;

  reasoning: string;
}

export class Planner {
  async createPlan(
    goal: string,
    capabilities: Capability[],
    artifacts: Artifact[] = []
  ): Promise<PlanStep[]> {
    const capabilityDescription =
      capabilities
        .map(
          (capability) =>
            `- ${capability.id}: ${capability.description} ` +
            `(category: ${capability.category}, ` +
            `risk: ${capability.risk}, ` +
            `requiresApproval: ${capability.requiresApproval})`
        )
        .join("\n");

    const artifactDescription =
      artifacts.length === 0
        ? "No user-provided artifacts are available."
        : artifacts
            .map(
              (artifact) =>
                `- ${artifact.name} ` +
                `(type: ${artifact.type}, ` +
                `path: ${artifact.path ?? "unknown"}, ` +
                `source: ${artifact.source})`
            )
            .join("\n");

    const systemPrompt = `
You are the planning brain of a general-purpose AI agent.

Your job is to create a plan for the user's goal.

DO NOT use any tool-call syntax.
DO NOT output <tool_call> tags.
DO NOT use function calling.
YOU ONLY OUTPUT RAW JSON.
NOTHING else. ONLY JSON.

USER GOAL:

${goal}

USER-PROVIDED ARTIFACTS:

${artifactDescription}

AVAILABLE CAPABILITIES:

${capabilityDescription}

PLANNING RULES:

1. Only use capabilities listed above.
2. Never invent capabilities.
3. User-provided artifacts are already available to the agent.
4. If a suitable user artifact exists, use it directly.
5. Do not inspect the filesystem merely to find an artifact that is already provided.
6. Do not invent missing information.
7. Use observation capabilities when information is genuinely missing.
8. Prefer small, useful steps.
9. Every capability step must include capabilityId.
10. Include required inputs.
11. Use artifact paths instead of binary file contents.
12. The plan must actually move toward the user's goal.
13. Do not claim an action has already been completed.
14. Do not declare the goal complete merely because an observation was performed.
15. Return ONLY valid JSON.
16. No markdown. No text. No tool calls.
17. Output exactly:

{
  "reasoning": "short explanation",
  "steps": [
    {
      "id": "1",
      "title": "human-readable description",
      "capabilityId": "capability_id",
      "input": {}
    }
  ]
}

START JSON RESPONSE NOW:
`;

    const userPrompt = `
Determine the best next executable step for this goal.

The user has already provided these artifacts:

${artifactDescription}

Do not search for an artifact that is already available.
`;

    const response =
      await llm.chat.completions.create({
        model: "openrouter/free",

        max_tokens: 1500,

        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      });

    const content =
      response.choices[0]?.message?.content;

    if (!content) {
      throw new Error(
        "LLM returned an empty planning response."
      );
    }

    const plan =
      this.parsePlan(content);

    this.validatePlan(
      plan,
      capabilities
    );

    return plan;
  }

  private parsePlan(
    content: string
  ): PlanStep[] {
    const json =
      this.extractJson(content);

    let parsed: LLMPlan;

    try {
      parsed =
        JSON.parse(json);
    } catch {
      throw new Error(
        `LLM returned invalid JSON:\n${content}`
      );
    }

    if (
      !parsed ||
      !Array.isArray(parsed.steps)
    ) {
      throw new Error(
        "LLM response does not contain a valid steps array."
      );
    }

    return parsed.steps.map(
      (step, index) => {
        if (
          typeof step.id !== "string"
        ) {
          throw new Error(
            `Planner step ${index + 1} has an invalid id.`
          );
        }

        if (
          typeof step.title !== "string"
        ) {
          throw new Error(
            `Planner step ${step.id} has an invalid title.`
          );
        }

        return {
          id: step.id,

          title: step.title,

          capabilityId:
            step.capabilityId,

          input:
            step.input,

          completed: false,
        };
      }
    );
  }

  private extractJson(
    content: string
  ): string {
    const cleaned =
      content.trim();

    if (
      cleaned.startsWith("{") &&
      cleaned.endsWith("}")
    ) {
      return cleaned;
    }

    const fencedMatch =
      cleaned.match(
        /```(?:json)?\s*([\s\S]*?)\s*```/i
      );

    if (fencedMatch?.[1]) {
      return fencedMatch[1].trim();
    }

    const firstBrace =
      cleaned.indexOf("{");

    const lastBrace =
      cleaned.lastIndexOf("}");

    if (
      firstBrace !== -1 &&
      lastBrace !== -1 &&
      lastBrace > firstBrace
    ) {
      return cleaned.slice(
        firstBrace,
        lastBrace + 1
      );
    }

    throw new Error(
      `Could not find JSON in LLM response:\n${content}`
    );
  }

  private validatePlan(
    plan: PlanStep[],
    capabilities: Capability[]
  ): void {
    const available =
      new Set(
        capabilities.map(
          (capability) =>
            capability.id
        )
      );

    for (const step of plan) {
      if (
        step.capabilityId &&
        !available.has(
          step.capabilityId
        )
      ) {
        throw new Error(
          `Planner selected unknown capability '${step.capabilityId}'.`
        );
      }
    }
  }

  /**
   * Replan based on observations from execution.
   * Adaptive loop: after each step execution, ask the LLM what to do next.
   */
  async replan(
    goal: string,
    capabilities: Capability[],
    artifacts: Artifact[],
    observations: Observation[],
    previousPlan: PlanStep[],
    completedSteps: string[]
  ): Promise<ReplanResult> {
    const capabilityDescription =
      capabilities
        .map(
          (capability) =>
            `- ${capability.id}: ${capability.description} ` +
            `(category: ${capability.category}, ` +
            `risk: ${capability.risk}, ` +
            `requiresApproval: ${capability.requiresApproval})`
        )
        .join("\n");

    const artifactDescription =
      artifacts.length === 0
        ? "No artifacts are available."
        : artifacts
            .map(
              (artifact) =>
                `- ${artifact.name} ` +
                `(type: ${artifact.type}, ` +
                `path: ${artifact.path ?? "unknown"}, ` +
                `source: ${artifact.source})`
            )
            .join("\n");

    const observationDescription =
      observations.length === 0
        ? "No observations yet."
        : observations
            .map(
              (obs) =>
                `[${obs.type}] ${obs.message}`
            )
            .join("\n");

    const completedStepsDescription =
      completedSteps.length === 0
        ? "No steps completed yet."
        : completedSteps
            .map(
              (stepId) => {
                const step =
                  previousPlan.find(
                    (s) =>
                      s.id === stepId
                  );
                return step
                  ? step.title
                  : `Step ${stepId}`;
              }
            )
            .join("\n");

    const systemPrompt = `
You are the adaptive planning brain of an AI agent.

You have already executed some steps. Now you must decide what to do next.

DO NOT use any tool-call syntax.
DO NOT output <tool_call> tags.
DO NOT use function calling.
YOU ONLY OUTPUT RAW JSON.
NOTHING else. ONLY JSON.

CURRENT GOAL:

${goal}

AVAILABLE ARTIFACTS:

${artifactDescription}

AVAILABLE CAPABILITIES:

${capabilityDescription}

COMPLETED STEPS:

${completedStepsDescription}

OBSERVATIONS FROM EXECUTION:

${observationDescription}

DECISION RULES:

1. Based on the observations, decide what happens next.
2. You have three options:
   a) "next_step" — Execute another capability step.
   b) "goal_complete" — The user's goal has been achieved.
   c) "ask_user" — You need more information from the user.
3. If goal_complete: The observations show the goal is actually satisfied.
4. If ask_user: Explain what information you need.
5. If next_step: Provide the next executable step with capabilityId and inputs.
6. Only use capabilities listed above.
7. Never invent capabilities.
8. Do not claim completion unless goal is genuinely satisfied.
9. For image transformation tasks: Prefer "process_image" over "run_python".
10. For file inspection tasks: Prefer "inspect_image" over "run_python".
11. Return ONLY valid JSON. No tool calls. No markdown. No text.
12. Output exactly one of these JSON objects, nothing else:

For next_step:
{
  "decision": "next_step",
  "reasoning": "why this step",
  "nextStep": {
    "id": "N",
    "title": "description",
    "capabilityId": "capability_id",
    "input": {}
  }
}

For goal_complete:
{
  "decision": "goal_complete",
  "reasoning": "why goal is satisfied"
}

For ask_user:
{
  "decision": "ask_user",
  "reasoning": "why more info needed",
  "question": "What do you need to know?"
}

START JSON RESPONSE NOW:
`;

    const userPrompt = `
Based on these observations, what should the agent do next?

Observations:
${observationDescription}

Completed steps:
${completedStepsDescription}
`;

    const response =
      await llm.chat.completions.create({
        model: "openrouter/free",

        max_tokens: 1500,

        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      });

    const content =
      response.choices[0]?.message?.content;

    if (!content) {
      throw new Error(
        "LLM returned an empty replanning response."
      );
    }

    return this.parseReplanResult(
      content,
      capabilities
    );
  }

  private parseReplanResult(
    content: string,
    capabilities: Capability[]
  ): ReplanResult {
    const json =
      this.extractJson(content);

    let parsed: any;

    try {
      parsed =
        JSON.parse(json);
    } catch {
      throw new Error(
        `LLM returned invalid JSON in replanning:\n${content}`
      );
    }

    if (
      !parsed ||
      typeof parsed.decision !==
        "string"
    ) {
      throw new Error(
        "LLM replan response does not contain a valid decision."
      );
    }

    const decision =
      parsed.decision as ReplanDecision;

    if (
      decision !== "next_step" &&
      decision !== "goal_complete" &&
      decision !== "ask_user"
    ) {
      throw new Error(
        `Invalid replan decision: ${decision}`
      );
    }

    const reasoning =
      typeof parsed.reasoning ===
        "string"
        ? parsed.reasoning
        : "No reasoning provided";

    if (
      decision === "goal_complete"
    ) {
      return {
        decision,
        reasoning,
      };
    }

    if (decision === "ask_user") {
      return {
        decision,
        reasoning,
        question:
          typeof parsed.question ===
            "string"
            ? parsed.question
            : "What information do you need to provide?",
      };
    }

    // decision === "next_step"
    if (!parsed.nextStep) {
      throw new Error(
        "Replan decision is 'next_step' but nextStep not provided."
      );
    }

    const nextStep = parsed.nextStep;

    if (!nextStep) {
      throw new Error(
        "Replan decision is 'next_step' but nextStep not provided."
      );
    }

    // Auto-generate ID if missing
    const stepId =
      typeof nextStep.id === "string"
        ? nextStep.id
        : `step_${Date.now()}`;

    if (
      typeof nextStep.title !==
        "string"
    ) {
      throw new Error(
        "Next step has invalid title."
      );
    }

    if (
      nextStep.capabilityId &&
      typeof nextStep.capabilityId !==
        "string"
    ) {
      throw new Error(
        "Next step has invalid capabilityId."
      );
    }

    // Validate capability exists
    if (
      nextStep.capabilityId
    ) {
      const available =
        new Set(
          capabilities.map(
            (capability) =>
              capability.id
          )
        );

      if (
        !available.has(
          nextStep.capabilityId
        )
      ) {
        throw new Error(
          `Planner selected unknown capability '${nextStep.capabilityId}'.`
        );
      }
    }

    return {
      decision,
      reasoning,
      nextStep: {
        id: stepId,
        title: nextStep.title,
        capabilityId:
          nextStep.capabilityId,
        input:
          nextStep.input ?? {},
        completed: false,
      },
    };
  }

  /**
   * Verify that the user's goal has been achieved.
   *
   * This is distinct from "all plan steps completed."
   * The LLM should evaluate whether the observations
   * and artifacts actually satisfy the original goal.
   */
  async verifyGoal(
    goal: string,
    artifacts: Artifact[],
    observations: Observation[]
  ): Promise<{
    goalAchieved: boolean;
    reasoning: string;
  }> {
    const artifactDescription =
      artifacts.length === 0
        ? "No artifacts."
        : artifacts
            .map(
              (artifact) =>
                `- ${artifact.name} ` +
                `(type: ${artifact.type}, ` +
                `path: ${artifact.path ?? "unknown"})`
            )
            .join("\n");

    const observationDescription =
      observations.length === 0
        ? "No observations."
        : observations
            .map(
              (obs) =>
                `[${obs.type}] ${obs.message}`
            )
            .join("\n");

    const systemPrompt = `
You are evaluating whether an AI agent has successfully completed a user's goal.

USER'S GOAL:

${goal}

ARTIFACTS CREATED/AVAILABLE:

${artifactDescription}

OBSERVATIONS FROM EXECUTION:

${observationDescription}

YOUR TASK:

Determine whether the user's goal has been achieved.

DECISION RULES:

1. Goal achieved = the observations and artifacts satisfy the original goal.
2. Not achieved = more work is needed.
3. Be strict: "created a file" ≠ "task complete" unless the file contents are verified.
4. Look for evidence of success:
   - Expected artifacts exist and are valid.
   - Observations confirm the work was done correctly.
   - No errors that prevent goal completion.
5. Be skeptical of claims without evidence.
6. Return ONLY valid JSON.
7. No markdown, no text before/after.

Return exactly:

{
  "goalAchieved": true or false,
  "reasoning": "brief explanation"
}
`;

    const userPrompt = `
Based on the artifacts and observations, has the user's goal been achieved?

Goal: ${goal}

Artifacts: ${artifactDescription}

Observations: ${observationDescription}
`;

    const response =
      await llm.chat.completions.create({
        model: "openrouter/free",

        max_tokens: 800,

        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      });

    const content =
      response.choices[0]?.message?.content;

    if (!content) {
      throw new Error(
        "LLM returned empty goal verification response."
      );
    }

    return this.parseGoalVerification(
      content
    );
  }

  private parseGoalVerification(
    content: string
  ): {
    goalAchieved: boolean;
    reasoning: string;
  } {
    const json =
      this.extractJson(content);

    let parsed: any;

    try {
      parsed =
        JSON.parse(json);
    } catch {
      throw new Error(
        `LLM returned invalid JSON in goal verification:\n${content}`
      );
    }

    if (
      typeof parsed.goalAchieved !==
      "boolean"
    ) {
      throw new Error(
        "Goal verification response does not contain a valid goalAchieved boolean."
      );
    }

    if (
      typeof parsed.reasoning !==
      "string"
    ) {
      throw new Error(
        "Goal verification response does not contain reasoning."
      );
    }

    return {
      goalAchieved:
        parsed.goalAchieved,

      reasoning:
        parsed.reasoning,
    };
  }
}