import { create } from 'zustand';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface AssistantState {
    messages: Message[];
    isProcessing: boolean;
    isOpen: boolean;

    addMessage: (message: Message | Omit<Message, 'id'>) => Message;
    setProcessing: (isProcessing: boolean) => void;
    togglePanel: () => void;
    setOpen: (isOpen: boolean) => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
    messages: [
        { id: 'welcome', role: 'assistant', content: 'Hello! I can help you manage your emails. Try asking me to "compose an email" or "find emails from John".' }
    ],
    isProcessing: false,
    isOpen: true,

    addMessage: (message) => {
        const newMsg = { ...message, id: Date.now().toString() };
        set((state) => ({ messages: [...state.messages, newMsg] }));
        return newMsg;
    },
    setProcessing: (isProcessing) => set({ isProcessing }),
    togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
    setOpen: (isOpen) => set({ isOpen }),
}));
