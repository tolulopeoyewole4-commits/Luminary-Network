import { MockAIProvider } from "@/lib/ai/providers/mock";
import type { AIProvider } from "@/lib/ai/providers/types";

export function getAIProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER ?? "mock").toLowerCase();

  switch (provider) {
    case "mock":
      return new MockAIProvider();
    default:
      // Paid providers stay disabled until explicitly enabled.
      throw new Error(
        `AI provider "${provider}" is not enabled. Set AI_PROVIDER=mock for the MVP.`,
      );
  }
}
