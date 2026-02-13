import { cookies } from 'next/headers';

export async function getGmailToken() {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('gmail_access_token')?.value;
    const refreshToken = cookieStore.get('gmail_refresh_token')?.value;

    if (accessToken) return accessToken;
    if (refreshToken) return refreshAccessToken(refreshToken);

    return null;
}

export async function refreshAccessToken(refreshToken: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId!,
                client_secret: clientSecret!,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }),
        });

        const tokens = await response.json();

        if (!response.ok) throw new Error(tokens.error_description || 'Failed to refresh token');

        const cookieStore = await cookies();
        cookieStore.set('gmail_access_token', tokens.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: tokens.expires_in,
            path: '/',
        });

        return tokens.access_token;
    } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
    }
}
