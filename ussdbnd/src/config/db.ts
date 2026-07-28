import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_URL || path.join(dataDir, 'ussd.db');
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite);

export async function connectDB(): Promise<void> {
  createTables();
  console.log(`SQLite connected: ${dbPath}`);
}

function createTables(): void {
  try {
    sqlite.exec(`ALTER TABLE circles ADD COLUMN code TEXT UNIQUE`);
  } catch {
    // column may already exist
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      national_id TEXT NOT NULL UNIQUE,
      mobile_money_number TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS circles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      cycle_number INTEGER NOT NULL DEFAULT 1,
      contribution_amount INTEGER NOT NULL,
      current_payout_index INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS circle_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      circle_id INTEGER NOT NULL REFERENCES circles(id),
      member_id INTEGER NOT NULL REFERENCES members(id),
      payout_order_index INTEGER,
      joined_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL REFERENCES members(id),
      circle_id INTEGER NOT NULL REFERENCES circles(id),
      cycle_number INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      reference TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL REFERENCES members(id),
      wallet_type TEXT NOT NULL,
      direction TEXT NOT NULL,
      amount INTEGER NOT NULL,
      reference TEXT NOT NULL UNIQUE,
      related_contribution_id INTEGER REFERENCES contributions(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}