import { Planner } from "./planner";

import {
  Executor,
} from "./executor";

import {
  TaskState,
  Artifact,
} from "./state";

import {
  CapabilityRegistry,
} from "../capabilities/registry";

export class Supervisor {
  private planner =
    new Planner();

  constructor(
    private executor: Executor,
    private registry: CapabilityRegistry
  ) {}

  async startTask(
    goal: string,
    artifacts: Artifact[] = []
  ): Promise<TaskState> {
    const state: TaskState = {
      id: crypto.randomUUID(),

      goal,

      status: "planning",

      observations: [],

      artifacts,

      plan: [],

      pendingQuestions: [],

      completedSteps: [],
    };

    const capabilities =
      this.registry.getAll();

    state.plan =
      await this.planner.createPlan(
        state.goal,
        capabilities,
        state.artifacts
      );

    state.status =
      "executing";

    return state;
  }

  /**
   * Execute next step and then replan based on observation.
   * This implements the adaptive loop.
   */
  async executeNextStep(
    state: TaskState
  ): Promise<TaskState> {
    const nextStep =
      state.plan.find(
        (step) =>
          !step.completed
      );

    if (!nextStep) {
      // No incomplete steps in current plan.
      // Trigger replanning to decide what to do.
      return this.replanAfterCompletion(
        state
      );
    }

    console.log(
      `\nExecuting step ${nextStep.id}: ${nextStep.title}`
    );

    if (!nextStep.capabilityId) {
      // Reasoning step (no capability execution)
      nextStep.completed =
        true;

      state.completedSteps.push(
        nextStep.id
      );

      state.observations.push({
        id: crypto.randomUUID(),

        type: "information",

        message:
          `Completed reasoning step: ${nextStep.title}`,
      });

      // Replan after this reasoning step
      return this.replanAfterCompletion(
        state
      );
    }

    // Execute the capability
    const result =
      await this.executor.execute({
        capabilityId:
          nextStep.capabilityId,

        input:
          nextStep.input ?? {},
      });

    console.log(
      "Execution result:",
      result
    );

    if (
      result.decision ===
      "approval_required"
    ) {
      state.status =
        "waiting_for_approval";

      state.pendingQuestions.push(
        result.message
      );

      return state;
    }

    if (
      result.decision === "denied" ||
      result.decision === "failed"
    ) {
      state.status =
        "failed";

      state.observations.push({
        id: crypto.randomUUID(),

        type: "error",

        message:
          result.message,

        data:
          result.data,
      });

      return state;
    }

    // Step executed successfully
    nextStep.completed =
      true;

    state.completedSteps.push(
      nextStep.id
    );

    state.observations.push({
      id: crypto.randomUUID(),

      type: "result",

      message:
        result.message,

      data:
        result.data,
    });

    // If a new artifact was created,
    // add it to the task state
    if (result.artifact) {
      state.artifacts.push(
        result.artifact
      );

      console.log(
        `\nArtifact added: ${
          result.artifact.name
        } (${result.artifact.type})`
      );
    }

    // After successful execution,
    // replan based on observations
    return this.replanAfterCompletion(
      state
    );
  }

  /**
   * After a step completes, consult the LLM
   * to determine what happens next.
   */
  private async replanAfterCompletion(
    state: TaskState
  ): Promise<TaskState> {
    const capabilities =
      this.registry.getAll();

    const replanResult =
      await this.planner.replan(
        state.goal,
        capabilities,
        state.artifacts,
        state.observations,
        state.plan,
        state.completedSteps
      );

    console.log(
      "\nReplanning result:",
      replanResult.decision
    );

    if (
      replanResult.decision ===
      "goal_complete"
    ) {
      // Before marking as completed,
      // verify the goal was actually achieved
      return this.verifyGoalCompletion(
        state
      );
    }

    if (
      replanResult.decision ===
      "ask_user"
    ) {
      state.status =
        "waiting_for_user";

      if (
        replanResult.question
      ) {
        state.pendingQuestions.push(
          replanResult.question
        );
      }

      return state;
    }

    if (
      replanResult.decision ===
      "next_step" &&
      replanResult.nextStep
    ) {
      // Add the new step to the plan
      state.plan.push(
        replanResult.nextStep
      );

      return state;
    }

    // Unexpected state
    state.status = "failed";

    state.observations.push({
      id: crypto.randomUUID(),

      type: "error",

      message:
        "Unexpected replanning result.",

      data: replanResult,
    });

    return state;
  }

  /**
   * Verify that the goal has actually been achieved.
   * This is a gate before marking task as completed.
   */
  private async verifyGoalCompletion(
    state: TaskState
  ): Promise<TaskState> {
    console.log(
      "\nVerifying goal completion..."
    );

    const verification =
      await this.planner.verifyGoal(
        state.goal,
        state.artifacts,
        state.observations
      );

    console.log(
      "Goal verification result:",
      verification.goalAchieved
    );

    state.observations.push({
      id: crypto.randomUUID(),

      type: "information",

      message:
        `Goal verification: ${
          verification.goalAchieved
            ? "ACHIEVED"
            : "NOT ACHIEVED"
        }`,

      data: {
        reasoning:
          verification.reasoning,
      },
    });

    if (
      verification.goalAchieved
    ) {
      state.status =
        "completed";

      return state;
    }

    // Goal not achieved yet.
    // Continue replanning to find next steps.
    return this.replanAfterCompletion(
      state
    );
  }
}