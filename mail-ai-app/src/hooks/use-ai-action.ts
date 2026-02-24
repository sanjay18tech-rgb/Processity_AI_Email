import { useRouter } from 'next/navigation';
import { useMailStore } from '@/lib/store/mail-store';
import { useComposeStore } from '@/lib/store/compose-store';
import { useAssistantStore } from '@/lib/store/assistant-store';
import { AIAction } from '@/types/ai';
import { sendEmail, saveDraft, replyToEmail, searchEmails } from '@/actions/mail';
import { toast } from 'sonner';
import axios from 'axios';

/**
 * Typewriter effect: sets characters one-by-one into a compose field.
 */
function typewriterField(
    updateField: (field: 'to' | 'subject' | 'body', value: string) => void,
    field: 'to' | 'subject' | 'body',
    text: string,
    charDelay: number = 20
): Promise<void> {
    return new Promise((resolve) => {
        let i = 0;
        const interval = setInterval(() => {
            i++;
            updateField(field, text.slice(0, i));
            if (i >= text.length) {
                clearInterval(interval);
                resolve();
            }
        }, charDelay);
    });
}

/**
 * Triggers a CSS animation on a specific email row.
 */
function highlightEmailRow(emailId: string) {
    setTimeout(() => {
        const emailElements = document.querySelectorAll('[data-email-id]');
        emailElements.forEach(el => {
            if (el.getAttribute('data-email-id') === emailId) {
                el.classList.add('ai-highlight');
                setTimeout(() => el.classList.remove('ai-highlight'), 1500);
            }
        });
    }, 100);
}

function extractEmailAddress(from: string): string {
    const match = from.match(/<(.+?)>/);
    return match ? match[1] : from;
}

