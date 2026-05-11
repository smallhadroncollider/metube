import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

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
		scope: [
			"https://www.googleapis.com/auth/youtube.force-ssl",
			"https://www.googleapis.com/auth/userinfo.profile",
			"https://www.googleapis.com/auth/userinfo.email",
		],
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
