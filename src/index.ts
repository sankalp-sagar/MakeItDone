// src/index.ts

import { Supervisor } from "./supervisor/supervisor";
import { CapabilityRegistry } from "./capabilities/registry";
import { RiskEngine } from "./safety/risk-engine";

const registry = new CapabilityRegistry();

registry.register({
  id: "read_file",
  name: "Read File",
  description: "Read the contents of a file.",
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
  id: "run_python",
  name: "Run Python",
  description: "Execute Python code in an isolated environment.",
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

const supervisor = new Supervisor();

const task = supervisor.startTask(
  "Make a passport photo from this image"
);

console.log("TASK:");
console.log(task);

console.log("\nAVAILABLE CAPABILITIES:");

for (const capability of registry.getAll()) {
  console.log(
    `- ${capability.name} (${capability.risk} risk)`
  );
}

const riskEngine = new RiskEngine();

console.log("\nRISK EVALUATION:");

for (const capability of registry.getAll()) {
  const evaluation = riskEngine.evaluate(capability);

  console.log(
    `- ${capability.name}: ${evaluation.decision} — ${evaluation.reason}`
  );
}