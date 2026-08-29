import { CapabilityRegistry } from "./capabilities/registry";
import { RiskEngine } from "./safety/risk-engine";
import { Executor } from "./supervisor/executor";
import { Supervisor } from "./supervisor/supervisor";
import { Artifact, TaskState } from "./supervisor/state";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";

export interface ParsedTaskInput {
  goal: string;
  artifacts: Artifact[];
}

export function isDangerousRequest(goal: string): boolean {
  const text = goal.toLowerCase();

  const dangerousPatterns = [
    /delete.*(database|user.*data|files|system|all)/i,
    /wipe.*(disk|database|files|system)/i,
    /destroy|format.*disk|rm -rf|drop table|shutdown|reboot/i,
    /steal|exfiltrate|leak.*secret|bypass.*auth|disable.*security/i,
    /malware|virus|ransomware|phishing|social engineering/i,
  ];

  return dangerousPatterns.some((pattern) => pattern.test(text));
}

export function parseTaskInput(argv: string[]): ParsedTaskInput {
  const normalizedArgs =
    argv.some(
      (arg) =>
        /node|tsx|ts-node|\.m?js$|\.ts$/.test(arg)
    )
      ? argv.slice(2)
      : argv;

  const args = normalizedArgs;
  const artifacts: Artifact[] = [];
  const goalParts: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--goal" || arg === "-g") {
      const nextValue = args[i + 1];
      if (nextValue && !nextValue.startsWith("-")) {
        goalParts.push(nextValue);
        i += 1;
      }
      continue;
    }

    if (arg === "--file" || arg === "-f" || arg === "--attach" || arg === "--attachment") {
      const nextValue = args[i + 1];
      if (nextValue && !nextValue.startsWith("-")) {
        const resolved = path.resolve(nextValue);
        if (fs.existsSync(resolved)) {
          artifacts.push({
            id: crypto.randomUUID(),
            name: path.basename(resolved),
            type: detectArtifactType(resolved),
            path: nextValue,
            source: "user",
          });
        }
        i += 1;
      }
      continue;
    }

    if (!arg.startsWith("-") && arg.trim()) {
      goalParts.push(arg);
    }
  }

  const goal = goalParts.join(" ").trim();

  return {
    goal:
      goal || "Complete the task described by the provided files and instructions.",
    artifacts,
  };
}

function detectArtifactType(filePath: string): Artifact["type"] {
  const extension = path.extname(filePath).toLowerCase();

  if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".svg"].includes(extension)) {
    return "image";
  }

  if ([".pdf", ".doc", ".docx", ".txt", ".md", ".rtf"].includes(extension)) {
    return "document";
  }

  if ([".json", ".csv", ".yaml", ".yml", ".xml", ".html", ".zip"].includes(extension)) {
    return "data";
  }

  return "unknown";
}

export async function runTaskFromGoal(
  goal: string,
  artifacts: Artifact[] = []
): Promise<TaskState> {
  const registry = new CapabilityRegistry();

  registry.register({
    id: "read_file",
    name: "Read File",
    description: "Read the contents of a text file.",
    category: "observation",
    risk: "none",
    reversible: true,
    requiresApproval: false,
  });

  registry.register({
    id: "inspect_directory",
    name: "Inspect Directory",
    description: "List files and directories available in a location.",
    category: "observation",
    risk: "none",
    reversible: true,
    requiresApproval: false,
  });

  registry.register({
    id: "inspect_image",
    name: "Inspect Image",
    description: "Get metadata about an image file (dimensions, format, colors).",
    category: "observation",
    risk: "none",
    reversible: true,
    requiresApproval: false,
  });

  registry.register({
    id: "run_python",
    name: "Run Python",
    description: "Execute Python code.",
    category: "execution",
    risk: "low",
    reversible: true,
    requiresApproval: false,
  });

  registry.register({
    id: "process_image",
    name: "Process Image",
    description: "Transform an image file and produce a new image artifact.",
    category: "execution",
    risk: "low",
    reversible: true,
    requiresApproval: false,
  });

  registry.register({
    id: "modify_file",
    name: "Modify File",
    description: "Create or modify a file.",
    category: "execution",
    risk: "medium",
    reversible: true,
    requiresApproval: true,
  });

  registry.register({
    id: "delete_file",
    name: "Delete File",
    description: "Delete a file from the filesystem.",
    category: "execution",
    risk: "high",
    reversible: false,
    requiresApproval: true,
  });

  registry.register({
    id: "run_tests",
    name: "Run Tests",
    description: "Discover and report on test files in the project.",
    category: "observation",
    risk: "none",
    reversible: true,
    requiresApproval: false,
  });

  registry.register({
    id: "inspect_logs",
    name: "Inspect Logs",
    description: "Read and analyze application log files.",
    category: "observation",
    risk: "none",
    reversible: true,
    requiresApproval: false,
  });

  const riskEngine = new RiskEngine();
  const executor = new Executor(registry, riskEngine);
  const supervisor = new Supervisor(executor, registry);

  const task = await supervisor.startTask(goal, artifacts);

  while (task.status === "executing") {
    await supervisor.executeNextStep(task);
  }

  return task;
}

export async function promptForTask(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Task: ", (answer) => {
      rl.close();
      resolve(answer.trim() || "Make a passport photo from this image");
    });
  });
}
