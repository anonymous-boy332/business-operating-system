import { generateGroqText, sendGroqError } from "../lib/groq.js";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed." });
    }

    const message = String(req.body?.message || "").trim();
    if (!message) return res.status(400).json({ reply: "Enter a message first." });

    try {
        const reply = await generateGroqText(
            "You are Synvora AI. Help users with business, coding, AI, marketing, and productivity. Be clear and accurate.",
            message
        );
        return res.status(200).json({ reply });
    } catch (error) {
        const status = Number.isInteger(error?.status) ? error.status : 502;
        console.error("[AI chat]", error);
        return res.status(status).json({ reply: error.message || "AI chat failed." });
    }
}
