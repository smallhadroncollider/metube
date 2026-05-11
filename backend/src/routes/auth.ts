import {
	type IRouter,
	Router,
	type Request,
	type Response,
	type NextFunction,
} from "express";
import type { Database } from "bun:sqlite";
import type { OAuth2Client } from "google-auth-library";
import {
	createOAuth2Client,
	getOAuth2Url,
	getTokens,
	getUserInfo,
	createOAuth2ClientFromTokens,
} from "../auth/auth.js";
import {
	getUserByGoogleId,
	createUser,
	updateUserTokens,
	getUserTokens,
} from "../db/repo.js";

declare module "express-session" {
	interface SessionData {
		userId: number;
		oauth2Client?: OAuth2Client;
	}
}

const getClient = (): OAuth2Client => {
	const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
	const redirectUri =
		process.env.GOOGLE_REDIRECT_URI ??
		"http://localhost:3000/auth/google/callback";
	return createOAuth2Client(clientId, clientSecret, redirectUri);
};

export const authRoutes = (db: Database): IRouter => {
	const router = Router();

	router.get("/google", (_req: Request, res: Response) => {
		const oauth2Client = getClient();
		const state = Math.random().toString(36).slice(2);
		res.cookie("oauth_state", state, { httpOnly: true, secure: false });
		const url = getOAuth2Url(oauth2Client, state);
		res.redirect(url);
	});

	router.get(
		"/google/callback",
		async (req: Request, res: Response, next: NextFunction) => {
			try {
				const code = req.query.code as string;
				const state = req.query.state as string;
				const savedState = req.cookies.oauth_state;

				if (state !== savedState) {
					res.status(400).json({ error: "Invalid state" });
					return;
				}

				const oauth2Client = getClient();
				await getTokens(oauth2Client, code);
				const userInfo = await getUserInfo(oauth2Client);

				let user = getUserByGoogleId(db, userInfo.id);

				if (!user) {
					const playlistId = process.env.YOUTUBE_PLAYLIST_ID ?? "";
					user = createUser(
						db,
						userInfo.id,
						userInfo.email,
						userInfo.name,
						userInfo.picture,
						playlistId,
					);
				}

				const tokens = oauth2Client.credentials;
				updateUserTokens(
					db,
					user.id,
					tokens.access_token ?? "",
					tokens.refresh_token ?? "",
				);

				req.session.userId = user.id;
				req.session.oauth2Client = oauth2Client;
				res.clearCookie("oauth_state");
				res.redirect("http://localhost:5173");
			} catch (error) {
				next(error);
			}
		},
	);

	router.get("/status", async (req: Request, res: Response) => {
		if (!req.session.userId) {
			res.json({ authenticated: false });
			return;
		}

		// Restore OAuth2Client from stored tokens if not in session
		if (!req.session.oauth2Client) {
			const storedTokens = getUserTokens(db, req.session.userId);
			if (storedTokens && storedTokens.refreshToken) {
				const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
				const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
				const redirectUri =
					process.env.GOOGLE_REDIRECT_URI ??
					"http://localhost:3000/auth/google/callback";
				req.session.oauth2Client = createOAuth2ClientFromTokens(
					clientId,
					clientSecret,
					redirectUri,
					{
						access_token: storedTokens.accessToken,
						refresh_token: storedTokens.refreshToken,
					},
				);
			}
		}

		res.json({ authenticated: true, userId: req.session.userId });
	});

	router.post("/logout", (req: Request, res: Response) => {
		req.session.destroy((err) => {
			if (err) {
				res.status(500).json({ error: "Failed to logout" });
				return;
			}
			res.json({ success: true });
		});
	});

	return router;
};
