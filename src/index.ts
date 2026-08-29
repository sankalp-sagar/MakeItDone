import "dotenv/config";

import { runTaskFromGoal } from "./task-runner";

async function main() {
  const goal =
    process.argv.slice(2).join(" ") ||
    "Make a passport photo from this image";

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