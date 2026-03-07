// src/features/finance/server/ai-actions.ts
"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * AI Receipt Vision - Parses receipt images using Gemini 1.5 Flash
 * Returns structured JSON for auto-filling transaction fields
 */
export async function parseReceiptImage(base64Image: string): Promise<{
  success: boolean;
  data?: {
    amount: number;
    merchant: string;
    category: string;
    date: string;
    currency?: string;
  };
  error?: string;
}> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    return { 
      success: false, 
      error: "AI service not configured. Please add GOOGLE_GENERATIVE_AI_API_KEY to your .env file." 
    };
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are a receipt parsing assistant. Analyze the receipt image and extract the following information as JSON:

- amount: The total amount (number only, no currency symbol)
- merchant: The store/merchant name
- category: Best fitting category from: FOOD, TRANSPORT, SHOPPING, ENTERTAINMENT, UTILITIES, HEALTHCARE, GROCERIES, OTHER
- date: The transaction date in ISO format (YYYY-MM-DD)
- currency: The currency code if visible (default: IDR)

Return ONLY valid JSON in this exact format:
{"amount": 0, "merchant": "", "category": "", "date": "", "currency": "IDR"}

If the image is not a receipt or information cannot be determined, return:
{"error": "Invalid receipt or unreadable"}
`;

    // Convert base64 to image data for Gemini
    const imagePart = {
      inlineData: {
        data: base64Image.replace(/^data:image\/\w+;base64,/, ""),
        mimeType: "image/jpeg",
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    const cleanedText = text.replace(/```json\s*|\s*```/g, "").trim();
    const parsed = JSON.parse(cleanedText);

    if (parsed.error) {
      return { success: false, error: parsed.error };
    }

    return {
      success: true,
      data: {
        amount: Number(parsed.amount),
        merchant: parsed.merchant,
        category: parsed.category,
        date: parsed.date,
        currency: parsed.currency || "IDR",
      },
    };
  } catch (error) {
    console.error("Receipt parsing error:", error);
    return {
      success: false,
      error: "Failed to parse receipt. Please try again.",
    };
  }
}

/**
 * Categorize transaction based on merchant name using AI
 */
export async function categorizeTransaction(merchant: string): Promise<{
  success: boolean;
  category?: string;
  error?: string;
}> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    return { 
      success: false, 
      error: "AI service not configured" 
    };
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Given this merchant name: "${merchant}"
Return the most likely expense category as a single word from:
FOOD, TRANSPORT, SHOPPING, ENTERTAINMENT, UTILITIES, HEALTHCARE, GROCERIES, OTHER

Return ONLY the category name, nothing else.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const category = response.text().trim().toUpperCase();

    return { success: true, category };
  } catch (error) {
    console.error("Categorization error:", error);
    return { success: false, error: "Failed to categorize" };
  }
}
