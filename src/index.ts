import "dotenv/config";

import {
  isDangerousRequest,
  parseTaskInput,
  promptForTask,
  runTaskFromGoal,
} from "./task-runner";

async function main() {
  const rawArgs = process.argv.slice(2);
  const parsedInput =
    rawArgs.length > 0
      ? parseTaskInput(process.argv)
      : {
          goal: await promptForTask(),
          artifacts: [],
        };

  if (isDangerousRequest(parsedInput.goal)) {
    const shouldProceed = await promptForConfirmation(
      "This request looks dangerous. Do you want to proceed? (yes/no)"
    );

    if (!shouldProceed) {
      console.log("Task cancelled.");
      return;
    }
  }

  const task = await runTaskFromGoal(
    parsedInput.goal,
    parsedInput.artifacts
  );

  console.dir(task, { depth: null });
}

async function promptForConfirmation(question: string): Promise<boolean> {
  const readline = await import("node:readline/promises");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = (await rl.question(question + " ")).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error("Agent failed:", error);
  process.exit(1);
});