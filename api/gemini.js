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
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      generationConfig: { temperature: 0.1 }
    });

    if (type === 'identify_persona') {
      const personaIdentificationPrompt = `You are an expert in identifying professional personas and historical figures from user requests. Your task is to identify the most appropriate specific persona or professional role from the user's description.

CRITICAL RULES:
1. Output ONLY the persona name or professional role in English - no explanations or additional text
2. Prioritize specific, iconic figures when directly or indirectly referenced
3. If no specific figure is implied, identify the most precise professional role or expertise area
4. Focus on human expertise and professions, not machinery or objects
5. Consider the professional domain accurately (e.g., "גלידה" = culinary expert/artisan, not ice cream machine)

Examples:
User request: "Write about war in the style of War and Peace" → Output: Leo Tolstoy
User request: "Answer as Plato's student and successor" → Output: Aristotle  
User request: "Help with gourmet ice cream making" → Output: Pastry Chef
User request: "Teaching children about nature" → Output: Science Educator

User request: "${prompt}"

Output:`;

      const personaResult = await model.generateContent(personaIdentificationPrompt);
      const englishPersona = personaResult.response.text().trim();

      const modelForJson = genAI.getGenerativeModel({ 
        model: "gemini-2.5-pro", 
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 } 
      });
      const translationPrompt = `You are a professional translator specializing in accurate Hebrew translations. Return a JSON object with a single key "translation" containing the standard, common Hebrew spelling for the input phrase, without vowel points (nikkud).

RULES:
- Use the most common and recognized Hebrew spelling
- No vowel points (nikkud)
- Professional and formal terminology when applicable

Examples:
Input: "Plato" → {"translation": "אפלטון"}
Input: "Aristotle" → {"translation": "אריסטו"}
Input: "Pastry Chef" → {"translation": "שף קונדיטור"}

Input: "${englishPersona}"

Output:`;
      
      const translationResult = await modelForJson.generateContent(translationPrompt);
      const jsonResponseText = translationResult.response.text();
      const hebrewPersona = JSON.parse(jsonResponseText).translation;
      
      return res.status(200).json({ text: hebrewPersona.trim() });

    } else if (type === 'refine_task') {
      const refineTaskPrompt = `You are a world-class prompt engineering expert specializing in pedagogical approaches. Your task is to transform a user's raw request into a detailed, clear, and effective mission statement for an AI model.

CRITICAL RULES:
1. Output ONLY the refined mission paragraph in Hebrew - no introductions, explanations, or meta-commentary  
2. The result must be a direct task description for an AI model, not an explanation to the user
3. Write in fluent, professional Hebrew
4. Integrate the audience naturally into the task description
5. Identify professional domains accurately (e.g., "גלידה" = culinary arts, not machinery)

The refined mission should:
- Clearly state the main goal as a direct instruction
- Integrate the target audience naturally 
- Add relevant context, constraints, and quality standards
- Be specific and actionable for an AI model
- Maintain professional tone appropriate to the domain

User's raw request: "${prompt}"

Output (Hebrew mission paragraph only):`;
      
      const result = await model.generateContent(refineTaskPrompt);
      const text = result.response.text();
      return res.status(200).json({ text: text.trim() });

    } else {
      // Quick Builder - Enhanced meta-prompt
      const improvedMetaPrompt = `You are a world-class prompt engineering expert. Your task is to transform a user's raw Hebrew request into a professional, detailed, and effective Hebrew prompt that will be sent directly to an AI model.

CRITICAL RULES:
1. Output ONLY the final prompt - no explanations, introductions, or meta-commentary
2. The result must be a direct command to an AI model, not a description for the user
3. Use "אתה" (you) and "עליך" (you must) when addressing the model in Hebrew
4. Identify professional domains accurately (e.g., "גלידה" = culinary arts/artisanship, not machinery)
5. Write the entire prompt in fluent, professional Hebrew

Required prompt structure:
- Clear role/persona definition for the model (אתה [professional role])
- Detailed task specification with context
- Target audience definition (if relevant)  
- Instructions for structure, tone, and response style
- Specific quality standards and constraints

Examples:

User request: "אני רוצה עזרה עם גלידה גורמה"
Correct output:
"אתה שף קונדיטור מומחה ואמן גלידה המתמחה בגלידות גורמה איכותיות. עליך לספק מדריך מקצועי ומעמיק עבור גלידאי ביתי מנוסה המבקש לשפר את מיומנותו ולהכין גלידות ברמה מקצועית. התמקד בטכניקות מתקדמות, מרכיבים איכותיים וחדשניים, שילובי טעמים מעודנים, וטמפרטורות עבודה מדויקות. ספק הוראות שלב אחר שלב עם הסברים מדעיים לתהליכים הכימיים והפיזיים המתרחשים."

User request: "עזור לי ללמד ילדים על מדעי הטבע"  
Correct output:
"אתה מחנך מדעים מנוסה ובעל התמחות בהוראת מדעי הטבע לילדים בגילאי 6-12. עליך להכין חומרי לימוד מרתקים, אינטראקטיביים ומתאימים לגיל שהופכים מושגים מדעיים מורכבים לנגישים וכיפיים. השתמש באנלוגיות מהחיים, פעילויות מעשיות hands-on, ניסויים פשוטים ובטוחים, וסיפורים שיעוררו סקרנות טבעית ויעמיקו הבנה. הקפד על שפה ברורה ופשוטה עם דוגמאות קונקרטיות מהסביבה המוכרת לילדים."

User's request: "${prompt}"

Output (Hebrew prompt only):`;

      const result = await model.generateContent(improvedMetaPrompt);
      const text = result.response.text();
      return res.status(200).json({ text });
    }

  } catch (error) {
    console.error("Error in Vercel function:", error);
    const errorMessage = error.message || "An unknown error occurred.";
    return res.status(500).json({ error: errorMessage });
  }
};
