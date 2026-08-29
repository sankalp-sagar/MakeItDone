/**
 * Safety tests
 *
 * Risk engine, safety policies, and approval flow.
 */

import {
  describe,
  expect,
  it,
} from "@jest/globals";

import { RiskEngine } from "../src/safety/risk-engine";
import { DEFAULT_SAFETY_POLICIES } from "../src/safety/policies";

const capability = (
  overrides: Partial<{
    id: string;
    name: string;
    description: string;
    category: "observation" | "reasoning" | "execution" | "communication";
    risk: "none" | "low" | "medium" | "high" | "critical";
    reversible: boolean;
    requiresApproval: boolean;
  }> = {}
) => ({
  id: "read_file",
  name: "Read File",
  description: "Read file contents",
  category: "observation" as const,
  risk: "low" as const,
  reversible: true,
  requiresApproval: false,
  ...overrides,
});

describe("RiskEngine", () => {
  describe("evaluate", () => {
    it("should allow low-risk operations", () => {
      const engine = new RiskEngine();
      const result = engine.evaluate(
        capability({ risk: "low" })
      );

      expect(result.decision).toBe("allow");
    });

    it("should require approval for medium-risk operations", () => {
      const engine = new RiskEngine();
      const result = engine.evaluate(
        capability({ risk: "medium" })
      );

      expect(result.decision).toBe("approval_required");
    });

    it("should allow normal modify_file operations", () => {
      const engine = new RiskEngine();
      const result = engine.evaluate(
        capability({ id: "modify_file", name: "Modify File", risk: "medium" }),
        "/Users/test/project/hello.txt"
      );

      expect(result.decision).toBe("allow");
    });

    it("should require approval for high-risk operations", () => {
      const engine = new RiskEngine();
      const result = engine.evaluate(
        capability({ risk: "high" })
      );

      expect(result.decision).toBe("approval_required");
    });

    it("should deny critical-risk operations", () => {
      const engine = new RiskEngine();
      const result = engine.evaluate(
        capability({ risk: "critical" })
      );

      expect(result.decision).toBe("deny");
    });
  });
});

describe("SafetyPolicies", () => {
  describe("destructive-filesystem-actions", () => {
    it("should require approval for delete_file", () => {
      const engine = new RiskEngine();
      const result = engine.evaluate(
        capability({
          id: "delete_file",
          name: "Delete File",
          risk: "high",
        })
      );

      expect(result.decision).toBe("approval_required");
    });

    it("should require approval for modify_file on critical paths", () => {
      const engine = new RiskEngine();
      const result = engine.evaluate(
        capability({
          id: "modify_file",
          name: "Modify File",
          risk: "medium",
        }),
        "/Users/test/.env"
      );

      expect(result.decision).toBe("deny");
    });
  });

  describe("production-changes", () => {
    it("should deny production modifications", () => {
      const engine = new RiskEngine();
      const result = engine.evaluate(
        capability({ id: "modify_file", risk: "medium" }),
        "/var/www/app/config.json"
      );

      expect(result.decision).toBe("deny");
      expect(DEFAULT_SAFETY_POLICIES.length).toBeGreaterThan(0);
    });
  });
});
