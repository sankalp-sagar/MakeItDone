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
    // TODO: Implement intelligent delegation logic.
    // For now, all tasks are handled directly by supervisor.
    return {
      shouldDelegate: false,
      reason: "Delegation not yet implemented",
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
