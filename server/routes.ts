import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import OpenAI from "openai";

// Initialize OpenAI client for Kluster AI
const openai = new OpenAI({
  apiKey: process.env.KLUSTER_API_KEY || "6c61e9cf-4026-4006-acc9-a8a70e8a6371",
  baseURL: "https://api.kluster.ai/v1"
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all messages
  app.get("/api/messages", async (req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send a new message and get AI response
  app.post("/api/messages", async (req, res) => {
    try {
      const validatedData = insertMessageSchema.parse(req.body);
      
      if (validatedData.role !== "user") {
        return res.status(400).json({ error: "Only user messages can be sent" });
      }

      // Save user message
      const userMessage = await storage.createMessage(validatedData);

      // Get conversation history for context
      const messageHistory = await storage.getMessages();
      const conversationHistory = messageHistory.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      }));

      // Call Kluster AI API
      try {
        const completion = await openai.chat.completions.create({
          model: "klusterai/Meta-Llama-3.1-8B-Instruct-Turbo",
          messages: conversationHistory,
          max_tokens: 1000,
          temperature: 0.7,
        });

        const aiResponse = completion.choices[0]?.message?.content;
        
        if (!aiResponse) {
          throw new Error("No response from AI");
        }

        // Save AI response
        const aiMessage = await storage.createMessage({
          content: aiResponse,
          role: "assistant"
        });

        res.json({
          userMessage,
          aiMessage
        });

      } catch (aiError) {
        console.error("Kluster AI API error:", aiError);
        res.status(500).json({ 
          error: "Failed to get AI response", 
          details: aiError instanceof Error ? aiError.message : "Unknown AI error"
        });
      }

    } catch (error) {
      console.error("Error processing message:", error);
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // Clear all messages
  app.delete("/api/messages", async (req, res) => {
    try {
      await storage.clearMessages();
      res.json({ message: "All messages cleared" });
    } catch (error) {
      console.error("Error clearing messages:", error);
      res.status(500).json({ error: "Failed to clear messages" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
