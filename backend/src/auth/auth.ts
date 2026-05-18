import { z } from "zod";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

const scopes = [
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

const OAuthTokensSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expiry_date: z.number().optional(),
});

export type OAuthTokens = z.infer<typeof OAuthTokensSchema>;

export const createOAuth2ClientFromTokens = (
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  tokens: OAuthTokens,
): OAuth2Client => {
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri,
  );
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
};

export const getUserInfo = async (
  oauth2Client: OAuth2Client,
): Promise<{
  id: string;
  email: string;
  name: string;
  picture: string;
}> => {
  const expiryDate = oauth2Client.credentials.expiry_date ?? 0;
  if (expiryDate <= Date.now() + 60_000) {
    await oauth2Client.refreshAccessToken();
  }
  const accessToken = oauth2Client.credentials.access_token;
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  const data = await response.json();
  return z
    .object({
      id: z.string(),
      email: z.string(),
      name: z.string(),
      picture: z.string(),
    })
    .parse(data);
};

const DeviceAuthResponseSchema = z.object({
  device_code: z.string(),
  user_code: z.string(),
  verification_url: z.string(),
  interval: z.number(),
  expires_in: z.number(),
});

export type DeviceAuthResponse = z.infer<typeof DeviceAuthResponseSchema>;

export const requestDeviceAuthorization = async (
  clientId: string,
): Promise<DeviceAuthResponse> => {
  const response = await fetch("https://oauth2.googleapis.com/device/code", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      scope: scopes,
    }).toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Device auth request failed: ${response.status} ${response.statusText} - ${body}`,
    );
  }

  return DeviceAuthResponseSchema.parse(await response.json());
};

const DevicePollErrorSchema = z.object({
  error: z.string(),
});

const DevicePollCompleteSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expiry_date: z.number(),
});

export type DevicePollResponse =
  | { status: "complete"; tokens: OAuthTokens }
  | { status: "pending" }
  | { status: "authorization_pending" }
  | { status: "slow_down" }
  | { status: "error"; error: string };

export const pollDeviceToken = async (
  clientId: string,
  clientSecret: string,
  deviceCode: string,
): Promise<DevicePollResponse> => {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      device_code: deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    }).toString(),
  });

  const data = await response.json();
  const errorData = DevicePollErrorSchema.safeParse(data);
  if (errorData.success) {
    const error = errorData.data.error;
    if (error === "authorization_pending") {
      return { status: "authorization_pending" };
    }
    if (error === "slow_down") {
      return { status: "slow_down" };
    }
    return { status: "error", error };
  }

  if (!response.ok) {
    throw new Error(
      `Device token poll failed: ${response.status} ${response.statusText} - ${JSON.stringify(data)}`,
    );
  }

  const completeData = DevicePollCompleteSchema.parse(data);
  return {
    status: "complete",
    tokens: {
      access_token: completeData.access_token,
      refresh_token: completeData.refresh_token,
      expiry_date: completeData.expiry_date ?? 0,
    },
  };
};
