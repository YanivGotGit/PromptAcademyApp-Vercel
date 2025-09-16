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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    
    if (type === 'identify_persona') {
      // Step 1: Create a prompt to identify the persona in English
      const personaIdentificationPrompt = `Analyze the user request and identify the most suitable persona or style. Return ONLY the name of the persona/style in English (e.g., "Greek epic poet", "a pirate"). User request: "${prompt}"`;
      
      // Step 2: Call the model to get the English persona
      const personaResult = await model.generateContent(personaIdentificationPrompt);
      const englishPersona = personaResult.response.text().trim();

      // Step 3: Create a new prompt to translate the identified persona to Hebrew
      const translationPrompt = `Translate the following phrase to Hebrew: "${englishPersona}"`;

      // Step 4: Call the model again to get the Hebrew translation
      const translationResult = await model.generateContent(translationPrompt);
      const hebrewPersona = translationResult.response.text().trim();
      
      // Step 5: Return the final Hebrew persona to the client
      return res.status(200).json({ text: hebrewPersona });

    } else {
      // Default behavior for other requests (e.g., Quick Builder)
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return res.status(200).json({ text });
    }

  } catch (error) {
    console.error("Error in Vercel function:", error);
    return res.status(500).json({ error: error.message });
  }
};
