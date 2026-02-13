import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const response = await fetch(`${BACKEND_URL}/api/assistant`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Backend Assistant Error:', error);
            return NextResponse.json({ error: 'Backend error', details: error }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Assistant Proxy Error:', error);
        return NextResponse.json(
            { error: 'Failed to process AI request', details: String(error) },
            { status: 500 }
        );
    }
}
