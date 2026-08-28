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

  async executeNextStep(
    state: TaskState
  ): Promise<TaskState> {
    const nextStep =
      state.plan.find(
        (step) =>
          !step.completed
      );

    if (!nextStep) {
      state.status =
        "completed";

      return state;
    }

    console.log(
      `\nExecuting step ${nextStep.id}: ${nextStep.title}`
    );

    if (!nextStep.capabilityId) {
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

      return state;
    }

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

    return state;
  }
}