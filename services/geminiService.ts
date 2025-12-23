import { GoogleGenAI, Type } from "@google/genai";
import { Attachment, Suggestion } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using Pro for complex creation/reasoning tasks
const CREATIVE_MODEL = 'gemini-3-pro-preview';
// Using Flash for fast, repetitive tasks or proactive checks
const FAST_MODEL = 'gemini-3-flash-preview';

/**
 * Generates a draft based on a prompt and optional file attachments.
 */
export const generateDraft = async (
  prompt: string,
  attachments: Attachment[]
): Promise<string> => {
  try {
    const parts: any[] = [];
    
    // Add attachments
    attachments.forEach(att => {
      // Remove data URL prefix if present for clean base64
      const base64Data = att.data.includes('base64,') 
        ? att.data.split('base64,')[1] 
        : att.data;

      parts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: base64Data
        }
      });
    });

    // Add text prompt
    parts.push({ text: `You are an expert writing partner. Write a high-quality draft based on the following instructions. \n\nInstructions: ${prompt}` });

    const response = await ai.models.generateContent({
      model: CREATIVE_MODEL,
      contents: { parts },
      config: {
        systemInstruction: "You are a professional, articulate, and creative writer. Output only the content requested, do not add conversational filler.",
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Draft generation error:", error);
    throw error;
  }
};

/**
 * Refines specific selected text based on user instruction.
 */
export const refineSelection = async (
  selection: string,
  fullContext: string,
  instruction: string
): Promise<string> => {
  try {
    const prompt = `
      I have a document. I have selected a specific part of it to edit.
      
      FULL DOCUMENT CONTEXT:
      "${fullContext.substring(0, 2000)}..." (truncated for brevity)
      
      SELECTED TEXT TO CHANGE:
      "${selection}"
      
      USER INSTRUCTION:
      ${instruction}
      
      TASK:
      Rewrite the SELECTED TEXT based on the USER INSTRUCTION. Ensure it flows well with the context. Return ONLY the rewritten text. Do not include quotes unless they are part of the text.
    `;

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
    });

    return response.text?.trim() || selection;
  } catch (error) {
    console.error("Refine selection error:", error);
    throw error;
  }
};

/**
 * Proactively analyzes the text to offer suggestions.
 * Returns structured JSON data.
 */
export const analyzeContentForSuggestions = async (
  content: string
): Promise<Suggestion[]> => {
  if (!content || content.length < 50) return [];

  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: `Analyze the following text and provide 3 brief, high-value suggestions to improve it. Focus on clarity, tone, flow, or grammar.
      
      Text:
      ${content.substring(0, 5000)}`, // Limit context for speed/cost
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ['grammar', 'style', 'tone', 'idea'] },
              text: { type: Type.STRING, description: "A short title for the suggestion" },
              explanation: { type: Type.STRING, description: "Detailed reason and suggested change" },
              context: { type: Type.STRING, description: "The specific snippet of text this applies to (optional)" }
            },
            required: ['type', 'text', 'explanation']
          }
        }
      }
    });

    const jsonStr = response.text || "[]";
    const rawData = JSON.parse(jsonStr);
    
    // Add IDs
    return rawData.map((item: any, index: number) => ({
      ...item,
      id: `sugg-${Date.now()}-${index}`
    }));

  } catch (error) {
    console.error("Analysis error:", error);
    return [];
  }
};
