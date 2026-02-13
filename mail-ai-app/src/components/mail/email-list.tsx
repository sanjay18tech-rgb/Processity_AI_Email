'use client';

import { Email } from '@/types/email';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Reply, Forward, Trash2, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import { useMailStore } from '@/lib/store/mail-store';
import { useComposeStore } from '@/lib/store/compose-store';
import { markAsRead, fetchThread, trashEmail } from '@/actions/mail';
import { toast } from 'sonner';

interface EmailListProps {
    emails: Email[];
    selectedId?: string;
    onSelect?: (id: string) => void;
}

/* ─── Email Body Renderer ────────────────────────────────────── */

function EmailBody({ html, text }: { html?: string; text?: string }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (html && iframeRef.current) {
            const doc = iframeRef.current.contentDocument;
            if (doc) {
                doc.open();
                doc.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <style>
                            body { 
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                font-size: 14px; 
                                line-height: 1.6;
                                color: #333; 
                                margin: 0; 
                                padding: 8px;
                                word-wrap: break-word;
                                overflow-wrap: break-word;
                            }
                            img { max-width: 100%; height: auto; }
                            a { color: #2563eb; }
                            table { max-width: 100%; }
                        </style>
                    </head>
                    <body>${html}</body>
                    </html>
                `);
                doc.close();

                const resizeObserver = new ResizeObserver(() => {
                    if (iframeRef.current && doc.body) {
                        iframeRef.current.style.height = doc.body.scrollHeight + 'px';
                    }
                });
                if (doc.body) resizeObserver.observe(doc.body);
                setTimeout(() => {
                    if (iframeRef.current && doc.body) {
                        iframeRef.current.style.height = doc.body.scrollHeight + 'px';
                    }
                }, 200);
            }
        }
    }, [html]);

    if (html) {
        return (
            <iframe
                ref={iframeRef}
                className="w-full border-0 min-h-[100px]"
                sandbox="allow-same-origin"
                title="Email content"
            />
        );
    }

    if (text) {
        return (
            <div className="text-sm whitespace-pre-wrap leading-relaxed p-4">
                {text}
            </div>
        );
    }

    return (
        <div className="text-sm text-muted-foreground p-4 italic">
            (No content available)
        </div>
    );
}

/* ─── Single Thread Message Card ─────────────────────────────── */

interface ThreadMessage {
    id: string;
    threadId: string;
    from: string;
    to: string;
    subject: string;
    date: string;
    snippet: string;
    bodyHtml?: string;
    bodyText?: string;
    isRead: boolean;
    labelIds: string[];
}

function ThreadMessageCard({
    message,
    isLatest,
    defaultExpanded,
}: {
    message: ThreadMessage;
    isLatest: boolean;
    defaultExpanded: boolean;
}) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const isSent = message.labelIds?.includes('SENT');

    return (
        <div
            className={cn(
                "rounded-xl border transition-all duration-300 overflow-hidden",
                isSent
                    ? "bg-blue-500/5 border-blue-500/10"
                    : "bg-card/40 border-border/50",
                isLatest && "ring-1 ring-primary/20 shadow-lg shadow-primary/5",
                expanded ? "shadow-md" : "hover:bg-card/60"
            )}
        >
            {/* Header — always visible */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-4 p-4 text-left transition-colors"
            >
                {/* Avatar circle */}
                <div
                    className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 shadow-sm",
                        isSent
                            ? "bg-blue-500/20 text-blue-600 dark:text-blue-300 ring-1 ring-blue-500/30"
                            : "bg-muted text-muted-foreground ring-1 ring-border"
                    )}
                >
                    {(message.from?.charAt(0) || '?').toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm truncate">
                            {message.from}
                        </span>
                        {isSent && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/10">
                                You
                            </span>
                        )}
                    </div>
                    {!expanded && (
                        <p className="text-xs text-muted-foreground truncate opacity-80">
                            {message.snippet}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground/70 font-medium">
                        {formatDistanceToNow(new Date(message.date), { addSuffix: true })}
                    </span>
                    <div className={cn("p-1 rounded-full bg-muted/40 transition-transform duration-300", expanded && "rotate-180")}>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
            </button>

            {/* Body — expandable */}
            <div
                className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
            >
                <div className="overflow-hidden">
                    <div className="border-t border-border/40 px-6 pb-6 pt-2">
                        {message.to && (
                            <div className="text-xs text-muted-foreground mb-4 bg-muted/30 inline-block px-2 py-1 rounded-md">
                                <span className="opacity-70">To: </span>
                                <span className="font-medium text-foreground">{message.to}</span>
                            </div>
                        )}
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <EmailBody html={message.bodyHtml} text={message.bodyText || message.snippet} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Email Detail with Thread ───────────────────────────────── */

function extractEmailAddress(from: string): string {
    const match = from.match(/<(.+?)>/);
    return match ? match[1] : from;
}

function EmailDetail({ email, onBack }: { email: Email; onBack: () => void }) {
    const { openCompose, updateField, setReplyContext } = useComposeStore();
    const { removeEmail } = useMailStore();
    const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
    const [loadingThread, setLoadingThread] = useState(false);
    const [trashing, setTrashing] = useState(false);

    // Fetch thread when detail opens
    useEffect(() => {
        if (email.threadId) {
            setLoadingThread(true);
            fetchThread(email.threadId)
                .then((messages: ThreadMessage[]) => {
                    setThreadMessages(messages);
                })
                .catch((err: unknown) => {
                    console.error('Failed to load thread:', err);
                    setThreadMessages([]);
                })
                .finally(() => setLoadingThread(false));
        }
    }, [email.threadId]);

    const handleReply = () => {
        const replyTo = extractEmailAddress(email.from);
        const replySubject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;

        openCompose();
        setReplyContext(email.id, email.threadId);
        setTimeout(() => {
            updateField('to', replyTo);
            updateField('subject', replySubject);
            updateField('body', '');
        }, 50);
    };

    const handleTrash = async () => {
        setTrashing(true);
        // Optimistic removal
        removeEmail(email.id);
        onBack();
        try {
            await trashEmail(email.id);
            toast.success('Email moved to trash');
        } catch (err) {
            console.error('Failed to trash email:', err);
            toast.error('Failed to move email to trash');
        } finally {
            setTrashing(false);
        }
    };

    const hasThread = threadMessages.length > 1;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
            {/* Top bar - Fixed visibility by making it opaque and matching parent padding for sticky positioning */}
            <div className="sticky top-[-1rem] md:top-[-1.5rem] z-20 flex items-center gap-4 bg-background px-4 py-4 -mt-4 md:-mt-6 -mx-4 md:-mx-6 border-b border-border shadow-sm transition-all duration-200">
                <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-accent/50">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold truncate leading-tight">{email.subject}</h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {hasThread ? (
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
                                {threadMessages.length} messages
                            </span>
                        ) : (
                            <span>From: <span className="text-foreground font-medium">{email.from}</span></span>
                        )}
                    </div>
                </div>
                <div className="flex gap-1 bg-card/50 p-1 rounded-lg border border-border/50 shadow-sm">
                    <Button variant="ghost" size="icon" onClick={handleReply} title="Reply" className="hover:text-primary">
                        <Reply className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Forward" className="hover:text-primary">
                        <Forward className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-6 bg-border mx-1 my-auto" />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleTrash}
                        disabled={trashing}
                        title="Move to trash"
                        className="hover:text-destructive hover:bg-destructive/10"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Thread messages */}
            {loadingThread ? (
                <div className="space-y-4">
                    {[1, 2].map(i => (
                        <div key={i} className="rounded-xl border p-6 animate-pulse bg-card/30">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-10 w-10 rounded-full bg-muted/50" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 bg-muted/50 rounded w-1/4" />
                                    <div className="h-3 bg-muted/30 rounded w-1/6" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-4 bg-muted/30 rounded w-full" />
                                <div className="h-4 bg-muted/30 rounded w-5/6" />
                                <div className="h-4 bg-muted/30 rounded w-4/6" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : hasThread ? (
                <div className="space-y-4">
                    {threadMessages.map((msg, idx) => (
                        <ThreadMessageCard
                            key={msg.id}
                            message={msg}
                            isLatest={idx === threadMessages.length - 1}
                            defaultExpanded={idx === threadMessages.length - 1}
                        />
                    ))}
                </div>
            ) : (
                /* Single email — no thread */
                <div className="bg-card/50 rounded-xl border border-border/50 overflow-hidden shadow-sm">
                    <div className="flex items-center gap-4 p-6 border-b border-border/40 bg-muted/5">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white shadow-lg">
                            {email.from.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold text-base text-foreground">{email.from}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                                {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                            </div>
                        </div>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none p-2">
                        <EmailBody html={email.bodyHtml} text={email.bodyText || email.snippet} />
                    </div>
                </div>
            )}

            {/* Quick reply at the bottom */}
            <Button
                size="lg"
                className="self-start gap-2 shadow-lg"
                onClick={handleReply}
            >
                <Reply className="h-5 w-5" />
                Reply to conversation
            </Button>
        </div>
    );
}

/* ─── Email List ─────────────────────────────────────────────── */

export function EmailList({ emails, selectedId, onSelect }: EmailListProps) {
    const { markAsRead: markReadInStore, view } = useMailStore();
    const selectedEmail = emails.find(e => e.id === selectedId);

    const handleSelect = async (id: string) => {
        const email = emails.find(e => e.id === id);
        if (email && !email.isRead) {
            markReadInStore(id);
            try {
                await markAsRead([id]);
            } catch (e) {
                console.error('Failed to mark as read on server:', e);
            }
        }
        onSelect?.(id);
    };

    if (selectedEmail) {
        return <EmailDetail email={selectedEmail} onBack={() => onSelect?.('')} />;
    }

    if (emails.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-card/30 rounded-xl border border-dashed border-border/50">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                    <Mail className="h-8 w-8 opacity-50" />
                </div>
                <p className="font-medium">No emails found</p>
                <p className="text-sm opacity-60">Your inbox is empty</p>
            </div>
        );
    }

    const isSentView = view === 'sent';

    return (
        <div className="flex flex-col gap-3 pb-20">
            {emails.map((email, index) => (
                <button
                    key={email.id}
                    className={cn(
                        "group relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all duration-300 hover:scale-[1.01]",
                        selectedId === email.id
                            ? "bg-primary/10 border-primary/20 shadow-lg shadow-primary/5"
                            : "bg-card/50 hover:bg-card hover:border-border/80 border-transparent hover:shadow-md backdrop-blur-sm",
                        !email.isRead && "bg-card/80 border-l-4 border-l-primary font-medium"
                    )}
                    style={{
                        animation: `fadeIn 0.5s ease-out ${index * 0.05}s both`
                    }}
                    onClick={() => handleSelect(email.id)}
                    data-email-id={email.id}
                >
                    <div className="flex w-full items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ring-1 ring-inset",
                                !email.isRead ? "bg-primary text-primary-foreground ring-transparent" : "bg-muted text-muted-foreground ring-border"
                            )}>
                                {(isSentView ? (email.to || '?') : (email.from || '?')).charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                                <span className={cn("text-sm transition-colors", !email.isRead ? "font-semibold text-foreground" : "font-medium text-muted-foreground group-hover:text-foreground")}>
                                    {isSentView ? (email.to || 'Unknown') : email.from}
                                </span>
                                <span className="text-[10px] text-muted-foreground/60">
                                    {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="pl-11 w-full space-y-1">
                        <div className={cn("text-sm leading-none transition-colors", !email.isRead ? "font-semibold text-foreground" : "font-medium text-muted-foreground group-hover:text-foreground")}>
                            {email.subject}
                        </div>
                        <div className="line-clamp-2 text-xs text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">
                            {email.snippet}
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}
