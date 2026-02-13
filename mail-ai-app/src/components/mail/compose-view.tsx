'use client';

import { useState } from 'react';
import { useComposeStore } from '@/lib/store/compose-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { sendEmail, saveDraft, replyToEmail } from '@/actions/mail';
import { toast } from 'sonner';

export function ComposeView() {
    const {
        isOpen,
        isMinimized,
        to,
        subject,
        body,
        replyToMessageId,
        threadId,
        closeCompose,
        minimizeCompose,
        updateField,
        reset
    } = useComposeStore();
    const [showDraftPrompt, setShowDraftPrompt] = useState(false);

    const isReply = !!(replyToMessageId && threadId);

    const { mutate: handleSend, isPending: isSending } = useMutation({
        mutationFn: async () => {
            if (isReply) {
                await replyToEmail({
                    to,
                    subject,
                    body,
                    messageId: replyToMessageId!,
                    threadId: threadId!
                });
            } else {
                await sendEmail({ to, subject, body });
            }
        },
        onSuccess: () => {
            toast.success(isReply ? 'Reply sent!' : 'Email sent successfully!');
            reset();
            closeCompose();
        },
        onError: (error) => {
            toast.error('Failed to send email.');
            console.error(error);
        }
    });

    const { mutate: handleSaveDraft, isPending: isSavingDraft } = useMutation({
        mutationFn: async () => {
            await saveDraft({ to, subject, body });
        },
        onSuccess: () => {
            toast.success('Draft saved!');
            reset();
            closeCompose();
            setShowDraftPrompt(false);
        },
        onError: (error) => {
            toast.error('Failed to save draft.');
            console.error(error);
        }
    });

    const handleClose = () => {
        if ((to || subject || body) && !isSending) {
            setShowDraftPrompt(true);
        } else {
            closeCompose();
        }
    };

    const handleDiscard = () => {
        setShowDraftPrompt(false);
        reset();
        closeCompose();
    };

    if (!isOpen) return null;

    return (
        <div
            className={cn(
                "fixed bottom-0 right-8 w-full max-w-[600px] z-50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-2xl shadow-primary/10",
                isMinimized ? "translate-y-[calc(100%-48px)]" : "translate-y-0"
            )}
        >
            <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-t-xl overflow-hidden shadow-2xl ring-1 ring-border/50">
                {/* Header */}
                <div
                    className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => minimizeCompose()}
                >
                    <div className="font-semibold text-sm flex items-center gap-2">
                        {isReply ? 'Reply' : 'New Message'}
                        {isSavingDraft && <span className="text-xs text-muted-foreground font-normal animate-pulse">Saving draft...</span>}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg hover:bg-background/50"
                            onClick={(e) => { e.stopPropagation(); minimizeCompose(); }}
                        >
                            {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleClose(); }}
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                {/* Draft Prompt Overlay */}
                {showDraftPrompt && (
                    <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200">
                        <div className="text-center space-y-4 max-w-xs">
                            <h3 className="font-semibold text-lg">Save discard?</h3>
                            <p className="text-sm text-muted-foreground">You have unsaved changes. Do you want to save this draft before closing?</p>
                            <div className="flex gap-2 justify-center pt-2">
                                <Button variant="destructive" size="sm" onClick={handleDiscard}>
                                    Discard
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => setShowDraftPrompt(false)}>
                                    Cancel
                                </Button>
                                <Button size="sm" onClick={() => handleSaveDraft()} disabled={isSavingDraft}>
                                    {isSavingDraft ? 'Saving...' : 'Save Draft'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className={cn(
                    "flex flex-col bg-background/50 transition-all duration-300",
                    isMinimized ? "h-0 opacity-0" : "h-[600px] opacity-100"
                )}>
                    <div className="p-4 space-y-4 flex-1 flex flex-col">
                        <div className="space-y-1">
                            <Input
                                placeholder="To"
                                value={to}
                                onChange={(e) => updateField('to', e.target.value)}
                                className="border-0 border-b border-border/40 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary/50 focus-visible:outline-none bg-transparent h-10 transition-colors"
                            />
                            <Input
                                placeholder="Subject"
                                value={subject}
                                onChange={(e) => updateField('subject', e.target.value)}
                                className="border-0 border-b border-border/40 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary/50 focus-visible:outline-none bg-transparent h-10 font-medium text-lg transition-colors"
                            />
                        </div>

                        <Textarea
                            placeholder="Write your message..."
                            value={body}
                            onChange={(e) => updateField('body', e.target.value)}
                            className="flex-1 resize-none border-0 focus-visible:ring-0 p-0 bg-transparent text-base leading-relaxed"
                        />
                    </div>

                    <div className="p-4 border-t border-border/40 bg-muted/20 flex justify-between items-center backdrop-blur-sm">
                        <div className="flex gap-2">
                            {/* Toolbar placeholder */}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                <span className="font-serif italic font-bold">A</span>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                <span className="font-bold underline">U</span>
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={handleDiscard} className="text-muted-foreground hover:text-foreground">
                                Discard
                            </Button>
                            <Button onClick={() => handleSend()} disabled={isSending || (!to && !subject && !body)} className="min-w-[100px] shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                                {isSending ? (
                                    <span className="flex items-center gap-2">
                                        <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        Sending
                                    </span>
                                ) : (
                                    <span>{isReply ? "Reply" : "Send"}</span>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
