import { Database } from "bun:sqlite";

export type User = {
  id: number;
  google_id: string;
  email: string;
  name: string;
  picture: string;
  youtube_playlist_id: string;
  access_token: string;
  refresh_token: string;
  expiry_date: string;
  created_at: string;
};

export type Subscription = {
  id: number;
  user_id: number;
  channel_id: string;
  channel_title: string;
  channel_thumbnail: string;
  subscribed_at: string;
};

export type Video = {
  id: number;
  channel_id: string;
  video_id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  published_at: string;
  status: "pending" | "added" | "ignored";
  added_at: string | null;
};

const createDbFn = (memory = false): Database => {
  const db = new Database(memory ? ":memory:" : "data.db");
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA foreign_keys = ON");
  return db;
};

export const initDb = (db: Database) => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      picture TEXT NOT NULL,
      youtube_playlist_id TEXT NOT NULL,
      access_token TEXT NOT NULL DEFAULT '',
      refresh_token TEXT NOT NULL DEFAULT '',
      expiry_date TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      channel_id TEXT NOT NULL,
      channel_title TEXT NOT NULL,
      channel_thumbnail TEXT NOT NULL,
      subscribed_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, channel_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      thumbnail TEXT NOT NULL,
      duration TEXT NOT NULL DEFAULT '',
      published_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      added_at TEXT,
      UNIQUE(channel_id, video_id)
    )
  `);

  try {
    db.run("ALTER TABLE videos ADD COLUMN duration TEXT NOT NULL DEFAULT ''");
  } catch {
    // Column already exists
  }

  try {
    db.run(
      "ALTER TABLE users ADD COLUMN access_token TEXT NOT NULL DEFAULT ''",
    );
  } catch {
    // Column already exists
  }

  try {
    db.run(
      "ALTER TABLE users ADD COLUMN refresh_token TEXT NOT NULL DEFAULT ''",
    );
  } catch {
    // Column already exists
  }

  try {
    db.run("ALTER TABLE users ADD COLUMN expiry_date TEXT NOT NULL DEFAULT ''");
  } catch {
    // Column already exists
  }
};

export const createDb = createDbFn;
export default createDb;
