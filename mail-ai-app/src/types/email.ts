// Email types based on Gmail API
export interface Email {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: EmailPayload;
  internalDate: string;
  sizeEstimate: number;
  historyId: string;
  from: string;
  to: string;
  subject: string;
  date: Date;
  body: string;
  bodyHtml?: string;
  bodyText?: string;
  isRead: boolean;
  hasAttachments: boolean;
}

export interface EmailPayload {
  partId?: string;
  mimeType: string;
  filename?: string;
  headers: EmailHeader[];
  body?: EmailBody;
  parts?: EmailPayload[];
}

export interface EmailHeader {
  name: string;
  value: string;
}

export interface EmailBody {
  attachmentId?: string;
  size: number;
  data?: string;
}

export interface EmailListResponse {
  emails: Email[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface EmailFilter {
  query?: string;
  q?: string; // Gmail native search query
  labelIds?: string[];
  maxResults?: number;
  pageToken?: string;
  from?: string;
  to?: string;
  subject?: string;
  after?: string;  // Date in format YYYY/MM/DD
  before?: string; // Date in format YYYY/MM/DD
  isUnread?: boolean;
}

export interface ComposeEmail {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
}

export interface EmailDraft extends ComposeEmail {
  id?: string;
  threadId?: string;
}

export type EmailView = 'inbox' | 'sent' | 'compose' | 'detail';
