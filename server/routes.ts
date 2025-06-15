import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Google Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.OPENAI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

      // Call Google Gemini AI API
      try {
        // Format conversation history for Gemini
        const chatHistory = conversationHistory.slice(0, -1).map(msg => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        }));

        const chat = model.startChat({
          history: chatHistory,
        });

        const result = await chat.sendMessage(validatedData.content);
        const aiResponse = result.response.text();
        
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
        console.error("Google Gemini AI API error:", aiError);
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
