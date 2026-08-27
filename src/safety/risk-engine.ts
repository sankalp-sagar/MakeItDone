// src/safety/risk-engine.ts

import { Capability } from "../capabilities/types";

export type RiskDecision =
  | "allow"
  | "approval_required"
  | "deny";

export interface RiskEvaluation {
  decision: RiskDecision;
  reason: string;
}

export class RiskEngine {
  evaluate(capability: Capability): RiskEvaluation {
    if (capability.risk === "critical") {
      return {
        decision: "deny",
        reason: "Critical-risk actions are not automatically permitted.",
      };
    }

    if (capability.requiresApproval) {
      return {
        decision: "approval_required",
        reason: `${capability.name} requires human approval.`,
      };
    }

    if (capability.risk === "high") {
      return {
        decision: "approval_required",
        reason: `${capability.name} is classified as high risk.`,
      };
    }

    return {
      decision: "allow",
      reason: `${capability.name} is safe to execute automatically.`,
    };
  }
}