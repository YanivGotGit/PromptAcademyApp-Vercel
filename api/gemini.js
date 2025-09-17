const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { prompt, type = 'generate' } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({ error: "API key is not configured." });
    }
    
    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required." });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    
    if (type === 'identify_persona') {
      // --- Stage 1: Identify Persona with an improved few-shot prompt ---
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
      
      const personaIdentificationPrompt = `Your task is to identify a specific persona from the user's request.
Rules:
1. You MUST identify specific, iconic figures from direct or indirect descriptions.
2. If no specific figure is implied, identify the general role or style.
3. Return ONLY the resulting name or style in English.

Example 1:
User request: "Write about war in the style of War and Peace"
Output: Leo Tolstoy

Example 2:
User request: "Answer as Plato's student and successor"
Output: Aristotle

User request: "${prompt}"
Output:`;
      
      const personaResult = await model.generateContent(personaIdentificationPrompt);
      const englishPersona = personaResult.response.text().trim();

      // --- Stage 2: Translate to standard Hebrew using JSON mode ---
      const modelForJson = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash-latest",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0
        }
      });
      
      const translationPrompt = `Return a JSON object with a single key "translation". The value must be the standard, common Hebrew spelling for the input phrase, without any vowel points (nikkud).

Example 1:
Input: "Plato"
Output: { "translation": "אפלטון" }

Example 2:
Input: "Aristotle"
Output: { "translation": "אריסטו" }

Input: "${englishPersona}"
Output:`;

      const translationResult = await modelForJson.generateContent(translationPrompt);
      const jsonResponseText = translationResult.response.text();
      const hebrewPersona = JSON.parse(jsonResponseText).translation;
      
      return res.status(200).json({ text: hebrewPersona.trim() });

    } else {
      // Default behavior for other requests
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return res.status(200).json({ text });
    }

  } catch (error) {
    console.error("Error in Vercel function:", error);
    const errorMessage = error.message || "An unknown error occurred.";
    return res.status(500).json({ error: errorMessage });
  }
};
