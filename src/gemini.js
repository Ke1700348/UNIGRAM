import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const modelName = "gemini-3.1-flash-preview";

export async function generateCaption(base64Image, mimeType) {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            text: "You are a Gen Z social media expert. Look at this image and write a short, raw, authentic caption for a post. Max 2 sentences. No hashtags. Keep it real and unpolished.",
          },
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
        ],
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error generating caption:", error);
    return "";
  }
}

export async function suggestHashtags(postText) {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Given this social media post: '${postText}'. Suggest 5 trending relevant hashtags. Return only the hashtags separated by commas, no # symbol, lowercase.`,
    });
    const tags = response.text.split(',').map(tag => tag.trim().toLowerCase());
    return tags.slice(0, 5);
  } catch (error) {
    console.error("Error suggesting hashtags:", error);
    return [];
  }
}

export async function classifyVibe(postText) {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Classify this post into exactly one of these vibes: spicy, dark, real, funny, aesthetic, random. Post: '${postText}'. Return only the single word.`,
    });
    return response.text.trim().toLowerCase();
  } catch (error) {
    console.error("Error classifying vibe:", error);
    return "random";
  }
}

export async function semanticSearch(query) {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `A user searched for: '${query}' on a Gen Z social media app. Return 5 relevant hashtags they might be looking for. Comma separated, no # symbol, lowercase.`,
    });
    return response.text.split(',').map(tag => tag.trim().toLowerCase());
  } catch (error) {
    console.error("Error in semantic search:", error);
    return [];
  }
}
