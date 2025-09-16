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
      // --- Stage 1: Identify Persona in English ---
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
      const personaIdentificationPrompt = `Analyze the user request and identify the most suitable persona or style. Return ONLY the name of the persona/style in English (e.g., "Greek epic poet", "a pirate"). User request: "${prompt}"`;
      const personaResult = await model.generateContent(personaIdentificationPrompt);
      const englishPersona = personaResult.response.text().trim();

      // --- Stage 2: Translate to Hebrew using JSON mode for clean output ---
      const modelForJson = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash-latest",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });
      
      const translationPrompt = `Return a JSON object with a single key "translation" containing the Hebrew translation of this phrase: "${englishPersona}"`;

      const translationResult = await modelForJson.generateContent(translationPrompt);
      const jsonResponseText = translationResult.response.text();
      const hebrewPersona = JSON.parse(jsonResponseText).translation;
      
      return res.status(200).json({ text: hebrewPersona.trim() });

    } else {
      // Default behavior for other requests (e.g., Quick Builder)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return res.status(200).json({ text });
    }

  } catch (error) {
    console.error("Error in Vercel function:", error);
    // Ensure the error response is also in JSON format for consistency
    const errorMessage = error.message || "An unknown error occurred.";
    return res.status(500).json({ error: errorMessage });
  }
};
