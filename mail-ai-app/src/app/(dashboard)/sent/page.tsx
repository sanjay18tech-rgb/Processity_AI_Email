'use client';

import { useQuery } from '@tanstack/react-query';
import { listEmails } from '@/actions/mail';
import { EmailList } from '@/components/mail/email-list';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';
import { useMailStore } from '@/lib/store/mail-store';
import { Send, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { PaginationControls } from '@/components/mail/pagination-controls';

export default function SentPage() {
    const {
        selectedEmailId,
        selectEmail,
        setEmails,
        setView,
        emails: storeEmails,
        searchQuery,
        currentPage,
        pageTokens,
        setNextPageToken,
        dateFrom,
        dateTo
    } = useMailStore();

    useEffect(() => { setView('sent'); }, [setView]);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['emails', 'sent', searchQuery, dateFrom, dateTo, currentPage],
        queryFn: async () => {
            try {
                let fullQuery = searchQuery || '';
                // Date filter logic
                if (dateFrom) {
                    const fromDate = new Date(dateFrom);
                    fromDate.setDate(fromDate.getDate() - 1);
                    fullQuery += ` after:${fromDate.toISOString().split('T')[0].replace(/-/g, '/')}`;
                }
                if (dateTo) {
                    const toDate = new Date(dateTo);
                    toDate.setDate(toDate.getDate() + 1);
                    fullQuery += ` before:${toDate.toISOString().split('T')[0].replace(/-/g, '/')}`;
                }

                const response = await listEmails({
                    labelIds: ['SENT'],
                    maxResults: 50,
                    q: fullQuery.trim() || undefined,
                    pageToken: pageTokens[currentPage]
                });
                return response;
            } catch (e: any) {
                console.error("Failed to fetch sent:", e);
                throw new Error(e.message || "Failed to fetch");
            }
        },
        retry: false,
        refetchInterval: false,
        refetchOnWindowFocus: false,
    });

    // Sync to global store for AI assistant access
    useEffect(() => {
        if (data) {
            const fetchedEmails = Array.isArray(data) ? data : (data.emails || []);
            setEmails(fetchedEmails);
            setNextPageToken(data.nextPageToken || null);
        }
    }, [data, setEmails, setNextPageToken]);

    // ... (rest remains same until return)

    return (
        <div className="space-y-6 w-full max-w-[1600px] mx-auto">
            {!selectedEmailId && (
                <div className="flex items-end justify-between pb-2 border-b border-border/40">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">Sent</h1>
                        <p className="text-sm text-muted-foreground">
                            View your sent messages
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
