import { create } from 'zustand';

interface ComposeState {
    isOpen: boolean;
    to: string;
    subject: string;
    body: string;
    isMinimized: boolean;
    // Reply context
    replyToMessageId: string | null;
    threadId: string | null;

    openCompose: () => void;
    closeCompose: () => void;
    minimizeCompose: () => void;
    updateField: (field: 'to' | 'subject' | 'body', value: string) => void;
    reset: () => void;
    setReplyContext: (messageId: string, threadId: string) => void;
}

export const useComposeStore = create<ComposeState>((set) => ({
    isOpen: false,
    to: '',
    subject: '',
    body: '',
    isMinimized: false,
    replyToMessageId: null,
    threadId: null,

    openCompose: () => set({ isOpen: true, isMinimized: false }),
    closeCompose: () => set({ isOpen: false }),
    minimizeCompose: () => set((state) => ({ isMinimized: !state.isMinimized })),
    updateField: (field, value) => set((state) => ({ ...state, [field]: value })),
    reset: () => set({ to: '', subject: '', body: '', replyToMessageId: null, threadId: null }),
    setReplyContext: (messageId, threadId) => set({ replyToMessageId: messageId, threadId }),
}));
