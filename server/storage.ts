import { type User, type InsertUser, type Message, type InsertMessage, type ChatSession, type InsertChatSession } from "@shared/schema";
import { db } from "./db";
import { users, messages, chatSessions } from "@shared/schema";
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

export class MemoryStorage implements IStorage {
  private users: User[] = [];
  private messages: Message[] = [];
  private chatSessions: ChatSession[] = [];
  private nextUserId = 1;
  private nextMessageId = 1;
  private nextSessionId = 1;

  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.nextUserId++,
      username: insertUser.username,
      password: insertUser.password,
    };
    this.users.push(user);
    return user;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const message: Message = {
      id: this.nextMessageId++,
      content: insertMessage.content,
      role: insertMessage.role,
      userId: insertMessage.userId,
      sessionId: insertMessage.sessionId,
      timestamp: new Date(),
    };
    this.messages.push(message);
    return message;
  }

  async getMessages(sessionId?: string): Promise<Message[]> {
    if (sessionId) {
      return this.messages
        .filter(message => message.sessionId === sessionId)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    return this.messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async clearMessages(sessionId?: string): Promise<void> {
    if (sessionId) {
      this.messages = this.messages.filter(message => message.sessionId !== sessionId);
    } else {
      this.messages = [];
    }
  }

  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    const chatSession: ChatSession = {
      id: this.nextSessionId++,
      sessionId: session.sessionId,
      userId: session.userId,
      title: session.title,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.chatSessions.push(chatSession);
    return chatSession;
  }

  async getChatSessions(userId?: string): Promise<ChatSession[]> {
    if (userId) {
      return this.chatSessions
        .filter(session => session.userId === userId)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
    return this.chatSessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateChatSession(sessionId: string, title: string): Promise<void> {
    const session = this.chatSessions.find(s => s.sessionId === sessionId);
    if (session) {
      session.title = title;
      session.updatedAt = new Date();
    }
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return result[0];
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