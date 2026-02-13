import { create } from 'zustand';
import { Email, EmailFilter } from '@/types/email';

interface MailState {
    emails: Email[];
    selectedEmailId: string | null;
    filter: EmailFilter;
    view: 'inbox' | 'sent' | 'trash' | 'archive' | 'drafts';
    isLoading: boolean;
    searchQuery: string;
    currentPage: number;
    nextPageToken: string | null;
    pageTokens: (string | undefined)[];
    dateFrom: string | null;
    dateTo: string | null;

    userProfile: { emailAddress: string } | null;

    setEmails: (emails: Email[]) => void;
    selectEmail: (id: string | null) => void;
    markAsRead: (id: string) => void;
    setFilter: (filter: EmailFilter) => void;
    setView: (view: 'inbox' | 'sent' | 'trash' | 'archive' | 'drafts') => void;
    setLoading: (loading: boolean) => void;
    removeEmail: (id: string) => void;
    setSearchQuery: (query: string) => void;
    setPage: (page: number) => void;
    setNextPageToken: (token: string | null) => void;
    resetPagination: () => void;
    setDateRange: (from: string | null, to: string | null) => void;
}

export const useMailStore = create<MailState>((set) => ({
    emails: [],
    selectedEmailId: null,
    filter: { labelIds: ['INBOX'] },
    view: 'inbox',
    isLoading: false,
    searchQuery: '',
    currentPage: 0,
    nextPageToken: null,
    pageTokens: [undefined],
    userProfile: null,
    dateFrom: null,
    dateTo: null,

    setEmails: (newEmails) => set((state) => {
        if (!Array.isArray(newEmails)) return state;
        return {
            emails: newEmails.map(newEmail => {
                const existing = state.emails.find(e => e.id === newEmail.id);
                if (existing && existing.isRead && !newEmail.isRead) {
                    return { ...newEmail, isRead: true };
                }
                return newEmail;
            })
        };
    }),
    selectEmail: (id) => set({ selectedEmailId: id }),
    markAsRead: (id) => set((state) => ({
        emails: state.emails.map(e =>
            e.id === id ? { ...e, isRead: true } : e
        )
    })),
    setFilter: (filter) => set((state) => ({ filter: { ...state.filter, ...filter } })),
    setView: (view) => set({
        view,
        filter: { labelIds: [view.toUpperCase()] },
        currentPage: 0,
        pageTokens: [undefined],
        nextPageToken: null,
        // Reset date range on view change? Maybe keep it? Let's keep it for now unless requested otherwise
    }),
    setLoading: (isLoading) => set({ isLoading }),
    removeEmail: (id) => set((state) => ({
        emails: state.emails.filter(e => e.id !== id),
        selectedEmailId: state.selectedEmailId === id ? null : state.selectedEmailId
    })),
    setSearchQuery: (query) => set({ searchQuery: query, currentPage: 0, pageTokens: [undefined], nextPageToken: null }),
    setPage: (page) => set({ currentPage: page }),
    setNextPageToken: (token) => set((state) => {
        const newPageTokens = [...state.pageTokens];
        if (token && !newPageTokens[state.currentPage + 1]) {
            newPageTokens[state.currentPage + 1] = token;
        }
        return { nextPageToken: token, pageTokens: newPageTokens };
    }),
    resetPagination: () => set({ currentPage: 0, pageTokens: [undefined], nextPageToken: null }),
    setUserProfile: (userProfile) => set({ userProfile }),
    setDateRange: (from, to) => set({ dateFrom: from, dateTo: to, currentPage: 0, pageTokens: [undefined], nextPageToken: null }),
}));
