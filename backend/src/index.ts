import "dotenv/config";
import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Database } from "bun:sqlite";
import { initDb } from "./db/schema.js";
import { authRoutes } from "./routes/auth.js";
import { apiRoutes } from "./routes/api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = new Database(path.resolve(__dirname, "../../data.db"));
initDb(db);

const createSessionStore = (db: Database): session.Store => {
	db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expires INTEGER NOT NULL
    )
  `);

	class SQLiteStore extends session.Store {
		get(
			sid: string,
			cb: (
				err: Error | null,
				sess: session.SessionData | undefined | null,
			) => void,
		): void {
			const row = db
				.query("SELECT sess FROM sessions WHERE sid = ? AND expires > ?")
				.get(sid, Date.now()) as { sess: string } | null;
			cb(null, row ? JSON.parse(row.sess) : null);
		}

		set(
			sid: string,
			sess: session.SessionData,
			cb: (err: Error | null) => void,
		): void {
			const maxAge = 86400000 * 7;
			db.query(
				"INSERT OR REPLACE INTO sessions (sid, sess, expires) VALUES (?, ?, ?)",
			).run(sid, JSON.stringify(sess), Date.now() + maxAge);
			cb(null);
		}

		destroy(sid: string, cb: (err: Error | null) => void): void {
			db.query("DELETE FROM sessions WHERE sid = ?").run(sid);
			cb(null);
		}
	}

	return new SQLiteStore();
};

const app = express();
const port = process.env.PORT ?? "3000";

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(
	session({
		secret: process.env.SESSION_SECRET ?? "dev-secret",
		resave: false,
		saveUninitialized: false,
		cookie: { secure: false, maxAge: 86400000 * 7 },
		store: createSessionStore(db),
	}),
);

app.use("/auth", authRoutes(db));
app.use("/api", apiRoutes(db));

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
	app.use(express.static(path.resolve(__dirname, "../../frontend/dist")));
	app.get("*", (_req, res) => {
		res.sendFile(path.resolve(__dirname, "../../frontend/dist/index.html"));
	});
}

app.listen(parseInt(port, 10), () => {
	console.log(`Server running on port ${port}`);
});
