type ChromeLanguageModel = {
  availability: (options?: unknown) => Promise<string>;
  create: (options?: unknown) => Promise<{ prompt: (input: string) => Promise<string>; destroy?: () => void }>;
};

function getLanguageModel(): ChromeLanguageModel | null {
  return (globalThis as unknown as { LanguageModel?: ChromeLanguageModel }).LanguageModel ?? null;
}

export async function askChromeGemini(question: string, context: string) {
  const languageModel = getLanguageModel();
  if (!languageModel) throw new Error("Chrome Gemini Nano Prompt API is unavailable");

  const availability = await languageModel.availability();
  if (availability === "unavailable") throw new Error("Gemini Nano is unavailable on this device");

  const session = await languageModel.create({
    initialPrompts: [{
      role: "system",
      content: "You are SmartPrep Placement Coach. Use only the supplied student data. Never ask for profile URLs already stored in the data and never invent scores.",
    }],
  });

  try {
    return await session.prompt(`Student data:\n${context}\n\nStudent question:\n${question}`);
  } finally {
    session.destroy?.();
  }
}
