export type ProjectAnalysis = {
    score: number;
    relevanceSummary: string;
    detectedTechnologies: string[];
    strengths: string[];
    missingSkills: string[];
    recommendations: string[];
    nextProjectIdeas: string[];
    interviewQuestions: string[];
};

export async function analyzeGitHubProject(input: { project: unknown; targetCompany: string | null; targetRole: string }): Promise<ProjectAnalysis> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not configured");
    const models = Array.from(new Set([process.env.GEMINI_MODEL, "gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-3-flash-preview"].filter(Boolean))) as string[];
    const prompt = `Analyze this public GitHub project for a student targeting ${input.targetRole} at ${input.targetCompany || "any company"}. Do not invent facts. Base the response only on the repository metadata and scan context. Explain whether it supports the student's learning journey, what skills to learn next, and project ideas to build next. Repository context:\n${JSON.stringify(input.project).slice(0, 45000)}`;
    let response: Response | null = null;
    let lastError = "No response from Gemini";
    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
            systemInstruction: { parts: [{ text: "You are a practical placement project reviewer. Return only valid JSON." }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: {
                score: { type: "INTEGER", minimum: 0, maximum: 100 }, relevanceSummary: { type: "STRING" }, detectedTechnologies: { type: "ARRAY", items: { type: "STRING" } }, strengths: { type: "ARRAY", items: { type: "STRING" } }, missingSkills: { type: "ARRAY", items: { type: "STRING" } }, recommendations: { type: "ARRAY", items: { type: "STRING" } }, nextProjectIdeas: { type: "ARRAY", items: { type: "STRING" } }, interviewQuestions: { type: "ARRAY", items: { type: "STRING" } },
            }, required: ["score", "relevanceSummary", "detectedTechnologies", "strengths", "missingSkills", "recommendations", "nextProjectIdeas", "interviewQuestions"] } },
        }),
        });
        if (response.ok) break;
        lastError = `${model}: ${response.status} ${(await response.text()).slice(0, 300)}`;
        if (![429, 500, 502, 503, 504].includes(response.status)) break;
        await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
      }
      if (response?.ok) break;
    }
    if (!response || !response.ok) throw new Error(`Gemini project analysis failed: ${lastError}`);
    const payload = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned an empty project analysis");
    return JSON.parse(text) as ProjectAnalysis;
}
