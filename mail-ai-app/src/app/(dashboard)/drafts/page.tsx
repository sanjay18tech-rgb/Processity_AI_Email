'use client';

import { useQuery } from '@tanstack/react-query';
import { listEmails } from '@/actions/mail';
import { EmailList } from '@/components/mail/email-list';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';
import { useMailStore } from '@/lib/store/mail-store';
import { Button } from '@/components/ui/button';
import { FileEdit, RefreshCw, AlertTriangle } from 'lucide-react';

import { PaginationControls } from '@/components/mail/pagination-controls';

export default function DraftsPage() {
    const {
        selectedEmailId: selectedId,
        selectEmail: setSelectedId,
        emails: storeEmails,
        setEmails,
        setView,
        searchQuery,
        currentPage,
        pageTokens,
        setNextPageToken
    } = useMailStore();

    useEffect(() => { setView('drafts'); }, [setView]);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['emails', 'drafts', searchQuery, currentPage],
        queryFn: async () => {
            try {
                return await listEmails({
                    labelIds: ['DRAFT'],
                    maxResults: 50,
                    query: searchQuery,
                    pageToken: pageTokens[currentPage]
                });
            } catch (e: any) {
                console.error("Failed to fetch drafts:", e);
                throw new Error(e.message || "Failed to fetch");
            }
        },
        retry: false
    });

    // Sync to global store
    useEffect(() => {
        if (data) {
            const fetchedEmails = Array.isArray(data) ? data : (data.emails || []);
            setEmails(fetchedEmails);
            setNextPageToken(data.nextPageToken || null);
        }
    }, [data, setEmails, setNextPageToken]);

    // ... (rest same)

    return (
        <div className="space-y-6 w-full max-w-[1600px] mx-auto">
            {!selectedId && (
                <div className="flex items-end justify-between pb-2 border-b border-border/40">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">Drafts</h1>
                        <p className="text-sm text-muted-foreground">
                            Continue working on your saved messages
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <PaginationControls count={Array.isArray(data) ? data.length : (data?.emails?.length || 0)} />
                    </div>
                </div>
            )}
            <EmailList
                emails={storeEmails}
                selectedId={selectedId || undefined}
                onSelect={(id) => setSelectedId(id)}
            />
        </div>
    );
}