export function useAIAction() {
    const router = useRouter();
    const { setFilter, setView, selectEmail, emails } = useMailStore();
    const { openCompose, updateField, reset, closeCompose, setReplyContext } = useComposeStore();
    const { addMessage, setProcessing } = useAssistantStore();

    const executeAction = async (action: AIAction) => {
        console.log('Executing AI Action:', action);

        // Visual indicator in assistant panel sparkle icon
        const sparkle = document.querySelector('.ai-sparkle-icon');
        if (sparkle) {
            sparkle.classList.add('ai-highlight');
            setTimeout(() => sparkle.classList.remove('ai-highlight'), 1000);
        }

        switch (action.type) {
            case 'compose': {
                const composeBtn = document.querySelector('[data-nav-item="compose"]');
                if (composeBtn) {
                    composeBtn.classList.add('ai-highlight');
                    setTimeout(() => composeBtn.classList.remove('ai-highlight'), 1000);
                }
                openCompose();
                await new Promise(r => setTimeout(r, 400));
                await typewriterField(updateField, 'to', action.to || '', 25);
                await typewriterField(updateField, 'subject', action.subject || '', 20);
                await typewriterField(updateField, 'body', action.body || '', 10);
                toast.success(`Composing email to ${action.to}`);
                break;
            }

            case 'reply': {
                // Find the email being replied to
                const emailToReply = emails.find(e => e.id === action.emailId);
                if (!emailToReply) {
                    toast.error('Could not find the email to reply to.');
                    break;
                }

                const replyTo = extractEmailAddress(emailToReply.from);
                const replySubject = emailToReply.subject.startsWith('Re:')
                    ? emailToReply.subject
                    : `Re: ${emailToReply.subject}`;

                openCompose();
                setReplyContext(emailToReply.id, emailToReply.threadId);
                await new Promise(r => setTimeout(r, 200));

                await typewriterField(updateField, 'to', replyTo, 25);
                await typewriterField(updateField, 'subject', replySubject, 20);
                await typewriterField(updateField, 'body', action.body || '', 10);
                toast.success(`Replying to ${emailToReply.from}`);
                break;
            }

            case 'navigate': {
                selectEmail(null);
                const sidebarBtns = document.querySelectorAll('[data-nav-item]');
                sidebarBtns.forEach(btn => {
                    if (btn.getAttribute('data-nav-item') === action.view) {
                        btn.classList.add('ai-highlight');
                        setTimeout(() => btn.classList.remove('ai-highlight'), 1000);
                    }
                });

                if (action.view === 'compose') {
                    openCompose();
                } else {
                    setView(action.view);
                    await new Promise(r => setTimeout(r, 300));
                    router.push(`/${action.view}`);
                }
                toast.info(`Navigated to ${action.view}`);
                break;
            }

            case 'filter':
                if (action.filters) {
                    const { after, before, ...otherFilters } = action.filters;

                    // Set date filters in both the filter object (for inbox query) and date range state (for date picker UI)
                    if (after || before) {
                        const { setDateRange } = useMailStore.getState();
                        setDateRange(after || null, before || null);
                        // Also update filter.after/before so the inbox query uses them
                        setFilter({ ...otherFilters, after: after || undefined, before: before || undefined });
                    } else if (Object.keys(otherFilters).length > 0) {
                        setFilter(otherFilters);
                    }
                }
                toast.info('Filters applied');
                break;

            case 'search':
                const searchInput = document.querySelector('input[placeholder="Search emails..."]');
                if (searchInput) {
                    searchInput.classList.add('ai-highlight');
                    setTimeout(() => searchInput.classList.remove('ai-highlight'), 1000);
                }
                if (action.filters) {
                    setFilter({ ...action.filters, query: action.query });
                } else {
                    setFilter({ query: action.query });
                }
                toast.info(`Searching for: ${action.query}`);
                break;

            case 'open_email':
                highlightEmailRow(action.emailId);
                await new Promise(r => setTimeout(r, 600));
                selectEmail(action.emailId);
                toast.info('Opening email');
                break;

            case 'send': {
                const state = useComposeStore.getState();
                const currentTo = state.to;
                const currentSubject = state.subject;
                const currentBody = state.body;
                const replyMsgId = state.replyToMessageId;
                const replyThreadId = state.threadId;

                if (!currentTo) {
                    toast.error('No recipient specified. Please compose an email first.');
                    break;
                }

                try {
                    if (replyMsgId && replyThreadId) {
                        await replyToEmail({
                            to: currentTo,
                            subject: currentSubject,
                            body: currentBody,
                            messageId: replyMsgId,
                            threadId: replyThreadId
                        });
                        toast.success('Reply sent!');
                    } else {
                        await sendEmail({ to: currentTo, subject: currentSubject, body: currentBody });
                        toast.success('Email sent successfully!');
                    }
                    reset();
                    closeCompose();
                } catch (error) {
                    console.error('Send failed:', error);
                    toast.error('Failed to send email. Please try again.');
                }
                break;
            }

            case 'save_draft': {
                const draftTo = useComposeStore.getState().to;
                const draftSubject = useComposeStore.getState().subject;
                const draftBody = useComposeStore.getState().body;

                if (!draftTo && !draftSubject && !draftBody) {
                    toast.error('Nothing to save as draft.');
                    break;
                }

                try {
                    await saveDraft({ to: draftTo, subject: draftSubject, body: draftBody });
                    toast.success('Draft saved!');
                    reset();
                    closeCompose();
                } catch (error) {
                    console.error('Save draft failed:', error);
                    toast.error('Failed to save draft. Please try again.');
                }
                break;
            }

            case 'summarize':
                toast.info('Email summary generated');
                break;

            case 'gmail_search': {
                // Fallback: search entire Gmail mailbox
                toast.info(`Searching your mailbox for: "${action.query}"`);
                setProcessing(true);

                try {
                    // 1. Call Gmail search
                    const results = await searchEmails(action.query, 5);

                    if (!results || results.length === 0) {
                        addMessage({
                            role: 'assistant',
                            content: `I searched your entire mailbox for "${action.query}" but couldn't find any matching emails.`
                        });
                        setProcessing(false);
                        break;
                    }

                    // 2. Always load search results into the store so open_email works
                    const { setEmails, setDateRange } = useMailStore.getState();
                    if (typeof setEmails === 'function') {
                        setEmails(results);
                    }

                    // 3. Parse date filters from gmail query (after:YYYY/MM/DD before:YYYY/MM/DD)
                    const afterMatch = action.query.match(/after:(\d{4}\/\d{2}\/\d{2})/i);
                    const beforeMatch = action.query.match(/before:(\d{4}\/\d{2}\/\d{2})/i);
                    if (afterMatch || beforeMatch) {
                        setDateRange(
                            afterMatch ? afterMatch[1] : null,
                            beforeMatch ? beforeMatch[1] : null
                        );
                    }

                    // 4. Build a summary of search results and send to AI for summarization
                    const resultsSummary = results.map((r: { id: string; from: string; subject: string; snippet: string; date: string }, i: number) =>
                        `${i + 1}. ID:${r.id} | From: ${r.from} | Subject: ${r.subject} | Date: ${r.date}\n   Preview: ${r.snippet}`
                    ).join('\n');

                    const followUpResponse = await axios.post('/api/assistant', {
                        message: `I searched the user's Gmail and found these results for "${action.query}":\n\n${resultsSummary}\n\nPlease summarize what was found and tell the user. Include the email IDs in your context so the user can ask to open specific emails later. If any email closely matches what they were looking for, mention it specifically with its details.`,
                        context: {
                            currentView: 'search_results',
                            emails: results.slice(0, 5).map((r: { id: string; from: string; subject: string; snippet: string; date: string; isRead: boolean }) => ({
                                id: r.id,
                                subject: r.subject,
                                sender: r.from,
                                snippet: r.snippet,
                                date: r.date,
                                isRead: r.isRead
                            }))
                        }
                    });

                    const summaryMsg = followUpResponse.data?.message || `Found ${results.length} result(s) for "${action.query}".`;
                    addMessage({ role: 'assistant', content: summaryMsg });

                    // 5. If the AI returned a secondary action, execute it
                    const followUpAction = followUpResponse.data?.action;
                    if (followUpAction) {
                        await new Promise(r => setTimeout(r, 500));
                        await executeAction(followUpAction);
                    }
                } catch (error) {
                    console.error('Gmail search failed:', error);
                    addMessage({
                        role: 'assistant',
                        content: 'Sorry, the Gmail search failed. Please try again.'
                    });
                } finally {
                    setProcessing(false);
                }
                break;
            }

            case 'clear_filters':
                setFilter({});
                toast.info('Filters cleared');
                break;

            case 'logout':
                const logoutBtn = document.querySelector('[data-nav-item="logout"]');
                if (logoutBtn) {
                    logoutBtn.classList.add('ai-highlight');
                    setTimeout(() => logoutBtn.classList.remove('ai-highlight'), 1000);
                }
                toast.info('Logging out...');
                await new Promise(r => setTimeout(r, 800)); // Visual delay
                try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                    window.location.href = '/';
                } catch (error) {
                    console.error('Logout failed', error);
                    toast.error('Logout failed');
                }
                break;

            case 'discard_compose':
                if (action.needsConfirmation) {
                    addMessage({
                        role: 'assistant',
                        content: 'Do you want to save this draft before discarding?',
                        action: undefined // Clear action to stop loop
                    });
                    // Here we ideally should have a way to set pending context, but for now relying on user reply
                    break;
                }

                if (action.saveDraft) {
                    const draftTo = useComposeStore.getState().to;
                    const draftSubject = useComposeStore.getState().subject;
                    const draftBody = useComposeStore.getState().body;
                    try {
                        await saveDraft({ to: draftTo, subject: draftSubject, body: draftBody });
                        toast.success('Draft saved and discarded.');
                    } catch (error) {
                        toast.error('Failed to save draft.');
                    }
                } else {
                    toast.info('Draft discarded.');
                }

                reset();
                closeCompose();
                break;

            default:
                console.warn('Unknown action type:', action);
        }
    };

    return { executeAction };
}
