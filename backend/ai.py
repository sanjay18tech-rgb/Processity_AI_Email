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

class EmailSummary(BaseModel):
    id: str
    subject: str
    sender: str  # 'from' is reserved in Python
    snippet: str
    date: str
    isRead: bool

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
        for i, e in enumerate(context.emails[:20]):  # Limited to 20 for better search coverage
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
2. navigate - Switch views. Fields: type, view (inbox|sent|compose|drafts|trash)
3. search - Search the current view. Fields: type, query
4. filter - Apply filters. Fields: type, filters (dictionary with keys: isUnread, after, before). Dates must be YYYY/MM/DD. For a single day X, use after=X-1_day and before=X+1_day.
5. open_email - Open an email by ID. Fields: type, emailId
6. summarize - Summarize one or more emails. Fields: type, emailIds (array), summary (your summary text)
7. reply - Reply to an email. Fields: type, emailId, body
8. send - Send the currently composed email. Fields: type
9. save_draft - Save the currently composed email as a draft. Fields: type
10. clear_filters - Clear filters. Fields: type
11. gmail_search - FALLBACK: search the user's entire Gmail mailbox (subject + body). Fields: type, query. Use this ONLY when the email is NOT found in the loaded list above. The query should be a Gmail search query (e.g. "from:john salary slip", "subject:interview", "meeting notes").
12. logout - Log the user out of the application. Fields: type
13. discard_compose - Discard the current email draft. Fields: type, saveDraft (boolean), needsConfirmation (boolean)

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

COMPOSING, SENDING & DISCARDING:
- When the user asks you to "send an email" or "compose an email", use the "compose" action to pre-fill the compose form with to, subject, and body. Tell the user to review it.
- When the user says "send it", "yes send", "go ahead", "looks good send it" or similar AFTER a compose or reply action was just performed, use the "send" action to send the email that is currently in the compose form.
- When composing emails, use "{user_name}" as the sign-off name, never "[Your Name]".
- When the user asks to "discard" the current email/draft:
    - If they say "save and discard" or "save to draft", use "discard_compose" with "saveDraft": true.
    - If they say "just discard" or "delete it", use "discard_compose" with "saveDraft": false.
    - If they just say "discard" without specifying, use "discard_compose" with "needsConfirmation": true.
- When the user asks to "log out" or "sign out", use the "logout" action.

REPLYING:
- When the user asks to "reply to" an email, use the "reply" action with the emailId and body. Write the reply body on behalf of the user, sign off with "{user_name}". The to/subject will be auto-filled from the original email.

DRAFTS:
- When the user asks to "save as draft" or "save to drafts", use the "save_draft" action.

DATE-BASED QUERIES & FILTERING:
- When the user asks about emails from a SPECIFIC DATE or date range (e.g. "emails from Jan 5", "show me last week's emails"), you MUST return a "filter" action with the correct "after" and "before" dates in YYYY/MM/DD format, so the inbox view updates to show only those emails.
- For a single day (e.g. Jan 5 2026), use: "after": "2026/01/04", "before": "2026/01/06" (day before and day after).
- You may ALSO include a summary in the "message" field, but the filter action is REQUIRED so the user can see the filtered results in their inbox.
- Example response for "show me emails from Jan 5":
  {{"action": {{"type": "filter", "filters": {{"after": "2026/01/04", "before": "2026/01/06"}}}}, "message": "Filtering your inbox to show emails from January 5, 2026."}}

OPENING EMAILS FROM SEARCH/SUMMARY RESULTS:
- When the user asks to "show me", "open", or "read" a specific email that was mentioned in a PREVIOUS message in the conversation, look through the conversation history for the email's ID.
- Use the "open_email" action with the emailId from the prior search results or summaries.
- If you provided a list of emails in a previous message, match the user's description to one of those emails and use its ID.
- NEVER say "I processed that, but have nothing to say." If you can identify the email from context, open it. If you can't, ask the user to clarify which email they mean.

HONESTY & LIMITATIONS:
- If you cannot perform the requested action, say so clearly. Example: "I'm not able to do that right now. Here's what I can help with: ..."
- Do NOT parrot or repeat the user's request back to them. Always provide a helpful, substantive response.
- If the user's request is ambiguous, ask for clarification instead of guessing.
- Keep messages concise and friendly.
"""

@router.post("/assistant")
async def chat_assistant(req: AssistantRequest):
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenRouter API Key missing")

    context = req.context or AIContext(currentView="inbox")
    system_prompt = build_system_prompt(context)

    messages = [
        {"role": "system", "content": system_prompt},
    ]
    
    # Add recent conversation history so the AI remembers prior actions
    if req.history:
        for msg in req.history[-10:]:  # Last 10 messages for context
            messages.append({"role": msg.role, "content": msg.content})
    
    # Add the current user message
    messages.append({"role": "user", "content": req.message})

    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
                "X-Title": "Mail AI App"
            },
            json={
                "model": "nvidia/nemotron-3-nano-30b-a3b:free",
                "messages": messages,
                "temperature": 0.5,
                "max_tokens": 1500
            }
        )

        if response.status_code != 200:
            print(f"OpenRouter Error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"AI Provider Error: {response.text}")

        data = response.json()
        content = data['choices'][0]['message']['content']
        
        print(f"[AI Raw Response]: {content[:500]}")
        
        # Try to parse JSON from content
        try:
             # Basic JSON cleanup if model includes markdown
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            parsed_content = json.loads(content)
            
            # Ensure message field always exists
            if not parsed_content.get("message"):
                # Try to construct a message from action or summary
                action = parsed_content.get("action")
                if action:
                    action_type = action.get("type", "unknown")
                    if action_type == "summarize":
                        parsed_content["message"] = action.get("summary", "Here's a summary of your emails.")
                    elif action_type == "compose":
                        parsed_content["message"] = f"Composing an email to {action.get('to', 'the recipient')}. Please review and confirm to send."
                    elif action_type == "open_email":
                        parsed_content["message"] = "Opening that email for you."
                    elif action_type == "navigate":
                        parsed_content["message"] = f"Navigating to {action.get('view', 'the requested view')}."
                    elif action_type == "send":
                        parsed_content["message"] = "Sending the email now..."
                    else:
                        parsed_content["message"] = f"Performing action: {action_type}"
                else:
                    parsed_content["message"] = content  # Fallback to raw content
            
            print(f"[AI Parsed]: message={parsed_content.get('message', 'NONE')[:100]}, action={parsed_content.get('action', {}).get('type', 'NONE') if parsed_content.get('action') else 'NONE'}")
            return parsed_content
        except json.JSONDecodeError:
            print(f"Failed to parse JSON: {content}")
            return {
                "message": content,
                "action": None
            }

    except Exception as e:
        print(f"AI Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
