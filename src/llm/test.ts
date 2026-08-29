import "dotenv/config";

import { getLlmClient } from "./client";

async function main() {
  const llm = getLlmClient();

  const response = await llm.chat.completions.create({
    model: "openrouter/free",
    messages: [
      {
        role: "user",
        content:
          "Reply with exactly: LLM connection made lesssgoooo",
      },
    ],
  });

  console.log(
    response.choices[0]?.message?.content
  );
}

main().catch((error) => {
  console.error(
    "LLM test failed:",
    error
  );

  process.exit(1);
});