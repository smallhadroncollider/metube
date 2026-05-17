import { type IRouter, Router, type Request, type Response } from "express";
import type { Database } from "bun:sqlite";
import type { OAuth2Client } from "google-auth-library";
import {
  getUserInfo,
  createOAuth2ClientFromTokens,
  requestDeviceAuthorization,
  pollDeviceToken,
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

const getClientId = (): string => process.env.GOOGLE_CLIENT_ID ?? "";
const getClientSecret = (): string => process.env.GOOGLE_CLIENT_SECRET ?? "";
const getRedirectUri = (): string =>
  process.env.GOOGLE_REDIRECT_URI ??
  "http://localhost:3000/auth/google/callback";

type DeviceAuthState = {
  oauth2Client: OAuth2Client;
  user: {
    id: number;
    google_id: string;
    email: string;
    name: string;
    picture: string;
    youtube_playlist_id: string;
    access_token: string;
    refresh_token: string;
    created_at: string;
  };
};

type DeviceAuthEntry =
  | { status: "pending" }
  | { status: "slow_down" }
  | { status: "complete"; data: DeviceAuthState }
  | { status: "error"; error: string };

const deviceAuthStates = new Map<string, DeviceAuthEntry>();
const deviceAuthTimers = new Map<string, ReturnType<typeof setInterval>>();

const startDeviceAuthPolling = (
  db: Database,
  deviceCode: string,
  interval: number,
) => {
  deviceAuthStates.set(deviceCode, { status: "pending" });

  const poll = async () => {
    const state = deviceAuthStates.get(deviceCode);
    if (state && state.status !== "pending" && state.status !== "slow_down") {
      const timer = deviceAuthTimers.get(deviceCode);
      if (timer) clearInterval(timer);
      deviceAuthTimers.delete(deviceCode);
      return;
    }

    const pollResponse = await pollDeviceToken(
      getClientId(),
      getClientSecret(),
      deviceCode,
    );

    if (
      pollResponse.status === "authorization_pending" ||
      pollResponse.status === "pending"
    ) {
      deviceAuthStates.set(deviceCode, { status: "pending" });
      return;
    }

    if (pollResponse.status === "slow_down") {
      deviceAuthStates.set(deviceCode, { status: "slow_down" });
      return;
    }

    if (pollResponse.status === "error") {
      deviceAuthStates.set(deviceCode, {
        status: "error",
        error: pollResponse.error,
      });
      const timer = deviceAuthTimers.get(deviceCode);
      if (timer) clearInterval(timer);
      deviceAuthTimers.delete(deviceCode);
      return;
    }

    const tokens = pollResponse.tokens;
    const oauth2Client = createOAuth2ClientFromTokens(
      getClientId(),
      getClientSecret(),
      getRedirectUri(),
      tokens,
    );

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

    updateUserTokens(db, user.id, tokens.access_token, tokens.refresh_token);

    const authState: DeviceAuthState = {
      oauth2Client,
      user: {
        id: user.id,
        google_id: user.google_id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        youtube_playlist_id: user.youtube_playlist_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        created_at: user.created_at,
      },
    };
    deviceAuthStates.set(deviceCode, { status: "complete", data: authState });
    const timer = deviceAuthTimers.get(deviceCode);
    if (timer) clearInterval(timer);
    deviceAuthTimers.delete(deviceCode);
  };

  const timer = setInterval(poll, interval * 1000);
  deviceAuthTimers.set(deviceCode, timer);
  poll();
};

export const authRoutes = (db: Database): IRouter => {
  const router = Router();

  router.post("/device/auth", async (_req: Request, res: Response) => {
    try {
      const clientId = getClientId();
      const deviceAuth = await requestDeviceAuthorization(clientId);
      startDeviceAuthPolling(db, deviceAuth.device_code, deviceAuth.interval);
      res.json({
        user_code: deviceAuth.user_code,
        verification_url: deviceAuth.verification_url,
        device_code: deviceAuth.device_code,
        interval: deviceAuth.interval,
        expires_in: deviceAuth.expires_in,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.post("/device/poll", async (req: Request, res: Response) => {
    try {
      const { device_code } = req.body as { device_code: string };
      const state = deviceAuthStates.get(device_code);

      if (!state) {
        res.status(400).json({ error: "Device code not found" });
        return;
      }

      if (state.status === "pending") {
        res.json({ status: "pending" });
        return;
      }

      if (state.status === "slow_down") {
        res.json({ status: "slow_down" });
        return;
      }

      if (state.status === "error") {
        res.status(400).json({ error: `Device auth error: ${state.error}` });
        return;
      }

      req.session.userId = state.data.user.id;
      req.session.oauth2Client = state.data.oauth2Client;
      res.json({ status: "complete", userId: state.data.user.id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get("/status", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      res.json({ authenticated: false });
      return;
    }

    if (!req.session.oauth2Client) {
      const storedTokens = getUserTokens(db, req.session.userId);
      if (storedTokens && storedTokens.refreshToken) {
        const oauth2Client = createOAuth2ClientFromTokens(
          getClientId(),
          getClientSecret(),
          getRedirectUri(),
          {
            access_token: storedTokens.accessToken,
            refresh_token: storedTokens.refreshToken,
          },
        );
        req.session.oauth2Client = oauth2Client;
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
