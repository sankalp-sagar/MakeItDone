// src/safety/risk-engine.ts

import { Capability } from "../capabilities/types";
import { DEFAULT_SAFETY_POLICIES } from "./policies";

export type RiskDecision =
  | "allow"
  | "approval_required"
  | "deny";

export interface RiskEvaluation {
  decision: RiskDecision;
  reason: string;
}

export class RiskEngine {
  evaluate(
    capability: Capability,
    targetPath?: string,
    context?: Record<string, unknown>
  ): RiskEvaluation {
    if (capability.risk === "critical") {
      return {
        decision: "deny",
        reason: "Critical-risk actions are not automatically permitted.",
      };
    }

    if (
      capability.requiresApproval ||
      capability.risk === "high"
    ) {
      return {
        decision: "approval_required",
        reason: `${capability.name} requires human approval.`,
      };
    }

    const pathValue = targetPath ?? context?.targetPath ?? "";
    const normalized = String(pathValue).toLowerCase();

    if (
      capability.id === "modify_file" &&
      (normalized.includes(".env") ||
        normalized.includes("/etc/") ||
        normalized.includes("/var/www/") ||
        normalized.includes("production") ||
        normalized.includes("secrets"))
    ) {
      return {
        decision: "deny",
        reason: `Unsafe target path for ${capability.name}: ${pathValue}`,
      };
    }

    if (
      capability.id === "delete_file" &&
      (normalized.includes(".env") ||
        normalized.includes(".git") ||
        normalized.includes("node_modules") ||
        normalized.includes("/etc/"))
    ) {
      return {
        decision: "deny",
        reason: `Destructive deletion is blocked for ${pathValue}`,
      };
    }

    for (const policy of DEFAULT_SAFETY_POLICIES) {
      if (
        policy.name === "production-changes" &&
        normalized.includes("/var/www/") &&
        capability.category === "execution"
      ) {
        return {
          decision: "deny",
          reason: policy.description,
        };
      }
    }

    if (capability.risk === "medium") {
      return {
        decision: "approval_required",
        reason: `${capability.name} is classified as medium risk.`,
      };
    }

    return {
      decision: "allow",
      reason: `${capability.name} is safe to execute automatically.`,
    };
  }
}