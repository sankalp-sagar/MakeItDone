import "dotenv/config";

import OpenAI from "openai";

export function buildMissingApiKeyMessage(): string {
  return "OPENROUTER_API_KEY is not set. Add it to your .env file, for example: OPENROUTER_API_KEY=your_key";
}

export function getLlmClient() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(buildMissingApiKeyMessage());
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });
}