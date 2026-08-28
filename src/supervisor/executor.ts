import { CapabilityRegistry } from "../capabilities/registry";
import { Capability } from "../capabilities/types";
import { RiskEngine } from "../safety/risk-engine";

import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface ExecutionRequest {
  capabilityId: string;

  input?: Record<string, unknown>;
}

export interface ExecutionResult {
  success: boolean;

  decision:
    | "executed"
    | "approval_required"
    | "denied"
    | "failed";

  message: string;

  data?: unknown;
}

export class Executor {
  constructor(
    private registry: CapabilityRegistry,

    private riskEngine: RiskEngine
  ) {}

  async execute(
    request: ExecutionRequest
  ): Promise<ExecutionResult> {
    const capability =
      this.registry.getById(
        request.capabilityId
      );

    if (!capability) {
      return {
        success: false,

        decision: "failed",

        message:
          `Capability '${request.capabilityId}' was not found.`,
      };
    }

    const evaluation =
      this.riskEngine.evaluate(
        capability
      );

    if (
      evaluation.decision ===
      "deny"
    ) {
      return {
        success: false,

        decision: "denied",

        message:
          evaluation.reason,
      };
    }

    if (
      evaluation.decision ===
      "approval_required"
    ) {
      return {
        success: false,

        decision:
          "approval_required",

        message:
          evaluation.reason,
      };
    }

    return this.perform(
      capability,

      request.input ?? {}
    );
  }

  private async perform(
    capability: Capability,

    input: Record<string, unknown>
  ): Promise<ExecutionResult> {
    switch (
      capability.id
    ) {
      case "inspect_directory":
        return this.inspectDirectory(
          input
        );

      case "read_file":
        return this.readFile(
          input
        );

      case "run_python":
        return {
          success: false,

          decision: "failed",

          message:
            "run_python is not implemented yet.",
        };

      case "process_image":
        return {
          success: false,

          decision: "failed",

          message:
            "process_image is not implemented yet.",
        };

      default:
        return {
          success: false,

          decision: "failed",

          message:
            `Capability '${capability.id}' does not have an executor implementation yet.`,
        };
    }
  }

  private async inspectDirectory(
    input: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const requestedPath =
      typeof input.path === "string"
        ? input.path
        : ".";

    const absolutePath =
      path.resolve(
        requestedPath
      );

    try {
      const entries =
        await fs.readdir(
          absolutePath,
          {
            withFileTypes: true,
          }
        );

      const items =
        entries.map(
          (entry) => ({
            name:
              entry.name,

            type:
              entry.isDirectory()
                ? "directory"
                : "file",
          })
        );

      return {
        success: true,

        decision:
          "executed",

        message:
          `Inspected directory: ${absolutePath}`,

        data: {
          path:
            absolutePath,

          items,
        },
      };
    } catch {
      return {
        success: false,

        decision: "failed",

        message:
          `Could not inspect directory: ${absolutePath}`,
      };
    }
  }

  private async readFile(
    input: Record<string, unknown>
  ): Promise<ExecutionResult> {
    if (
      typeof input.path !==
      "string"
    ) {
      return {
        success: false,

        decision: "failed",

        message:
          "read_file requires a file path.",
      };
    }

    const filePath =
      path.resolve(
        input.path
      );

    try {
      const stat =
        await fs.stat(
          filePath
        );

      if (!stat.isFile()) {
        return {
          success: false,

          decision: "failed",

          message:
            `Path is not a file: ${input.path}`,
        };
      }

      const extension =
        path.extname(
          filePath
        ).toLowerCase();

      const binaryExtensions =
        new Set([
          ".jpg",
          ".jpeg",
          ".png",
          ".gif",
          ".webp",
          ".bmp",
          ".pdf",
          ".zip",
          ".mp3",
          ".mp4",
          ".mov",
          ".avi",
        ]);

      if (
        binaryExtensions.has(
          extension
        )
      ) {
        return {
          success: true,

          decision:
            "executed",

          message:
            `Identified binary file: ${input.path}`,

          data: {
            path:
              input.path,

            type:
              "binary",

            extension,

            size:
              stat.size,
          },
        };
      }

      const content =
        await fs.readFile(
          filePath,
          "utf-8"
        );

      return {
        success: true,

        decision:
          "executed",

        message:
          `Read file: ${input.path}`,

        data: {
          path:
            input.path,

          type:
            "text",

          content,
        },
      };
    } catch {
      return {
        success: false,

        decision: "failed",

        message:
          `Could not read file: ${input.path}`,
      };
    }
  }
}