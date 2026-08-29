/**
 * Supervisor tests
 *
 * Test suite for supervisor state, planning, and execution loops.
 */

import { describe, expect, it } from "@jest/globals";

import { Planner } from "../src/supervisor/planner";
import { Supervisor } from "../src/supervisor/supervisor";
import { isDangerousRequest, parseTaskInput } from "../src/task-runner";

describe("Supervisor", () => {
  describe("startTask", () => {
    it("should create initial task state with goal and artifacts", () => {
      // TODO: Implement
    });

    it("should call planner with goal and artifacts", () => {
      // TODO: Implement
    });

    it("should initialize task status to 'planning'", () => {
      // TODO: Implement
    });

    it("should recover JSON when the model emits a safety line before a structured response", () => {
      const planner = new Planner();
      const result = (planner as any).extractJson(`User Safety: safe\n{\n  "decision": "next_step",\n  "reasoning": "The input image has been inspected. The goal is to make a passpo\nrt size photo",\n  "nextStep": {\n    "id": "N1",\n    "title": "Transform image into passport photo",\n    "capabilityId": "process_image",\n    "input": { "path": "./test-assets/input.jpg", "output_path": "./test-assets/passport_photo.jpg" }\n  }\n}`);

      expect(result).toContain('"decision": "next_step"');
      expect(result).toContain('"capabilityId": "process_image"');
    });

    it("should fail gracefully when verification only returns a safety line", () => {
      const planner = new Planner();
      const result = (planner as any).parseGoalVerification(`User Safety: safe`);

      expect(result.goalAchieved).toBe(false);
      expect(result.reasoning).toContain("safety line");
    });

    it("should parse attached files and dangerous requests", () => {
      const parsed = parseTaskInput([
        "--file",
        "./test-assets/input.jpg",
        "make a passport size photo",
      ]);

      expect(parsed.goal).toBe("make a passport size photo");
      expect(parsed.artifacts[0]?.path).toBe("./test-assets/input.jpg");
      expect(parsed.artifacts[0]?.type).toBe("image");
      expect(isDangerousRequest("delete all user data and wipe the database")).toBe(true);
    });

    it("should fall back to ask_user when the LLM returns no content", () => {
      const planner = new Planner();
      const result = (planner as any).parseReplanResult(
        "",
        []
      );

      expect(result.decision).toBe("ask_user");
      expect(result.question).toContain("information");
    });

    it("should treat a resumed answer as the new task goal", async () => {
      const registry = {
        getAll: () => [],
      } as any;
      const supervisor = new Supervisor({} as any, registry);
      const createPlan = jest.fn().mockResolvedValue([]);
      (supervisor as any).planner = { createPlan };

      const state = {
        id: "task-1",
        goal: "old task",
        status: "waiting_for_user",
        observations: [],
        artifacts: [],
        plan: [],
        pendingQuestions: ["What would you like me to do?"],
        userResponses: [],
        completedSteps: [],
      };

      const next = await supervisor.resumeTask(state as any, "What would you like me to do?", "sum 3 and 5");

      expect(next.goal).toBe("sum 3 and 5");
      expect(next.pendingQuestions).toEqual([]);
      expect(next.status).toBe("executing");
      expect(createPlan).toHaveBeenCalledWith("sum 3 and 5", [], []);
    });
  });

  describe("executeNextStep", () => {
    it("should execute step with capability", () => {
      // TODO: Implement
    });

    it("should mark step completed on success", () => {
      // TODO: Implement
    });

    it("should record observation", () => {
      // TODO: Implement
    });

    it("should handle approval-required steps", () => {
      // TODO: Implement
    });

    it("should handle step failure", () => {
      // TODO: Implement
    });
  });

  describe("replanning", () => {
    it("should replan after observation", () => {
      // TODO: Implement after adaptive supervisor added
    });

    it("should accept planner decision to ask user", () => {
      // TODO: Implement after user interaction added
    });

    it("should accept planner decision that goal complete", () => {
      // TODO: Implement after goal verification added
    });
  });
});
