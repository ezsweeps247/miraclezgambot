import { users, type User, type InsertUser, highScores, type HighScore, type InsertHighScore } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  saveHighScore(highScore: InsertHighScore): Promise<HighScore>;
  getTopHighScores(limit: number): Promise<HighScore[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private highScores: Map<number, HighScore>;
  currentUserId: number;
  currentHighScoreId: number;

  constructor() {
    this.users = new Map();
    this.highScores = new Map();
    this.currentUserId = 1;
    this.currentHighScoreId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async saveHighScore(insertHighScore: InsertHighScore): Promise<HighScore> {
    const id = this.currentHighScoreId++;
    const highScore: HighScore = {
      ...insertHighScore,
      id,
      createdAt: new Date(),
    };
    this.highScores.set(id, highScore);
    return highScore;
  }

  async getTopHighScores(limit: number): Promise<HighScore[]> {
    return Array.from(this.highScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
