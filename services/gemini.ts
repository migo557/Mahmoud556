/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Using gemini-2.5-pro for complex coding tasks.
const APP_MODEL = 'gemini-3-pro-preview';
const VIDEO_MODEL = 'veo-3.1-fast-generate-preview';

const APP_SYSTEM_INSTRUCTION = `You are an expert AI Engineer and Product Designer specializing in "bringing artifacts to life".
Your goal is to take a user uploaded file—which might be a polished UI design, a messy napkin sketch, a photo of a whiteboard with jumbled notes, or a picture of a real-world object (like a messy desk)—and instantly generate a fully functional, interactive, single-page HTML/JS/CSS application.

CORE DIRECTIVES:
1. **Analyze & Abstract**: Look at the image.
    - **Sketches/Wireframes**: Detect buttons, inputs, and layout. Turn them into a modern, clean UI.
    - **Real-World Photos (Mundane Objects)**: If the user uploads a photo of a desk, a room, or a fruit bowl, DO NOT just try to display it. **Gamify it** or build a **Utility** around it.
      - *Cluttered Desk* -> Create a "Clean Up" game where clicking items (represented by emojis or SVG shapes) clears them, or a Trello-style board.
      - *Fruit Bowl* -> A nutrition tracker or a still-life painting app.
    - **Documents/Forms**: specific interactive wizards or dashboards.

2. **NO EXTERNAL IMAGES**:
    - **CRITICAL**: Do NOT use <img src="..."> with external URLs (like imgur, placeholder.com, or generic internet URLs). They will fail.
    - **INSTEAD**: Use **CSS shapes**, **inline SVGs**, **Emojis**, or **CSS gradients** to visually represent the elements you see in the input.
    - If you see a "coffee cup" in the input, render a ☕ emoji or draw a cup with CSS. Do not try to load a jpg of a coffee cup.

3. **Make it Interactive**: The output MUST NOT be static. It needs buttons, sliders, drag-and-drop, or dynamic visualizations.
4. **Self-Contained**: The output must be a single HTML file with embedded CSS (<style>) and JavaScript (<script>). No external dependencies unless absolutely necessary (Tailwind via CDN is allowed).
5. **Robust & Creative**: If the input is messy or ambiguous, generate a "best guess" creative interpretation. Never return an error. Build *something* fun and functional.

RESPONSE FORMAT:
Return ONLY the raw HTML code. Do not wrap it in markdown code blocks (\`\`\`html ... \`\`\`). Start immediately with <!DOCTYPE html>.`;

export async function bringToLife(prompt: string, fileBase64?: string, mimeType?: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];
  
  const finalPrompt = fileBase64 
    ? "Analyze this image/document. Detect what functionality is implied. If it is a real-world object (like a desk), gamify it (e.g., a cleanup game). Build a fully interactive web app. IMPORTANT: Do NOT use external image URLs. Recreate the visuals using CSS, SVGs, or Emojis." 
    : prompt || "Create a demo app that shows off your capabilities.";

  parts.push({ text: finalPrompt });

  if (fileBase64 && mimeType) {
    parts.push({
      inlineData: {
        data: fileBase64,
        mimeType: mimeType,
      },
    });
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: APP_MODEL,
      contents: {
        parts: parts
      },
      config: {
        systemInstruction: APP_SYSTEM_INSTRUCTION,
        temperature: 0.5,
      },
    });

    let text = response.text || "<!-- Failed to generate content -->";
    text = text.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');
    return text;
  } catch (error) {
    console.error("Gemini App Generation Error:", error);
    throw error;
  }
}

export async function bringToLifeAsVideo(prompt: string, fileBase64?: string, mimeType?: string): Promise<string> {
  // Veo requires creating a new instance just before the call to ensure the latest API key is used.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    let operation = await ai.models.generateVideos({
      model: VIDEO_MODEL,
      prompt: prompt,
      ...(fileBase64 && mimeType && {
        image: {
          imageBytes: fileBase64,
          mimeType: mimeType,
        },
      }),
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    console.log("Video generation started, polling for completion...");

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
      console.log("Polling video status...", operation.status);
    }

    if (operation.status?.state === 'FAILED') {
      throw new Error(`Video generation failed: ${operation.status.error?.message}`);
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error("Video generation succeeded, but no download link was found.");
    }

    // Append API key to the URI for authentication
    const videoRes = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoRes.ok) {
      throw new Error(`Failed to download video file: ${videoRes.statusText}`);
    }

    const videoBlob = await videoRes.blob();
    return URL.createObjectURL(videoBlob);

  } catch (error) {
    console.error("Gemini Video Generation Error:", error);
    if (error instanceof Error && error.message.includes("Requested entity was not found.")) {
      // This specific error suggests an issue with the user-provided API key.
      // We re-throw it so the UI can prompt the user to select a new key.
      throw new Error("API key not found. Please re-select your API key and try again.");
    }
    throw error;
  }
}