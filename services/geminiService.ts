import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateCharacterProfile = async (
  name: string, 
  idea: string
): Promise<{ synopsis: string; openingLine: string; generatedName: string }> => {
  const ai = getAiClient();
  if (!ai) {
    throw new Error("AI Client not initialized");
  }

  const prompt = `
    Create a compelling character profile for a character named "${name}" based on this concept: "${idea}".
    
    Please generate:
    1. A sanitized character name (e.g., if input is "Tifa (FF7)", return "Tifa").
    2. A brief, engaging story synopsis (max 100 words).
    3. An immersive opening line for a roleplay conversation.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            generatedName: { type: Type.STRING, description: "The clean character name" },
            synopsis: { type: Type.STRING, description: "A short story summary" },
            openingLine: { type: Type.STRING, description: "First message from the character" }
          },
          required: ["generatedName", "synopsis", "openingLine"]
        }
      }
    });

    let text = response.text;
    if (!text) throw new Error("No response from AI");

    // Sanitize: Remove Markdown code blocks if present
    // Looks for ```json ... ``` or just ``` ... ``` and extracts the content
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      text = jsonMatch[1];
    } else {
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    }
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini generation error:", error);
    // Fallback for demo purposes if API fails or key is invalid
    return {
      generatedName: name,
      synopsis: "An mysterious aura surrounds this character. Their story is yet to be written, but their potential is limitless.",
      openingLine: "Hello... it seems fate has brought us together."
    };
  }
};