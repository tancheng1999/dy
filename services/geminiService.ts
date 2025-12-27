
import { GoogleGenAI, Type } from "@google/genai";
import { AppFunction, AnalysisResult } from "../types";

export const analyzeQuery = async (
  query: string,
  existingFunctions: AppFunction[]
): Promise<AnalysisResult> => {
  // Always use process.env.API_KEY directly when initializing.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // We provide a condensed version of the database to the AI to stay within context limits
  const contextData = existingFunctions.map(f => ({
    id: f.id,
    app: f.appName,
    func: f.functionName,
    queries: f.exampleQueries
  }));

  const systemInstruction = `
    You are an AI assistant specializing in mobile app automation. 
    Your task is to determine if a new user query matches an existing defined app function.
    
    Match Criteria:
    - Semantic Similarity: Even if words are different, does the intent match an existing function?
    - App Context: Is the app mentioned or implied the same as a defined function?
    - Specificity: A match must be highly specific to the function's purpose.

    Definitions provided in the JSON list.
  `;

  const prompt = `
    User Query: "${query}"
    
    Existing Functions Database (partial/relevant):
    ${JSON.stringify(contextData.slice(0, 100))}
    
    Analyze if the user query is already covered by any of these definitions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isDefined: { type: Type.BOOLEAN },
            matchScore: { type: Type.NUMBER, description: "0 to 1 for confidence level" },
            matchedFunctionId: { type: Type.STRING, description: "The ID of the matched function if isDefined is true" },
            reasoning: { type: Type.STRING },
            suggestedImprovement: { type: Type.STRING }
          },
          required: ["isDefined", "matchScore", "reasoning"]
        }
      }
    });

    // Extracting text output from GenerateContentResponse using the .text property (not a method).
    const text = response.text || '{}';
    const result = JSON.parse(text);
    const matchedFunction = result.matchedFunctionId 
      ? existingFunctions.find(f => f.id === result.matchedFunctionId)
      : undefined;

    return {
      isDefined: result.isDefined,
      matchScore: result.matchScore,
      matchedFunction,
      reasoning: result.reasoning,
      suggestedImprovement: result.suggestedImprovement
    };
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
