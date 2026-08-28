import { llm } from "../llm/client";

import {
  Capability,
} from "../capabilities/types";

import {
  Artifact,
  Observation,
  PlanStep,
} from "./state";

interface LLMPlan {
  reasoning: string;

  steps: Array<{
    id: string;

    title: string;

    capabilityId?: string;

    input?: Record<string, unknown>;
  }>;
}

export class Planner {
  async createPlan(
    goal: string,
    capabilities: Capability[],
    artifacts: Artifact[] = [],
    observations: Observation[] = []
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

    const observationDescription =
      observations.length === 0
        ? "No previous observations."
        : observations
            .map(
              (observation) =>
                `- ${observation.type}: ${observation.message}` +
                (observation.data !== undefined
                  ? `\n  data: ${JSON.stringify(
                      observation.data
                    )}`
                  : "")
            )
            .join("\n");

    const systemPrompt = `
You are the planner inside a general-purpose autonomous AI agent.

Your job is to decide what the agent should do next.

You are NOT an executor.

You must NEVER execute a capability yourself.

You must NEVER emit tool-call syntax.

You must NEVER output <tool_call> tags.

You must return ONLY valid JSON.

The application will execute the plan after you respond.

USER GOAL:

${goal}

USER-PROVIDED ARTIFACTS:

${artifactDescription}

PREVIOUS OBSERVATIONS:

${observationDescription}

AVAILABLE CAPABILITIES:

${capabilityDescription}

PLANNING RULES:

1. Only select capabilities from the AVAILABLE CAPABILITIES list.
2. Never invent a capability.
3. User-provided artifacts are already available to the agent.
4. If a user-provided artifact satisfies the required input, use that artifact directly.
5. Do NOT inspect the current directory merely to discover a file that is already listed as a user-provided artifact.
6. Do not assume that a file exists unless it is listed as an artifact or observed.
7. Use observation capabilities when information is genuinely missing.
8. Prefer the smallest useful next step.
9. Do not generate a complete speculative workflow when the result of an earlier step could change what should happen next.
10. Never claim that an action has already been executed.
11. Destructive or risky capabilities may be selected when appropriate, but the application's safety layer controls whether they can actually execute.
12. If the goal cannot currently be completed, create the safest useful next step.
13. If required information must come from the user and no suitable capability exists, return an empty steps array.
14. Every capability step must contain capabilityId.
15. Return JSON only.
16. Do not wrap the JSON in Markdown.
17. Do not write anything before or after the JSON.

Return exactly this structure:

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
Determine the next useful action for this task.

Goal:
${goal}

Remember:
- User-provided artifacts are already available.
- Previous observations are real information.
- Do not blindly repeat actions whose information is already available.
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