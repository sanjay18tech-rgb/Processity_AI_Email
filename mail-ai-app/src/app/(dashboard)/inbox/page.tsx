'use client';

import { useQuery } from '@tanstack/react-query';
import { listEmails } from '@/actions/mail';
import { EmailList } from '@/components/mail/email-list';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';
import { useMailStore } from '@/lib/store/mail-store';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { PaginationControls } from '@/components/mail/pagination-controls';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { useState } from 'react';
import { EmailFilter } from '@/types/email';

export default function InboxPage() {
    const {
        selectedEmailId,
        selectEmail,
        setEmails,
        setView,
        emails,
        searchQuery,
        currentPage,
        pageTokens,
        setNextPageToken,
        filter,
        setFilter
    } = useMailStore();

    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // Sync store filters to local dateRange (for AI triggered actions)
    useEffect(() => {
        // Sync from store if it has a valid range
        if (filter.after && filter.before) {
            const from = new Date(filter.after);
            const to = new Date(filter.before);

            // Only update if it differs from current local state to avoid override during partial selection
            const currentFromStr = dateRange?.from ? format(dateRange.from, 'yyyy/MM/dd') : '';
            const currentToStr = dateRange?.to ? format(dateRange.to, 'yyyy/MM/dd') : '';
            const storeFromStr = filter.after;
            const storeToStr = filter.before;

            if (currentFromStr !== storeFromStr || currentToStr !== storeToStr) {
                setDateRange({ from, to });
            }
        } else if (!filter.after && !filter.before) {
            // Only clear local if store is empty AND we aren't in a partial selection
            if (dateRange?.from && !dateRange?.to) {
                // Keep the partial selection
                return;
            }
            if (dateRange) setDateRange(undefined);
        }
    }, [filter.after, filter.before]);

    // Sync local dateRange to store (for UI triggered actions)
    const handleDateChange = (range: DateRange | undefined) => {
        setDateRange(range);

        // Only apply if we have a full range (or if it's cleared)
        if (!range) {
            setFilter({ after: undefined, before: undefined });
        } else if (range.from && range.to) {
            const after = format(range.from, 'yyyy/MM/dd');
            const before = format(range.to, 'yyyy/MM/dd');
            setFilter({ after, before });
        }
        // If only 'from' is selected, we don't update the global filter yet
    };

    const handleClearDate = () => {
        setDateRange(undefined);
        setFilter({ after: undefined, before: undefined });
    };

    useEffect(() => { setView('inbox'); }, [setView]);

    const formattedAfter = filter.after;
    const formattedBefore = filter.before;

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['emails', 'inbox', searchQuery, currentPage, formattedAfter, formattedBefore],
        queryFn: async () => {
            try {
                const response = await listEmails({
                    labelIds: ['INBOX'],
                    maxResults: 50,
                    query: searchQuery,
                    pageToken: pageTokens[currentPage],
                    after: formattedAfter,
                    before: formattedBefore
                });
                return response;
            } catch (e: any) {
                console.error("Failed to fetch emails:", e);
                throw new Error(e.message || "Failed to fetch");
            }
        },
        retry: false,
        refetchInterval: false, // Disabled auto-refresh to use Webhooks/Manual refresh
        refetchOnWindowFocus: false, // Prevent accidental refreshes on tab switch
    });

    // Sync to global store for AI assistant access
    useEffect(() => {
        if (data) {
            const fetchedEmails = Array.isArray(data) ? data : (data.emails || []);
            setEmails(fetchedEmails);
            setNextPageToken(data.nextPageToken || null);
        }
    }, [data, setEmails, setNextPageToken]);

    if (error) {
        const isApiDisabled = error.message.includes('Gmail API has not been used');

        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-6 p-8 text-center animate-in fade-in zoom-in duration-500">
                <div className="p-4 rounded-full bg-destructive/10 ring-1 ring-destructive/20">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold">Failed to load emails</h2>
                    <p className="text-muted-foreground max-w-md mx-auto text-sm">{error.message}</p>
                </div>

                {isApiDisabled ? (
                    <div className="flex flex-col items-center gap-4 bg-yellow-500/5 p-6 rounded-xl border border-yellow-500/10 max-w-md">
                        <p className="font-medium text-yellow-600 dark:text-yellow-500">Action Required</p>
                        <p className="text-sm text-muted-foreground">You need to enable the Gmail API for your project.</p>
                        <Button asChild variant="outline" className="mt-2 border-yellow-500/20 hover:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500">
                            <a
                                href="https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=48916427776"
                                target="_blank"
                            >
                                Enable Gmail API &rarr;
                            </a>
                        </Button>
                    </div>
                ) : (
                    <Button onClick={() => refetch()} variant="outline" className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                    </Button>
                )}

                {!isApiDisabled && (
                    <Button variant="link" asChild className="text-muted-foreground">
                        <a href="/api/auth/google">Re-authenticate with Google</a>
                    </Button>
                )}
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-32 rounded-lg" />
                    <Skeleton className="h-5 w-24 rounded-lg" />
                </div>
                <div className="flex flex-col gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex flex-col gap-3 p-4 border rounded-xl bg-card/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                </div>
                                <Skeleton className="h-3 w-24" />
                            </div>
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-full" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 w-full max-w-[1600px] mx-auto">
            {!selectedEmailId && (
                <div className="flex items-end justify-between pb-4 border-b border-border/40">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">Inbox</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage your incoming messages
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <DateRangePicker
                            date={dateRange}
                            setDate={handleDateChange}
                            onClear={handleClearDate}
                        />
                        <div className="h-8 w-[1px] bg-border/40" />
                        <PaginationControls count={Array.isArray(data) ? data.length : (data?.emails?.length || 0)} />
                    </div>
                </div>
            )}

            <EmailList
                emails={emails}
                selectedId={selectedEmailId || undefined}
                onSelect={(id) => selectEmail(id)}
            />
        </div>
    );
}
