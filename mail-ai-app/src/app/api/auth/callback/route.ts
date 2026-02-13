import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.json({ error }, { status: 400 });
    }

    if (!code) {
        return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

        // Call Python backend to exchange code for tokens
        const tokenResponse = await fetch(`${backendUrl}/auth/callback?code=${code}`, {
            method: 'GET',
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('Backend Token Exchange Failed:', errorText);
            throw new Error(errorText || 'Failed to fetch tokens from backend');
        }

        const tokens = await tokenResponse.json();
        const { access_token, refresh_token, expires_in } = tokens;

        // Set cookies in Next.js (keeping state management consistent with frontend)
        const cookieStore = await cookies();

        cookieStore.set('gmail_access_token', access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: expires_in,
            path: '/',
        });

        if (refresh_token) {
            cookieStore.set('gmail_refresh_token', refresh_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 30, // 30 days
                path: '/',
            });
        }

        return NextResponse.redirect(new URL('/inbox', request.url));
    } catch (error) {
        console.error('OAuth error:', error);
        return NextResponse.json({ error: 'Authentication failed', details: String(error) }, { status: 500 });
    }
}
