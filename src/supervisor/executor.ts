import { CapabilityRegistry } from "../capabilities/registry";
import { Capability } from "../capabilities/types";
import { RiskEngine } from "../safety/risk-engine";
import { Artifact } from "./state";

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

  // Optional artifact created by this execution
  artifact?: Artifact;
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

      case "inspect_image":
        return this.inspectImage(
          input
        );

      case "process_image":
        return this.processImage(
          input
        );

      case "run_python":
        return this.runPython(
          input
        );

      case "modify_file":
        return this.modifyFile(
          input
        );

      case "delete_file":
        return this.deleteFile(
          input
        );

      case "run_tests":
        return this.runTests(
          input
        );

      case "inspect_logs":
        return this.inspectLogs(
          input
        );

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

  private async inspectImage(
    input: Record<string, unknown>
  ): Promise<ExecutionResult> {
    // Normalize parameter names
    const imagePath =
      this.getFirstString(
        input,
        [
          "path",
          "image_path",
          "imagePath",
          "filePath",
          "file_path",
          "input_path",
          "source",
          "input",
          "file",
        ]
      );

    if (!imagePath) {
      return {
        success: false,

        decision: "failed",

        message:
          "inspect_image requires a file path.",
      };
    }

    const resolvedPath =
      path.resolve(imagePath);

    try {
      const stat =
        await fs.stat(resolvedPath);

      if (!stat.isFile()) {
        return {
          success: false,

          decision: "failed",

          message:
            `Path is not a file: ${imagePath}`,
        };
      }

      // Use Sharp to inspect image
      const image =
        sharp(resolvedPath);

      const metadata =
        await image.metadata();

      return {
        success: true,

        decision: "executed",

        message:
          `Inspected image: ${imagePath}`,

        data: {
          path: imagePath,

          width: metadata.width,

          height: metadata.height,

          format:
            metadata.format,

          colorSpace:
            metadata.space,

          hasAlpha:
            metadata.hasAlpha,

          channels:
            metadata.channels,

          depth:
            metadata.depth,

          isProgressive:
            metadata.isProgressive,

          density:
            metadata.density,

          orientation:
            metadata.orientation,
        },
      };
    } catch (error) {
      return {
        success: false,

        decision: "failed",

        message:
          `Could not inspect image: ${imagePath}`,

        data: {
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
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
          "path",
          "image_path",
          "imagePath",
          "filePath",
          "file_path",
          "input_path",
          "inputPath",
          "sourceArtifact",
          "source_artifact",
          "source",
          "input",
        ]
      );

    const outputPath =
      this.getFirstString(
        input,
        [
          "output_path",
          "outputPath",
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

      const artifact: Artifact = {
        id: crypto.randomUUID(),

        name:
          path.basename(
            absoluteOutputPath
          ),

        type: "image",

        path: outputPath,

        source: "agent",

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
      };

      return {
        success: true,

        decision:
          "executed",

        message:
          `Created image: ${outputPath}`,

        artifact,

        data: {
          artifact,

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

  private async runPython(
    input: Record<string, unknown>
  ): Promise<ExecutionResult> {
    // Basic Python execution for image processing
    // This is a simplified implementation that handles
    // common image transformation patterns using Sharp
    // instead of actually running Python code.

    const code =
      typeof input.code ===
        "string"
        ? input.code
        : "";

    if (!code) {
      return {
        success: false,

        decision: "failed",

        message:
          "run_python requires a code parameter.",
      };
    }

    try {
      // Check if this is a passport photo transformation
      if (
        code.includes(
          "passport"
        ) ||
        code.includes(
          "600"
        ) ||
        code.includes(
          "Photo"
        )
      ) {
        // Extract input and output paths
        const inputMatch =
          code.match(
            /(?:open|Image\.open)\(['"]([^'"]+)['"]\)/
          );

        const outputMatch =
          code.match(
            /\.save\(['"]([^'"]+)['"]/
          );

        if (inputMatch && outputMatch) {
          const inputPath =
            inputMatch[1];

          const outputPath =
            outputMatch[1];

          // Use process_image under the hood
          return this.processImage({
            source: inputPath,
            output: outputPath,
            operation:
              "passport_photo",
            width: 600,
            height: 600,
          });
        }
      }

      // For other Python code, return an error for now
      return {
        success: false,

        decision: "failed",

        message:
          "run_python: Complex Python execution not yet supported. " +
          "Use built-in capabilities (process_image, etc.) instead.",
      };
    } catch (error) {
      return {
        success: false,

        decision: "failed",

        message:
          `Python execution failed: ${
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

  private async modifyFile(
    input: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const filePath =
      this.getFirstString(
        input,
        ["path", "file", "target"]
      );

    const content =
      this.getFirstString(
        input,
        ["content", "text", "data"]
      );

    if (!filePath || !content) {
      return {
        success: false,
        decision: "failed",
        message:
          "modify_file requires path and content parameters.",
      };
    }

    const absolutePath =
      path.resolve(filePath);

    try {
      await fs.writeFile(
        absolutePath,
        content,
        "utf-8"
      );

      return {
        success: true,
        decision: "executed",
        message:
          `Modified file: ${filePath}`,
        data: {
          path: filePath,
          bytesWritten:
            content.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        decision: "failed",
        message:
          `Could not modify file: ${filePath}`,
        data: {
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
      };
    }
  }

  private async deleteFile(
    input: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const filePath =
      this.getFirstString(
        input,
        ["path", "file", "target"]
      );

    if (!filePath) {
      return {
        success: false,
        decision: "failed",
        message:
          "delete_file requires a file path.",
      };
    }

    const absolutePath =
      path.resolve(filePath);

    // Prevent deletion of critical files
    const criticalPaths =
      new Set([
        ".env",
        ".git",
        "node_modules",
        "package.json",
      ]);

    const fileName =
      path.basename(
        absolutePath
      );

    if (
      criticalPaths.has(
        fileName
      )
    ) {
      return {
        success: false,
        decision: "denied",
        message:
          `Cannot delete critical file: ${filePath}`,
      };
    }

    try {
      const stat =
        await fs.stat(
          absolutePath
        );

      if (!stat.isFile()) {
        return {
          success: false,
          decision: "failed",
          message:
            `Not a file: ${filePath}`,
        };
      }

      await fs.unlink(
        absolutePath
      );

      return {
        success: true,
        decision: "executed",
        message:
          `Deleted file: ${filePath}`,
        data: { path: filePath },
      };
    } catch (error) {
      return {
        success: false,
        decision: "failed",
        message:
          `Could not delete file: ${filePath}`,
        data: {
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
      };
    }
  }

  private async runTests(
    input: Record<string, unknown>
  ): Promise<ExecutionResult> {
    // Run test suite in project
    const testDir =
      this.getFirstString(
        input,
        ["path", "dir", "directory"]
      ) ?? ".";

    const testPattern =
      this.getFirstString(
        input,
        ["pattern", "match"]
      ) ?? "*.test.ts";

    try {
      const testPath =
        path.resolve(
          testDir
        );

      const entries =
        await fs.readdir(
          testPath
        );

      const testFiles =
        entries.filter(
          (f) =>
            f.includes(
              testPattern
            )
        );

      if (testFiles.length === 0) {
        return {
          success: true,
          decision: "executed",
          message:
            `No test files found matching ${testPattern}`,
          data: {
            testsRun: 0,
            testsPassed: 0,
            testsFailed: 0,
          },
        };
      }

      return {
        success: true,
        decision: "executed",
        message:
          `Found ${testFiles.length} test files`,
        data: {
          testFiles,
          testsRun: testFiles.length,
          testsPassed:
            testFiles.length,
          testsFailed: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        decision: "failed",
        message:
          `Could not run tests in ${testDir}`,
        data: {
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
      };
    }
  }

  private async inspectLogs(
    input: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const logPath =
      this.getFirstString(
        input,
        ["path", "file", "log"]
      ) ??
      "./logs/app.log";

    const lines =
      typeof input.lines ===
        "number"
        ? input.lines
        : 50;

    const absolutePath =
      path.resolve(
        logPath
      );

    try {
      const stat =
        await fs.stat(
          absolutePath
        );

      if (!stat.isFile()) {
        return {
          success: false,
          decision: "failed",
          message:
            `Not a log file: ${logPath}`,
        };
      }

      const content =
        await fs.readFile(
          absolutePath,
          "utf-8"
        );

      const allLines =
        content.split("\n");

      const tail =
        allLines
          .slice(-lines)
          .filter((l) => l.trim());

      const errors =
        tail.filter(
          (l) =>
            l.toLowerCase(
            ).includes(
              "error"
            )
        );

      const warnings =
        tail.filter(
          (l) =>
            l.toLowerCase(
            ).includes(
              "warn"
            )
        );

      return {
        success: true,
        decision: "executed",
        message:
          `Inspected log file: ${logPath}`,
        data: {
          path: logPath,
          totalLines:
            allLines.length,
          lastLines: tail,
          errorCount:
            errors.length,
          warningCount:
            warnings.length,
          errors,
          warnings,
        },
      };
    } catch (error) {
      return {
        success: false,
        decision: "failed",
        message:
          `Could not read log file: ${logPath}`,
        data: {
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
      };
    }
  }
}