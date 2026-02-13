'use client';

import { useQuery } from '@tanstack/react-query';
import { listEmails } from '@/actions/mail';
import { EmailList } from '@/components/mail/email-list';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';
import { useMailStore } from '@/lib/store/mail-store';
import { Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { PaginationControls } from '@/components/mail/pagination-controls';

export default function TrashPage() {
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

    useEffect(() => { setView('trash'); }, [setView]);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['emails', 'trash', searchQuery, dateFrom, dateTo, currentPage],
        queryFn: async () => {
            try {
                const queryParts = [];
                if (searchQuery) {
                    queryParts.push(searchQuery);
                }
                // Date filter logic
                if (dateFrom) {
                    const fromDate = new Date(dateFrom);
                    fromDate.setDate(fromDate.getDate() - 1);
                    queryParts.push(`after:${fromDate.toISOString().split('T')[0].replace(/-/g, '/')}`);
                }
                if (dateTo) {
                    const toDate = new Date(dateTo);
                    toDate.setDate(toDate.getDate() + 1);
                    queryParts.push(`before:${toDate.toISOString().split('T')[0].replace(/-/g, '/')}`);
                }
                let fullQuery = queryParts.join(' ');

                return await listEmails({
                    labelIds: ['TRASH'],
                    maxResults: 50,
                    q: fullQuery.trim() || undefined,
                    pageToken: pageTokens[currentPage]
                });
            } catch (e: any) {
                console.error("Failed to fetch trash:", e);
                throw new Error(e.message || "Failed to fetch");
            }
        },
        retry: false,
        refetchInterval: false,
    });

    // Sync to global store
    useEffect(() => {
        if (data) {
            const fetchedEmails = Array.isArray(data) ? data : (data.emails || []);
            setEmails(fetchedEmails);
            setNextPageToken(data.nextPageToken || null);
        }
    }, [data, setEmails, setNextPageToken]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <AlertTriangle className="h-10 w-10 text-destructive" />
                <h2 className="text-xl font-semibold">Failed to load trash</h2>
                <p className="text-muted-foreground">{error.message}</p>
                <Button onClick={() => refetch()} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                </Button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-32" />
                <div className="flex flex-col gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 w-full max-w-[1600px] mx-auto">
            {!selectedEmailId && (
                <div className="flex items-end justify-between pb-2 border-b border-border/40">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-destructive to-pink-500 bg-clip-text text-transparent">Trash</h1>
                        <p className="text-sm text-muted-foreground">
                            Emails in trash are deleted after 30 days
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
