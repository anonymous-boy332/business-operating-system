export class GroqApiError extends Error {
    constructor(message, status = 502) {
        super(message);
        this.name = "GroqApiError";
        this.status = status;
    }
}

export async function generateGroqText(systemPrompt, userPrompt) {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
        throw new GroqApiError("AI generation is not configured. Set AI_API_KEY in the server environment.", 503);
    }
    if (typeof userPrompt !== "string" || !userPrompt.trim()) {
        throw new GroqApiError("A prompt is required.", 400);
    }
    if (userPrompt.length > 20000) {
        throw new GroqApiError("The request is too long. Shorten it and try again.", 413);
    }

    let response;
    try {
        response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                authorization: `Bearer ${apiKey}`,
                "content-type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ]
            }),
            signal: AbortSignal.timeout(30000)
        });
    } catch (error) {
        const status = error?.name === "TimeoutError" ? 504 : 502;
        throw new GroqApiError(status === 504
            ? "AI provider timed out. Please try again."
            : "Could not reach the AI provider. Please try again.", status);
    }

    const responseText = await response.text();
    let data;
    try {
        data = responseText ? JSON.parse(responseText) : null;
    } catch {
        throw new GroqApiError("AI provider returned an invalid response.", 502);
    }
    if (!response.ok) {
        const status = response.status === 429 ? 429 : response.status >= 500 ? 502 : 400;
        throw new GroqApiError(data?.error?.message || "AI provider could not complete this request.", status);
    }

    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
        throw new GroqApiError("AI provider returned an empty response.", 502);
    }
    return text;
}

export function sendGroqError(res, error) {
    const status = Number.isInteger(error?.status) ? error.status : 502;
    console.error("[AI provider]", error);
    return res.status(status).json({ error: error?.message || "AI generation failed." });
}
