/**
 * Subagent module for specialized domain reasoning.
 *
 * Subagents are specialized LLM instances focused on specific domains.
 * Examples: ImageProcessingAgent, DebuggingAgent, DataAnalysisAgent.
 *
 * The Supervisor delegates tasks to appropriate subagents.
 */

export type SubagentSpecialty =
  | "image-processing"
  | "debugging"
  | "data-analysis"
  | "web-research"
  | "code-generation"
  | "general";

export interface SubagentCapability {
  name: string;
  description: string;
  specialty: SubagentSpecialty;
}

export interface SubagentRequest {
  goal: string;
  context: Record<string, unknown>;
  requiredCapabilities: string[];
}

export interface SubagentResponse {
  success: boolean;
  result: unknown;
  reasoning: string;
  artifacts: string[];
  nextSteps?: string[];
  error?: string;
}

/**
 * Base Subagent class.
 * Specialized agents inherit from this.
 */
export abstract class Subagent {
  abstract specialty: SubagentSpecialty;
  abstract capabilities: SubagentCapability[];

  abstract process(
    request: SubagentRequest
  ): Promise<SubagentResponse>;
}

/**
 * Create a subagent instance for a specific specialty.
 */
export function createSubagent(
  specialty: SubagentSpecialty
): Subagent {
  throw new Error(
    `Subagent for ${specialty} not yet implemented.`
  );
}
