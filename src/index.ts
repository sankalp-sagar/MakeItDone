import "dotenv/config";

import {
  Supervisor,
} from "./supervisor/supervisor";

import {
  Executor,
} from "./supervisor/executor";

import {
  CapabilityRegistry,
} from "./capabilities/registry";

import {
  RiskEngine,
} from "./safety/risk-engine";

import {
  Artifact,
} from "./supervisor/state";

async function main() {
  const registry =
    new CapabilityRegistry();

  registry.register({
    id: "read_file",

    name: "Read File",

    description:
      "Read the contents of a text file.",

    category: "observation",

    risk: "none",

    reversible: true,

    requiresApproval: false,
  });

  registry.register({
    id: "inspect_directory",

    name: "Inspect Directory",

    description:
      "List files and directories available in a location.",

    category: "observation",

    risk: "none",

    reversible: true,

    requiresApproval: false,
  });

  registry.register({
    id: "run_python",

    name: "Run Python",

    description:
      "Execute Python code.",

    category: "execution",

    risk: "low",

    reversible: true,

    requiresApproval: false,
  });

  registry.register({
    id: "process_image",

    name: "Process Image",

    description:
      "Transform an image file and produce a new image artifact.",

    category: "execution",

    risk: "low",

    reversible: true,

    requiresApproval: false,
  });

  registry.register({
    id: "modify_file",

    name: "Modify File",

    description:
      "Create or modify a file.",

    category: "execution",

    risk: "medium",

    reversible: true,

    requiresApproval: true,
  });

  registry.register({
    id: "delete_file",

    name: "Delete File",

    description:
      "Delete a file from the filesystem.",

    category: "execution",

    risk: "high",

    reversible: false,

    requiresApproval: true,
  });

  const riskEngine =
    new RiskEngine();

  const executor =
    new Executor(
      registry,
      riskEngine
    );

  const supervisor =
    new Supervisor(
      executor,
      registry
    );

  const userArtifacts: Artifact[] = [
    {
      id: crypto.randomUUID(),

      name: "input.jpg",

      type: "image",

      path:
        "./test-assets/input.jpg",

      source: "user",
    },
  ];

  const task =
    await supervisor.startTask(
      "Make a passport photo from this image",
      userArtifacts
    );

  console.log(
    "\nINITIAL TASK:"
  );

  console.dir(task, {
    depth: null,
  });

  console.log(
    "\nRUNNING AGENT:"
  );

  while (
    task.status ===
    "executing"
  ) {
    await supervisor.executeNextStep(
      task
    );
  }

  console.log(
    "\nFINAL STATE:"
  );

  console.dir(task, {
    depth: null,
  });
}

main().catch((error) => {
  console.error(
    "Agent failed:",
    error
  );

  process.exit(1);
});