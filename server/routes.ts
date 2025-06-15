import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Google Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.OPENAI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function registerRoutes(app: Express): Promise<Server> {
  // Get messages (optionally filtered by session)
  app.get("/api/messages", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string;
      const messages = await storage.getMessages(sessionId);
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

      // Create or update chat session
      try {
        await storage.createChatSession({
          sessionId: validatedData.sessionId,
          userId: validatedData.userId,
          title: validatedData.content.slice(0, 50) + (validatedData.content.length > 50 ? "..." : ""),
        });
      } catch (error) {
        // Session might already exist, continue
      }

      // Get conversation history for context (session-specific)
      const messageHistory = await storage.getMessages(validatedData.sessionId);
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
          role: "assistant",
          userId: validatedData.userId,
          sessionId: validatedData.sessionId,
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

  // Clear messages (optionally session-specific)
  app.delete("/api/messages", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string;
      await storage.clearMessages(sessionId);
      res.json({ message: sessionId ? "Session messages cleared" : "All messages cleared" });
    } catch (error) {
      console.error("Error clearing messages:", error);
      res.status(500).json({ error: "Failed to clear messages" });
    }
  });

  // Get chat sessions for a user
  app.get("/api/sessions", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const sessions = await storage.getChatSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // Create a new chat session
  app.post("/api/sessions", async (req, res) => {
    try {
      const sessionData = insertChatSessionSchema.parse(req.body);
      const session = await storage.createChatSession(sessionData);
      res.json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  // Update chat session title
  app.patch("/api/sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { title } = req.body;
      await storage.updateChatSession(sessionId, title);
      res.json({ message: "Session updated" });
    } catch (error) {
      console.error("Error updating session:", error);
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
