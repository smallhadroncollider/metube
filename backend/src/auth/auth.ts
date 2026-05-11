import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

const scopes = [
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export const createOAuth2Client = (
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): OAuth2Client => new google.auth.OAuth2(clientId, clientSecret, redirectUri);

export const getOAuth2Url = (
  oauth2Client: OAuth2Client,
  state: string,
): string =>
  oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    state,
  });

export const getTokens = async (
  oauth2Client: OAuth2Client,
  code: string,
): Promise<OAuth2Client> => {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
};

export type OAuthTokens = {
  access_token: string;
  refresh_token: string;
  expiry_date?: number;
};

export const createOAuth2ClientFromTokens = (
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  tokens: OAuthTokens,
): OAuth2Client => {
  const oauth2Client = createOAuth2Client(clientId, clientSecret, redirectUri);
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
  const accessToken = oauth2Client.credentials.access_token;
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  const data = (await response.json()) as Record<string, unknown>;
  return {
    id: data.id as string,
    email: data.email as string,
    name: data.name as string,
    picture: data.picture as string,
  };
};

export type DeviceAuthResponse = {
  device_code: string;
  user_code: string;
  verification_url: string;
  interval: number;
  expires_in: number;
};

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

  return response.json() as Promise<DeviceAuthResponse>;
};

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

  const data = (await response.json()) as Record<string, unknown>;

  if (data.error) {
    const error = data.error as string;
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

  return {
    status: "complete",
    tokens: {
      access_token: data.access_token as string,
      refresh_token: data.refresh_token as string,
      expiry_date: (data.expiry_date as number) ?? 0,
    },
  };
};
