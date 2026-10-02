// DRIP CHECK: free outfit rating with Google Gemini.
// Runs on Vercel. The key is read from the GEMINI_API_KEY environment variable.

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

const SYSTEM = `You are the AI stylist for a fashion website called Drip Check.
Look at the photo and rate ONLY the outfit: clothes, colours, fit, shoes, accessories and overall styling.
Never comment on the person's face, body, weight, skin, age or attractiveness.
Be honest but kind and encouraging. Give specific, practical advice.
Reply with ONLY a JSON object in exactly this shape:
{
  "isOutfit": true or false (false if the photo has no visible outfit),
  "score": number from 1 to 10 with one decimal,
  "title": short punchy verdict in capitals ending with ✦ (max 4 words),
  "description": one friendly sentence summing up the look,
  "categories": { "fit": 1-10, "colour": 1-10, "shoes": 1-10, "accessories": 1-10, "vibe": 1-10 },
  "working": one sentence on what works best,
  "improve": one sentence with the most useful way to level it up
}
If shoes or accessories are not visible, still give a fair estimate and say so in "improve".`;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST." });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "The server is missing its API key." });
  }

  try {
    const image = req.body && req.body.image;
    const match = typeof image === "string" && image.match(/^data:image\/jpeg;base64,(.+)$/);
    if (!match) return res.status(400).json({ error: "Please upload a valid photo." });

    const apiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{
            parts: [
              { inline_data: { mime_type: "image/jpeg", data: match[1] } },
              { text: "Rate this outfit." }
            ]
          }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
        })
      }
    );

    if (apiRes.status === 429) {
      return res.status(429).json({ error: "Lots of people are rating outfits right now. Please try again in a minute." });
    }

    const data = await apiRes.json();
    if (!apiRes.ok) {
      console.error("Gemini error:", JSON.stringify(data));
      return res.status(502).json({ error: "The AI stylist is unavailable right now. Please try again." });
    }

    const text = data.candidates[0].content.parts.map(function (p) { return p.text || ""; }).join("");
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return res.status(200).json(json);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Couldn't rate that photo. Please try again." });
  }
};
