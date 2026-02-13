import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('gmail_access_token')?.value;

        if (!accessToken) {
            return NextResponse.json({ name: 'User', email: '' });
        }

        // Fetch profile from Google
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            return NextResponse.json({ name: 'User', email: '' });
        }

        const profile = await response.json();
        return NextResponse.json({
            name: profile.name || profile.given_name || 'User',
            email: profile.email || '',
            picture: profile.picture || '',
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        return NextResponse.json({ name: 'User', email: '' });
    }
}
