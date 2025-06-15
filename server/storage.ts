import { users, messages, chatSessions, type User, type InsertUser, type Message, type InsertMessage, type ChatSession, type InsertChatSession } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(sessionId?: string): Promise<Message[]>;
  clearMessages(sessionId?: string): Promise<void>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSessions(userId?: string): Promise<ChatSession[]>;
  updateChatSession(sessionId: string, title: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getMessages(sessionId?: string): Promise<Message[]> {
    if (sessionId) {
      return await db
        .select()
        .from(messages)
        .where(eq(messages.sessionId, sessionId))
        .orderBy(messages.timestamp);
    }
    return await db
      .select()
      .from(messages)
      .orderBy(messages.timestamp);
  }

  async clearMessages(sessionId?: string): Promise<void> {
    if (sessionId) {
      await db.delete(messages).where(eq(messages.sessionId, sessionId));
    } else {
      await db.delete(messages);
    }
  }

  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    const [chatSession] = await db
      .insert(chatSessions)
      .values(session)
      .returning();
    return chatSession;
  }

  async getChatSessions(userId?: string): Promise<ChatSession[]> {
    if (userId) {
      return await db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.userId, userId))
        .orderBy(desc(chatSessions.updatedAt));
    }
    return await db
      .select()
      .from(chatSessions)
      .orderBy(desc(chatSessions.updatedAt));
  }

  async updateChatSession(sessionId: string, title: string): Promise<void> {
    await db
      .update(chatSessions)
      .set({ title, updatedAt: new Date() })
      .where(eq(chatSessions.sessionId, sessionId));
  }
}

export const storage = new DatabaseStorage();
