'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, Sparkles, X, Mic } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { useAssistantStore } from '@/lib/store/assistant-store';
import { useMailStore } from '@/lib/store/mail-store';
import { useAIAction } from '@/hooks/use-ai-action';
import axios from 'axios';

function StreamingText({ text, onComplete }: { text: string; onComplete?: () => void }) {
    const [displayed, setDisplayed] = useState('');
    const indexRef = useRef(0);

    useEffect(() => {
        indexRef.current = 0;
        setDisplayed('');

        const interval = setInterval(() => {
            indexRef.current += 1;
            if (indexRef.current >= text.length) {
                setDisplayed(text);
                clearInterval(interval);
                onComplete?.();
            } else {
                setDisplayed(text.slice(0, indexRef.current));
            }
        }, 15); // 15ms per character for fast but visible streaming

        return () => clearInterval(interval);
    }, [text, onComplete]);

    return <>{displayed}<span className="animate-pulse">|</span></>;
}

export function AssistantPanel() {
    const [input, setInput] = useState('');
    const { messages, addMessage, isProcessing, setProcessing, isOpen, togglePanel } = useAssistantStore();
    const { emails, selectedEmailId, view } = useMailStore();
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { executeAction } = useAIAction();
    const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isProcessing, streamingMsgId]);

    const { mutate: sendMessage } = useMutation({
        mutationFn: async (text: string) => {
            setProcessing(true);

            const currentEmail = selectedEmailId
                ? emails.find(e => e.id === selectedEmailId)
                : null;

            // Send ALL emails (not just unread) so AI can search through them
            const emailContext = emails
                .slice(0, 20)
                .map(e => ({
                    id: e.id,
                    subject: e.subject,
                    sender: e.from,
                    snippet: e.snippet,
                    date: e.date,
                    isRead: e.isRead
                }));

            let userName = 'User';
            let userEmail = '';
            try {
                const profileRes = await axios.get('/api/auth/profile');
                userName = profileRes.data.name || 'User';
                userEmail = profileRes.data.email || '';
            } catch {
                // Ignore
            }

            // Build conversation history from recent messages (exclude the current one being sent)
            const chatHistory = messages
                .slice(-10)
                .map(m => ({ role: m.role, content: m.content }));

            const response = await axios.post('/api/assistant', {
                message: text,
                history: chatHistory,
                context: {
                    currentView: view,
                    currentEmail: currentEmail ? {
                        id: currentEmail.id,
                        from: currentEmail.from,
                        subject: currentEmail.subject,
                        snippet: currentEmail.snippet,
                        bodyText: currentEmail.bodyText || currentEmail.body || currentEmail.snippet,
                        date: currentEmail.date
                    } : null,
                    emails: emailContext,
                    userName,
                    userEmail
                }
            });
            return response.data;
        },
        onSuccess: async (data: any) => {
            setProcessing(false);

            if (data.message) {
                const msg = addMessage({ role: 'assistant', content: data.message });
                // Stream the last message
                setStreamingMsgId(msg.id);
            } else if (!data.action) {
                addMessage({ role: 'assistant', content: "I processed that, but have nothing to say." });
            }

            if (data.action) {
                console.log("Received action:", data.action);
                // Small delay so user sees the message streaming before action fires
                await new Promise(r => setTimeout(r, 400));
                await executeAction(data.action);
            }

            // Refocus the input after everything completes
            setTimeout(() => inputRef.current?.focus(), 100);
        },
        onError: (error: any) => {
            setProcessing(false);
            addMessage({ role: 'assistant', content: "Sorry, I encountered an error. Please try again." });
            console.error(error);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    });

    const handleSend = () => {
        if (!input.trim() || isProcessing) return;
        const text = input;
        addMessage({ role: 'user', content: text });
        setInput('');
        sendMessage(text);
    };

    const [dimensions, setDimensions] = useState({ width: 400, height: 600 });

    return (
        <>
            {/* Toggle Button (only when closed) */}
            {!isOpen && (
                <div className="fixed bottom-6 right-10 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Button
                        onClick={togglePanel}
                        className="rounded-full h-14 w-14 shadow-2xl shadow-primary/30 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 hover:scale-110 ring-2 ring-white/20"
                    >
                        <Sparkles className="h-7 w-7 text-white" />
                    </Button>
                </div>
            )}

            {/* Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        drag
                        dragMomentum={false}
                        dragConstraints={{ left: -1000, right: 0, top: -1000, bottom: 0 }}
                        initial={{ x: 400, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 400, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        style={{ width: dimensions.width, height: dimensions.height }}
                        className="fixed bottom-6 right-6 z-40 max-w-[90vw] max-h-[90vh]"
                    >
                        <div className="h-full w-full bg-background/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl ring-1 ring-white/10 relative">
                            {/* Resize Handle (Top-Left) */}
                            <motion.div
                                drag
                                dragMomentum={false}
                                onDrag={(_, info) => {
                                    setDimensions(prev => ({
                                        width: Math.max(300, Math.min(800, prev.width - info.delta.x)),
                                        height: Math.max(400, Math.min(900, prev.height - info.delta.y))
                                    }));
                                }}
                                dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
                                onDragEnd={() => { }}
                                className="absolute top-0 left-0 w-6 h-6 z-50 cursor-nw-resize flex items-center justify-center group"
                            >
                                <div className="w-1.5 h-1.5 bg-white/20 rounded-full group-hover:bg-primary transition-colors" />
                            </motion.div>

                            {/* Header / Drag Handle */}
                            <div className="p-4 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent flex items-center justify-between cursor-grab active:cursor-grabbing select-none group/header pl-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center ring-1 ring-primary/30 group-hover/header:scale-110 transition-transform ai-sparkle-icon">
                                        <Sparkles className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-base leading-none">AI Companion</h2>
                                        <p className="text-xs text-muted-foreground mt-1 text-nowrap">Reposition or resize</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation(); // Don't trigger drag
                                        togglePanel();
                                    }}
                                    className="h-8 w-8 hover:bg-white/10 rounded-full"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth" ref={scrollRef}>
                                {messages.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
                                        <Bot className="h-12 w-12 text-muted-foreground" />
                                        <div className="space-y-1">
                                            <p className="font-medium">How can I help you today?</p>
                                            <p className="text-sm text-nowrap truncate">Ask me to draft an email or summarize inbox.</p>
                                        </div>
                                    </div>
                                )}
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                                            msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                                        )}
                                    >
                                        <div className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                                            msg.role === 'user' ? "bg-primary text-primary-foreground ring-1 ring-white/20" : "bg-card border border-border/50"
                                        )}>
                                            {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
                                        </div>
                                        <div className={cn(
                                            "rounded-2xl p-4 text-sm whitespace-pre-wrap shadow-sm",
                                            msg.role === 'user'
                                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                : "bg-card border border-border/50 rounded-tl-sm text-card-foreground"
                                        )}>
                                            {msg.role === 'assistant' && streamingMsgId === msg.id ? (
                                                <StreamingText
                                                    text={msg.content}
                                                    onComplete={() => setStreamingMsgId(null)}
                                                />
                                            ) : (
                                                msg.content
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isProcessing && (
                                    <div className="flex gap-3 animate-in fade-in duration-300">
                                        <div className="h-8 w-8 rounded-full bg-card border border-border/50 flex items-center justify-center shrink-0">
                                            <Bot className="h-4 w-4 text-primary animate-pulse" />
                                        </div>
                                        <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm p-4 text-sm flex items-center gap-1.5 shadow-sm h-12">
                                            <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 border-t border-white/5 bg-background/40 backdrop-blur-md">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleSend();
                                    }}
                                    className="relative flex items-center rounded-2xl bg-secondary/50 ring-1 ring-border/50 focus-within:ring-primary/30 focus-within:bg-secondary/80 transition-all"
                                >
                                    <Input
                                        ref={inputRef}
                                        placeholder="Message AI Assistant..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        disabled={isProcessing}
                                        className="flex-1 border-none bg-transparent h-12 px-4 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none placeholder:text-muted-foreground/50"
                                    />
                                    <div className="flex items-center gap-1 pr-2 shrink-0">
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            disabled={isProcessing}
                                            className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                            onClick={() => {
                                                toast.info('Voice input coming soon!', {
                                                    description: 'Speech-to-text will be available in a future update.',
                                                });
                                            }}
                                        >
                                            <Mic className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="submit"
                                            size="icon"
                                            disabled={isProcessing || !input.trim()}
                                            className={cn(
                                                "h-8 w-8 rounded-full transition-all duration-200",
                                                input.trim()
                                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-110"
                                                    : "bg-transparent text-muted-foreground/40"
                                            )}
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
