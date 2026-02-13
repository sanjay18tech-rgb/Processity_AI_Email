'use client';

import { useQuery } from '@tanstack/react-query';
import { listEmails } from '@/actions/mail';
import { EmailList } from '@/components/mail/email-list';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';
import { useMailStore } from '@/lib/store/mail-store';
import { Archive, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { PaginationControls } from '@/components/mail/pagination-controls';

export default function ArchivePage() {
    const {
        selectedEmailId,
        selectEmail,
        setEmails,
        setView,
        emails: storeEmails,
        searchQuery,
        currentPage,
        pageTokens,
        setNextPageToken
    } = useMailStore();

    useEffect(() => { setView('archive'); }, [setView]);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['emails', 'archive', searchQuery, currentPage],
        queryFn: async () => {
            try {
                // Fetch emails that are not in inbox, trash, or spam
                const baseQuery = '-in:inbox -in:trash -in:spam';
                const finalQuery = searchQuery ? `${baseQuery} ${searchQuery}` : baseQuery;

                return await listEmails({
                    query: finalQuery,
                    maxResults: 50,
                    pageToken: pageTokens[currentPage]
                });
            } catch (e: any) {
                console.error("Failed to fetch archive:", e);
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

    // ... (rest remains same)

    return (
        <div className="space-y-6 w-full max-w-[1600px] mx-auto">
            {!selectedEmailId && (
                <div className="flex items-end justify-between pb-2 border-b border-border/40">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">Archive</h1>
                        <p className="text-sm text-muted-foreground">
                            All your archived messages
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <PaginationControls count={Array.isArray(data) ? data.length : (data?.emails?.length || 0)} />
                    </div>
                </div>
            )}
            <EmailList
                emails={storeEmails}
                selectedId={selectedEmailId || undefined}
                onSelect={(id) => selectEmail(id)}
            />
        </div>
    );
}
