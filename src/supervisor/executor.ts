import { CapabilityRegistry } from "../capabilities/registry";
import { Capability } from "../capabilities/types";
import { RiskEngine } from "../safety/risk-engine";

import * as fs from "node:fs/promises";
import * as path from "node:path";

import sharp from "sharp";

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

      case "process_image":
        return this.processImage(
          input
        );

      case "run_python":
        return {
          success: false,
          decision: "failed",
          message:
            "run_python is not implemented yet.",
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

  private async processImage(
    input: Record<string, unknown>
  ): Promise<ExecutionResult> {
    /*
     * The LLM may use slightly different names for
     * the same concept.
     *
     * We normalize those names at the capability
     * boundary instead of making the entire system
     * depend on one exact LLM output format.
     */

    const inputPath =
      this.getFirstString(
        input,
        [
          "image_path",
          "input_path",
          "source",
          "input",
        ]
      );

    const outputPath =
      this.getFirstString(
        input,
        [
          "output_path",
          "output",
          "destination",
        ]
      ) ??
      "./output/processed_image.jpg";

    if (!inputPath) {
      return {
        success: false,

        decision: "failed",

        message:
          "process_image requires an input image path.",
      };
    }

    const absoluteInputPath =
      path.resolve(
        inputPath
      );

    const absoluteOutputPath =
      path.resolve(
        outputPath
      );

    try {
      await fs.access(
        absoluteInputPath
      );
    } catch {
      return {
        success: false,

        decision: "failed",

        message:
          `Input image does not exist: ${inputPath}`,
      };
    }

    try {
      await fs.mkdir(
        path.dirname(
          absoluteOutputPath
        ),
        {
          recursive: true,
        }
      );

      let image =
        sharp(
          absoluteInputPath
        );

      const parameters =
        this.getObject(
          input,
          "parameters"
        );

      const operation =
        this.getFirstString(
          input,
          [
            "operation",
            "action",
            "mode",
          ]
        );

      /*
       * Passport photo operation.
       */

      if (
        operation ===
          "passport_photo" ||
        parameters?.size ===
          "35mm x 45mm"
      ) {
        const metadata =
          await sharp(
            absoluteInputPath
          ).metadata();

        if (
          !metadata.width ||
          !metadata.height
        ) {
          return {
            success: false,

            decision: "failed",

            message:
              "Could not determine input image dimensions.",
          };
        }

        const width =
          metadata.width;

        const height =
          metadata.height;

        const side =
          Math.min(
            width,
            height
          );

        const left =
          Math.floor(
            (width - side) /
              2
          );

        const top =
          Math.floor(
            (height - side) /
              2
          );

        image =
          image.extract({
            left,
            top,
            width: side,
            height: side,
          });

        /*
         * The LLM may provide dimensions.
         * For now we support them when present,
         * otherwise use our safe MVP default.
         */

        const requestedWidth =
          this.getNumber(
            input,
            "width"
          );

        const requestedHeight =
          this.getNumber(
            input,
            "height"
          );

        const finalWidth =
          requestedWidth ??
          600;

        const finalHeight =
          requestedHeight ??
          600;

        image =
          image.resize(
            finalWidth,
            finalHeight,
            {
              fit: "cover",
            }
          );
      } else {
        /*
         * Generic image transformation.
         *
         * This is deliberately conservative:
         * preserve the image and constrain its
         * maximum size.
         */

        image =
          image.resize({
            width:
              this.getNumber(
                input,
                "width"
              ) ?? 1200,

            height:
              this.getNumber(
                input,
                "height"
              ) ?? 1200,

            fit: "inside",

            withoutEnlargement:
              true,
          });
      }

      await image
        .jpeg({
          quality: 95,
        })
        .withMetadata({
          density: 300,
        })
        .toFile(
          absoluteOutputPath
        );

      const outputMetadata =
        await sharp(
          absoluteOutputPath
        ).metadata();

      return {
        success: true,

        decision:
          "executed",

        message:
          `Created image: ${outputPath}`,

        data: {
          artifact: {
            name:
              path.basename(
                absoluteOutputPath
              ),

            type:
              "image",

            path:
              outputPath,

            source:
              "agent",
          },

          metadata: {
            width:
              outputMetadata.width,

            height:
              outputMetadata.height,

            format:
              outputMetadata.format,

            size:
              outputMetadata.size,
          },
        },
      };
    } catch (error) {
      return {
        success: false,

        decision: "failed",

        message:
          `Image processing failed: ${
            error instanceof Error
              ? error.message
              : String(error)
          }`,
      };
    }
  }

  private getFirstString(
    input: Record<string, unknown>,
    keys: string[]
  ): string | undefined {
    for (
      const key of keys
    ) {
      if (
        typeof input[key] ===
        "string" &&
        input[key].trim()
      ) {
        return input[key];
      }
    }

    return undefined;
  }

  private getNumber(
    input: Record<string, unknown>,
    key: string
  ): number | undefined {
    const value =
      input[key];

    if (
      typeof value ===
      "number" &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (
      typeof value ===
      "string"
    ) {
      const parsed =
        Number(value);

      if (
        Number.isFinite(
          parsed
        )
      ) {
        return parsed;
      }
    }

    return undefined;
  }

  private getObject(
    input: Record<string, unknown>,
    key: string
  ): Record<
    string,
    any
  > | undefined {
    const value =
      input[key];

    if (
      typeof value ===
        "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      return value as Record<
        string,
        any
      >;
    }

    return undefined;
  }
}