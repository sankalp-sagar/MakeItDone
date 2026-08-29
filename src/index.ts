import "dotenv/config";

import { parseTaskInput, promptForTask, runTaskFromGoal } from "./task-runner";

async function main() {
  const rawArgs = process.argv.slice(2);
  const goal = rawArgs.length > 0 ? parseTaskInput(process.argv) : await promptForTask();

  const task = await runTaskFromGoal(goal, [
    {
      id: crypto.randomUUID(),
      name: "input.jpg",
      type: "image",
      path: "./test-assets/input.jpg",
      source: "user",
    },
  ]);

  console.dir(task, { depth: null });
}

main().catch((error) => {
  console.error("Agent failed:", error);
  process.exit(1);
});