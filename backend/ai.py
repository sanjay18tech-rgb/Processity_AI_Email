from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
import os
import json
import requests
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env.local")

router = APIRouter(prefix="/api", tags=["ai"])

class ChatMessage(BaseModel):
    role: str
    content: str

class AIContext(BaseModel):
    currentView: str = "inbox"
    currentEmail: Optional[Dict[str, Any]] = None
    emails: Optional[List[EmailSummary]] = None
    userName: Optional[str] = None
    userEmail: Optional[str] = None

class AssistantRequest(BaseModel):
    message: str
    context: Optional[AIContext] = None
    history: Optional[List[ChatMessage]] = None

def build_system_prompt(context: AIContext) -> str:
    user_name = context.userName or "User"
    user_email = context.userEmail or ""
    
    # Build email list context
    email_context = ""
    if context.emails:
        email_items = []
        for i, e in enumerate(context.emails[:20]):  # search coverage, limited to 20 for now
            read_status = "read" if e.isRead else "UNREAD"
            email_items.append(f"  {i+1}. ID:{e.id} | From: {e.sender} | Subject: {e.subject} | Date: {e.date} | Status: {read_status}\n     Preview: {e.snippet}")
        email_context = "\n".join(email_items)
    
    current_email_context = ""
    if context.currentEmail:
        ce = context.currentEmail
        body_text = ce.get('bodyText', ce.get('snippet', ''))
        current_email_context = f"""
Currently Viewed Email:
- ID: {ce.get('id', '')}
- From: {ce.get('from', '')}
- Subject: {ce.get('subject', '')}
- Preview: {ce.get('snippet', '')}
- Full Content: {body_text}
"""

    return f"""You are an AI assistant for {user_name}'s email application.
The user's name is {user_name} and their email is {user_email}.
When composing emails, always sign off with "{user_name}" (never "[Your Name]").

Current View: {context.currentView}

{f"Recent emails in {context.currentView} ({len(context.emails) if context.emails else 0} loaded):" if email_context else "No emails loaded in current view."}
{email_context}

{current_email_context}

You help users manage their email by executing structured actions.

CRITICAL: You must ALWAYS respond with valid JSON. Never respond with plain text.

Available Actions:
1. compose - Create a new email. Fields: type, to, subject, body
2. search - Search the current view. Fields: type, query
3. filter - Apply filters. Fields: type, filters
4. open_email - Open an email by ID. Fields: type, emailId
5. summarize - Summarize one or more emails. Fields: type, emailIds (array), summary (your summary text)
6. send - Send the currently composed email. Fields: type
7. gmail_search - FALLBACK: search the user's entire Gmail mailbox (subject + body). Fields: type, query. Use this ONLY when the email is NOT found in the loaded list above. The query should be a Gmail search query (e.g. "from:john salary slip", "subject:interview", "meeting notes").

Response Format (ALWAYS return JSON):
{{
  "action": {{
    "type": "action_type",
    "...fields": "based on action type"
  }},
  "message": "Friendly explanation of what you're doing",
  "needsConfirmation": false
}}

If no action is needed (e.g. answering a question, saying something wasn't found), you can omit the action field or set it to null:
{{
  "action": null,
  "message": "Your answer or explanation here"
}}

IMPORTANT RULES:

EMAIL LOOKUP & SEARCH (2-STEP PROCESS):
- Step 1: When the user asks "is there an email about X" or "do I have an email from Y" or "find email about Z", FIRST search through the email list above.
- Step 2: If you find a matching email in the list: use the "open_email" action with its ID AND include a summary of the email in your "message" field.
- Step 3 (FALLBACK): If NO matching email exists in the loaded list above, use the "gmail_search" action to search the user's entire Gmail mailbox. Write a helpful Gmail search query. Tell the user you're searching their mailbox.
- Construct good search queries: combine "from:", "subject:", and keywords. Example: for "email from abhijeet about interview" → query: "from:abhijeet interview"
- NEVER make up or hallucinate emails that don't exist in the list above.

SUMMARIZATION:
- When the user asks to summarize emails, use the actual email data provided above to generate a real summary. Return it in the "message" field AND as a summarize action.
- When the user asks "what was the last email about", find the most recent email in the list and summarize it.
- When opening/finding an email for the user, always include a brief summary in your message.

COMPOSING & SENDING:
- When the user asks you to "send an email" or "compose an email", use the "compose" action to pre-fill the compose form with to, subject, and body. Tell the user to review it.
- When composing emails, use "{user_name}" as the sign-off name, never "[Your Name]".


HONESTY & LIMITATIONS:
- If you cannot perform the requested action, say so clearly. Example: "I'm not able to do that right now. Here's what I can help with: ..."
- Do NOT parrot or repeat the user's request back to them. Always provide a helpful, substantive response.
- If the user's request is ambiguous, ask for clarification instead of guessing.
- Keep messages concise and friendly.
"""
