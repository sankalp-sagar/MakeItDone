// src/capabilities/types.ts

export type CapabilityCategory =
  | "observation"
  | "reasoning"
  | "execution"
  | "communication";

export type RiskLevel =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "critical";

export interface Capability {
  id: string;
  name: string;
  description: string;

  category: CapabilityCategory;
  risk: RiskLevel;

  reversible: boolean;
  requiresApproval: boolean;
}