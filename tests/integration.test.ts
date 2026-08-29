/**
 * Integration tests
 *
 * End-to-end task flows and cross-component interactions.
 */

import { describe, expect, it } from "@jest/globals";

import { buildMissingApiKeyMessage } from "../src/llm/client";

// TODO: Import supervisor, capabilities, safety

describe("Integration Tests", () => {
  describe("Passport photo task", () => {
    it("should complete full passport photo workflow", () => {
      // TODO: Test full end-to-end flow:
      // 1. startTask("Make a passport photo from this image", [input.jpg])
      // 2. Planner generates plan with process_image
      // 3. Executor runs process_image
      // 4. Output artifact created
      // 5. Verify result is valid image
    });
  });

  describe("LLM config", () => {
    it("should explain how to set the missing API key", () => {
      const message = buildMissingApiKeyMessage();

      expect(message).toContain("OPENROUTER_API_KEY");
      expect(message).toContain(".env");
    });
  });

  describe("Goal verification", () => {
    it("should verify goal completion after execution", () => {
      // TODO: Implement after goal verification feature added
    });
  });

  describe("Adaptive replanning", () => {
    it("should replan when observation differs from expectation", () => {
      // TODO: Implement after adaptive supervisor added
    });
  });

  describe("User interaction", () => {
    it("should ask user when information is missing", () => {
      // TODO: Implement after user interaction feature added
    });

    it("should resume execution after user response", () => {
      // TODO: Implement after user interaction feature added
    });
  });

  describe("Safety gates", () => {
    it("should request approval before destructive operations", () => {
      // TODO: Implement with actual risky task
    });
  });
});
