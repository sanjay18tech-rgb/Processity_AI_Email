'use server';

import { EmailFilter, ComposeEmail } from '@/types/email';
import { getGmailToken } from '@/lib/gmail/token';
import { revalidatePath } from 'next/cache';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

async function fetchFromBackend(endpoint: string, method: string, body?: any) {
    const token = await getGmailToken();
    if (!token) throw new Error('Not authenticated');

    const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Backend Error: ${error}`);
    }

    return response.json();
}

export async function listEmails(filter: EmailFilter = {}) {
    try {
        // Ensure both 'query' and 'q' are provided for fallback compatibility
        const searchInput = filter.query || filter.q;
        const normalizedFilter = {
            ...filter,
            query: searchInput,
            q: searchInput
        };
        return await fetchFromBackend('/api/mail/list', 'POST', normalizedFilter);
    } catch (error) {
        console.error('List Emails Error:', error);
        throw error;
    }
}

export async function sendEmail(email: ComposeEmail) {
    try {
        const result = await fetchFromBackend('/api/mail/send', 'POST', email);
        revalidatePath('/sent');
        return result;
    } catch (error) {
        console.error('Send Email Error:', error);
        throw error;
    }
}

export async function markAsRead(messageIds: string[]) {
    try {
        const result = await fetchFromBackend('/api/mail/mark-read', 'POST', { messageIds });
        revalidatePath('/inbox');
        revalidatePath('/archive');
        return result;
    } catch (error) {
        console.error('Mark Read Error:', error);
        throw error;
    }
}

export async function saveDraft(email: { to?: string; subject?: string; body?: string }) {
    try {
        const result = await fetchFromBackend('/api/mail/drafts/create', 'POST', email);
        revalidatePath('/drafts');
        return result;
    } catch (error) {
        console.error('Save Draft Error:', error);
        throw error;
    }
}

export async function replyToEmail(data: {
    to: string;
    subject: string;
    body: string;
    messageId: string;
    threadId: string;
}) {
    try {
        const result = await fetchFromBackend('/api/mail/reply', 'POST', data);
        revalidatePath('/sent');
        return result;
    } catch (error) {
        console.error('Reply Email Error:', error);
        throw error;
    }
}

export async function fetchThread(threadId: string) {
    try {
        return await fetchFromBackend(`/api/mail/thread/${threadId}`, 'GET');
    } catch (error) {
        console.error('Fetch Thread Error:', error);
        throw error;
    }
}

export async function trashEmail(messageId: string) {
    try {
        const result = await fetchFromBackend('/api/mail/trash', 'POST', { messageId });
        revalidatePath('/inbox');
        revalidatePath('/sent');
        return result;
    } catch (error) {
        console.error('Trash Email Error:', error);
        throw error;
    }
}

export async function searchEmails(query: string, maxResults: number = 10) {
    try {
        return await fetchFromBackend('/api/mail/search', 'POST', { query, maxResults });
    } catch (error) {
        console.error('Search Emails Error:', error);
        throw error;
    }
}

export async function getProfile() {
    try {
        const token = await getGmailToken();
        if (!token) return { emailAddress: '' };

        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) return { emailAddress: '' };

        const data = await response.json();
        return { emailAddress: data.email || '' };
    } catch (error) {
        console.error('Get Profile Error:', error);
        return { emailAddress: '' };
    }
}
