import { llm } from "../llm/client";

import {
  Capability,
} from "../capabilities/types";

import {
  Artifact,
  PlanStep,
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

You DO NOT execute anything.

You DO NOT use tool-call syntax.

You DO NOT output <tool_call> tags.

You ONLY return JSON.

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
16. Do not use Markdown.
17. Do not write anything before or after the JSON.

Return exactly:

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
}