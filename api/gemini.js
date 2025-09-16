const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // Body can now contain 'prompt' and an optional 'type'
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
    
    let finalPrompt;
    
    // Switch logic based on the request type
    if (type === 'identify_persona') {
      // If the goal is to identify a persona, we create a specific meta-prompt
      // that wraps the user's original request.
      finalPrompt = `Analyze the following user request and identify the most suitable persona, character, or specific style for generating a response.
      Return ONLY the name of the persona or style, in 1-5 words.
      For example, if the user asks for a poem about a mythological hero, you could return "Greek epic poet" or "Homer".
      If the user asks to explain a concept like a pirate, return "a pirate".

      User request: "${prompt}"

      Identified Persona/Style:`;

    } else {
      // Default behavior: use the prompt as is (for the Quick Builder, etc.)
      finalPrompt = prompt;
    }

    const result = await model.generateContent(finalPrompt);
    const response = result.response;
    const text = response.text();

    return res.status(200).json({ text });

  } catch (error) {
    console.error("Error in Vercel function:", error);
    return res.status(500).json({ error: error.message });
  }
};
