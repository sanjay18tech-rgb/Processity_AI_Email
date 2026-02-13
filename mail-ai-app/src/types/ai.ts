import { Email, EmailFilter, ComposeEmail } from './email';

// AI Provider Interface (provider-agnostic)
export interface AIProvider {
  chat(messages: ChatMessage[]): Promise<string>;
  generateAction(userInput: string, context: AIContext): Promise<AIAction>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIContext {
  currentView: string;
  currentEmail?: Email | null;
  recentEmails?: Email[];
  userEmail?: string;
}

// AI Actions - These are the structured outputs from the AI
export type AIAction =
  | ComposeAction
  | NavigateAction
  | SearchAction
  | FilterAction
  | OpenEmailAction
  | ReplyAction
  | SendAction
  | SaveDraftAction
  | SummarizeAction
  | GmailSearchAction
  | ClearAction;

export interface BaseAction {
  type: string;
  reasoning?: string; // Why AI chose this action
}

export interface ComposeAction extends BaseAction {
  type: 'compose';
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}

export interface NavigateAction extends BaseAction {
  type: 'navigate';
  view: 'inbox' | 'sent' | 'compose';
}

export interface SearchAction extends BaseAction {
  type: 'search';
  query: string;
  filters?: EmailFilter;
}

export interface FilterAction extends BaseAction {
  type: 'filter';
  filters: EmailFilter;
}

export interface OpenEmailAction extends BaseAction {
  type: 'open_email';
  emailId: string;
}

export interface ReplyAction extends BaseAction {
  type: 'reply';
  emailId: string;
  body: string;
}

export interface SendAction extends BaseAction {
  type: 'send';
  requireConfirmation?: boolean;
}

export interface SummarizeAction extends BaseAction {
  type: 'summarize';
  emailIds?: string[];
  summary?: string;
}

export interface SaveDraftAction extends BaseAction {
  type: 'save_draft';
}

export interface ClearAction extends BaseAction {
  type: 'clear_filters';
}

export interface GmailSearchAction extends BaseAction {
  type: 'gmail_search';
  query: string;
}

// AI Response Parsing
export interface ParsedAIResponse {
  action?: AIAction;
  message?: string;
  needsConfirmation?: boolean;
  error?: string;
}

// Assistant State
export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: AIAction;
  timestamp: Date;
}

export interface PendingAction {
  action: AIAction;
  message: string;
  requiresConfirmation: boolean;
}
