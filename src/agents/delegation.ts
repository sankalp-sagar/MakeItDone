/**
 * Delegation module for routing tasks to specialized subagents.
 *
 * The Supervisor uses this to decide when to delegate vs. handle directly.
 */

import {
  Subagent,
  SubagentRequest,
  SubagentResponse,
  SubagentSpecialty,
} from "./subagent";

export interface DelegationDecision {
  shouldDelegate: boolean;
  specialty?: SubagentSpecialty;
  reason: string;
}

export interface DelegationContext {
  goal: string;
  capabilities: string[];
  artifacts: Array<{ type: string; name: string }>;
  observations: string[];
}

/**
 * Evaluates whether a task should be delegated to a subagent.
 */
export class DelegationRouter {
  evaluate(
    context: DelegationContext
  ): DelegationDecision {
    const goal = context.goal.toLowerCase();
    const hasImageWork =
      goal.includes("image") ||
      goal.includes("photo") ||
      goal.includes("crop") ||
      goal.includes("resize");
    const hasDebugWork =
      goal.includes("bug") ||
      goal.includes("error") ||
      goal.includes("fix") ||
      goal.includes("debug") ||
      goal.includes("fail");
    const hasDataWork =
      goal.includes("analy") ||
      goal.includes("csv") ||
      goal.includes("data") ||
      goal.includes("report");
    const hasWebWork =
      goal.includes("search") ||
      goal.includes("web") ||
      goal.includes("research") ||
      goal.includes("lookup");

    if (hasImageWork) {
      return {
        shouldDelegate: true,
        specialty: "image-processing",
        reason: "Image transformation work maps to image-processing specialist.",
      };
    }

    if (hasDebugWork) {
      return {
        shouldDelegate: true,
        specialty: "debugging",
        reason: "Error diagnosis and bug fixing map to debugging specialist.",
      };
    }

    if (hasDataWork) {
      return {
        shouldDelegate: true,
        specialty: "data-analysis",
        reason: "Analysis and reporting map to data-analysis specialist.",
      };
    }

    if (hasWebWork) {
      return {
        shouldDelegate: true,
        specialty: "web-research",
        reason: "Web lookup and research map to web-research specialist.",
      };
    }

    return {
      shouldDelegate: false,
      reason: "Task fits direct supervisor handling.",
    };
  }
}

/**
 * Manages subagent lifecycle and communication.
 */
export class SubagentManager {
  private subagents: Map<SubagentSpecialty, Subagent> =
    new Map();

  register(agent: Subagent): void {
    this.subagents.set(agent.specialty, agent);
  }

  async delegate(
    specialty: SubagentSpecialty,
    request: SubagentRequest
  ): Promise<SubagentResponse> {
    const agent = this.subagents.get(specialty);

    if (!agent) {
      return {
        success: false,
        result: null,
        reasoning: `No agent registered for ${specialty}`,
        artifacts: [],
        error: `Subagent not found: ${specialty}`,
      };
    }

    return agent.process(request);
  }
}
