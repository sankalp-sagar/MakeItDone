import { CapabilityRegistry } from "./capabilities/registry";
import { RiskEngine } from "./safety/risk-engine";
import { Executor } from "./supervisor/executor";
import { Supervisor } from "./supervisor/supervisor";
import { Artifact, TaskState } from "./supervisor/state";
import * as readline from "node:readline";

export function parseTaskInput(argv: string[]): string {
  const args = argv.slice(2);

  const goalFlagIndex = args.findIndex(
    (arg) => arg === "--goal" || arg === "-g"
  );

  if (goalFlagIndex !== -1) {
    const nextValue = args[goalFlagIndex + 1];
    if (nextValue) {
      return nextValue;
    }
  }

  const positional = args.filter(
    (arg) => !arg.startsWith("--") && !arg.startsWith("-")
  );

  if (positional.length > 0) {
    return positional.join(" ");
  }

  return "Make a passport photo from this image";
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
