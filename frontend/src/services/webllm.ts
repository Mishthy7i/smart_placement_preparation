import { CreateMLCEngine, type MLCEngine } from "@mlc-ai/web-llm";

const MODEL_ID = "SmolLM2-135M-Instruct-q0f16-MLC";

let enginePromise: Promise<MLCEngine> | null = null;

export function loadWebLLM(onProgress?: (message: string) => void) {
  if (!enginePromise) {
    enginePromise = CreateMLCEngine(MODEL_ID, {
      initProgressCallback: (progress) => {
        onProgress?.(progress.text);
      },
    });
  }
  return enginePromise;
}

export async function askWebLLM(
  question: string,
  context: string,
  onProgress?: (message: string) => void
) {
  const engine = await loadWebLLM(onProgress);
  const response = await engine.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are SmartPrep Placement Coach. Give practical, concise and honest placement-preparation guidance. Use only the supplied student context. Never invent scores, skills or achievements.",
      },
      {
        role: "user",
        content: `Student context:\n${context}\n\nStudent question:\n${question}`,
      },
    ],
    temperature: 0.4,
    max_tokens: 600,
  });

  return response.choices[0]?.message.content || "I could not generate a response.";
}

export { MODEL_ID };
