
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ParsedDocument } from "../types";
import { SAMPLE_PROMPT } from "../constants";

// NOTE: In a real app, ensure this key is available via environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'YOUR_API_KEY_HERE' });

// Helper function to repair truncated or malformed JSON responses
const repairJSON = (jsonStr: string): string => {
  let repaired = jsonStr.trim();
  
  // 0. Sanitize Backslashes: Fix "Bad escaped character" errors.
  // Replace backslashes that are NOT followed by valid JSON escape characters (", \, /, b, f, n, r, t, u)
  // with double backslashes. This fixes things like LaTeX (\frac) or paths (C:\) appearing in text.
  // Note: This leaves \u alone, which might still fail if not followed by 4 hex digits, but covers 99% of errors.
  repaired = repaired.replace(/\\(?![/u"\\bfnrt])/g, '\\\\');

  // 1. Handle unclosed strings (odd number of quotes)
  const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    repaired += '"';
  }

  // 2. Handle unclosed brackets/braces
  const stack: string[] = [];
  let insideString = false;
  
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    
    // Toggle string state
    if (char === '"' && (i === 0 || repaired[i-1] !== '\\')) {
        insideString = !insideString;
        continue;
    }
    
    if (insideString) continue;

    if (char === '{') {
      stack.push('}');
    } else if (char === '[') {
      stack.push(']');
    } else if (char === '}' || char === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === char) {
        stack.pop();
      }
    }
  }

  // Append missing closing brackets in reverse order
  while (stack.length > 0) {
    repaired += stack.pop();
  }

  return repaired;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeDocument = async (
  fileData: string,
  mimeType: string
): Promise<ParsedDocument> => {
  const modelId = "gemini-3-pro-preview"; 
  let lastError: any;
  const maxRetries = 2; // Reduced retries to avoid extremely long waits for user

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Analyzing document (Attempt ${attempt}/${maxRetries})...`);
      
      const response = await ai.models.generateContent({
        model: modelId,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: fileData, 
              },
            },
            {
              text: SAMPLE_PROMPT + "\n\nIMPORTANT: Return ONLY valid JSON. Do not include markdown formatting like ```json ... ```.",
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from Gemini");

      // Clean up markdown code blocks if present
      const cleanText = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');

      try {
          return JSON.parse(cleanText) as ParsedDocument;
      } catch (parseError) {
          console.warn("JSON parse failed, attempting repair...", parseError);
          const repairedText = repairJSON(cleanText);
          try {
              return JSON.parse(repairedText) as ParsedDocument;
          } catch (repairError) {
               console.error("Failed to repair JSON:", repairError);
               throw new Error("The document analysis returned invalid data. Please try again or use a smaller document.");
          }
      }

    } catch (error: any) {
      console.warn(`Attempt ${attempt} failed:`, error);
      lastError = error;
      
      if (attempt < maxRetries) {
        const backoffTime = 2000 * attempt; 
        console.log(`Retrying in ${backoffTime}ms...`);
        await delay(backoffTime);
      }
    }
  }

  console.error("Gemini Analysis Failed after retries:", lastError);
  throw new Error("Failed to process document. The file might be too large or complex for the model at this time.");
};

// --- CHAT FUNCTIONALITY ---

export const createChatSession = (document: ParsedDocument): Chat => {
    // Prepare a compressed context string from the parsed document
    // Safe access defaults to prevent crashes if fields are missing
    const safeTitle = document.title?.original || 'Untitled';
    const safeSummary = document.mainSummary?.original || 'No summary';
    const safeSections = document.sections || [];

    const contextString = `
    You are an intelligent assistant helping a user understand a document.
    Here is the structured content of the document:
    
    Title: ${safeTitle}
    Summary: ${safeSummary}
    
    SECTIONS:
    ${safeSections.map((s, i) => `
    [Section ${i+1}] ${s.title?.original || 'Untitled'}
    Summary: ${s.summary?.original || 'No summary'}
    Content: ${(s.content?.original || '').substring(0, 3000)}... (truncated if too long)
    Key Points: ${(s.keyPoints?.original || []).join('; ')}
    `).join('\n')}
    
    Instructions:
    1. Answer questions strictly based on the provided document content.
    2. Be concise and helpful.
    3. If the answer is not in the document, say so.
    4. Use Markdown for formatting.
    `;

    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: contextString,
        }
    });
};
