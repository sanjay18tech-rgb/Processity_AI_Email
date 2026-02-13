from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import base64
from email.message import EmailMessage

router = APIRouter(prefix="/api/mail", tags=["mail"])

class EmailFilter(BaseModel):
    labelIds: Optional[List[str]] = ['INBOX']
    maxResults: Optional[int] = 20
    q: Optional[str] = None

class ComposeEmail(BaseModel):
    to: EmailStr
    subject: str
    body: str

def get_gmail_service(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    creds = Credentials(token=token)
    return build('gmail', 'v1', credentials=creds)

def extract_body(payload):
    """Recursively extract the email body from the payload."""
    body_html = ""
    body_text = ""
    
    mime_type = payload.get('mimeType', '')
    
    # Direct body
    if 'body' in payload and payload['body'].get('data'):
        data = payload['body']['data']
        decoded = base64.urlsafe_b64decode(data).decode('utf-8', errors='replace')
        if 'html' in mime_type:
            body_html = decoded
        else:
            body_text = decoded
    
    # Multipart - recurse into parts
    if 'parts' in payload:
        for part in payload['parts']:
            part_mime = part.get('mimeType', '')
            if part_mime == 'text/html':
                if part.get('body', {}).get('data'):
                    body_html = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='replace')
            elif part_mime == 'text/plain':
                if part.get('body', {}).get('data'):
                    body_text = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='replace')
            elif 'multipart' in part_mime:
                # Recurse into nested multipart
                sub_html, sub_text = extract_body_recursive(part)
                if sub_html:
                    body_html = sub_html
                if sub_text and not body_text:
                    body_text = sub_text
    
    return body_html, body_text

def extract_body_recursive(payload):
    """Helper for nested multipart extraction."""
    html = ""
    text = ""
    if 'parts' in payload:
        for part in payload['parts']:
            part_mime = part.get('mimeType', '')
            if part_mime == 'text/html' and part.get('body', {}).get('data'):
                html = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='replace')
            elif part_mime == 'text/plain' and part.get('body', {}).get('data'):
                text = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='replace')
            elif 'multipart' in part_mime:
                sub_html, sub_text = extract_body_recursive(part)
                if sub_html:
                    html = sub_html
                if sub_text and not text:
                    text = sub_text
    return html, text

@router.post("/list")
async def list_emails(filter: EmailFilter, service = Depends(get_gmail_service)):
    try:
        results = service.users().messages().list(
            userId='me',
            labelIds=filter.labelIds,
            maxResults=filter.maxResults,
            q=filter.q
        ).execute()
        
        messages = results.get('messages', [])
        email_list = []
        
        if messages:
            batch = service.new_batch_http_request()
            
            def callback(request_id, response, exception):
                if exception:
                    print(f"Error getting message {request_id}: {exception}")
                else:
                    headers = response['payload']['headers']
                    subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '(no subject)')
                    curr_from = next((h['value'] for h in headers if h['name'] == 'From'), '(unknown)')
                    curr_to = next((h['value'] for h in headers if h['name'] == 'To'), '')
                    date = next((h['value'] for h in headers if h['name'] == 'Date'), '')
                    
                    # Extract full body
                    body_html, body_text = extract_body(response['payload'])
                    
                    email_list.append({
                        "id": response['id'],
                        "threadId": response['threadId'],
                        "labelIds": response.get('labelIds', []),
                        "snippet": response.get('snippet', ''),
                        "subject": subject,
                        "from": curr_from,
                        "to": curr_to,
                        "date": date,
                        "isRead": 'UNREAD' not in response.get('labelIds', []),
                        "bodyHtml": body_html,
                        "bodyText": body_text
                    })

            for msg in messages:
                # Use 'full' format to get complete body
                batch.add(service.users().messages().get(userId='me', id=msg['id'], format='full'), callback=callback)
            
            batch.execute()
            
        return email_list

    except Exception as e:
        print(f"Gmail API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/thread/{thread_id}")
async def get_thread(thread_id: str, service = Depends(get_gmail_service)):
    """Fetch all messages in a thread, sorted chronologically."""
    try:
        thread = service.users().threads().get(
            userId='me', id=thread_id, format='full'
        ).execute()
        
        thread_messages = []
        for msg in thread.get('messages', []):
            headers = msg['payload']['headers']
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '(no subject)')
            msg_from = next((h['value'] for h in headers if h['name'] == 'From'), '(unknown)')
            msg_to = next((h['value'] for h in headers if h['name'] == 'To'), '')
            date = next((h['value'] for h in headers if h['name'] == 'Date'), '')
            internal_date = int(msg.get('internalDate', 0))  # Epoch ms from Gmail
            
            body_html, body_text = extract_body(msg['payload'])
            
            thread_messages.append({
                "id": msg['id'],
                "threadId": msg['threadId'],
                "labelIds": msg.get('labelIds', []),
                "snippet": msg.get('snippet', ''),
                "subject": subject,
                "from": msg_from,
                "to": msg_to,
                "date": date,
                "internalDate": internal_date,
                "isRead": 'UNREAD' not in msg.get('labelIds', []),
                "bodyHtml": body_html,
                "bodyText": body_text
            })
        
        # Sort by internalDate for correct chronological order
        thread_messages.sort(key=lambda m: m['internalDate'])
        return thread_messages
    
    except Exception as e:
        print(f"Thread Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class SearchQuery(BaseModel):
    query: str
    maxResults: int = 10

@router.post("/search")
async def search_emails(search: SearchQuery, service = Depends(get_gmail_service)):
    """Full-text Gmail search across subjects, body, and metadata."""
    try:
        results = service.users().messages().list(
            userId='me',
            q=search.query,
            maxResults=search.maxResults
        ).execute()
        
        messages = results.get('messages', [])
        email_list = []
        
        if messages:
            batch = service.new_batch_http_request()
            
            def callback(request_id, response, exception):
                if exception:
                    print(f"Search error for {request_id}: {exception}")
                else:
                    headers = response['payload']['headers']
                    subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '(no subject)')
                    curr_from = next((h['value'] for h in headers if h['name'] == 'From'), '(unknown)')
                    date = next((h['value'] for h in headers if h['name'] == 'Date'), '')
                    
                    body_html, body_text = extract_body(response['payload'])
                    
                    email_list.append({
                        "id": response['id'],
                        "threadId": response['threadId'],
                        "labelIds": response.get('labelIds', []),
                        "snippet": response.get('snippet', ''),
                        "subject": subject,
                        "from": curr_from,
                        "date": date,
                        "isRead": 'UNREAD' not in response.get('labelIds', []),
                        "bodyHtml": body_html,
                        "bodyText": body_text
                    })
            
            for msg in messages:
                batch.add(service.users().messages().get(userId='me', id=msg['id'], format='full'), callback=callback)
            
            batch.execute()
        
        return email_list
    
    except Exception as e:
        print(f"Search Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send")
async def send_email(email: ComposeEmail, service = Depends(get_gmail_service)):
    try:
        message = EmailMessage()
        message.set_content(email.body)
        message['To'] = email.to
        message['Subject'] = email.subject
        
        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        create_message = {
            'raw': encoded_message
        }
        
        sent_message = service.users().messages().send(userId="me", body=create_message).execute()
        return sent_message
    except Exception as e:
        print(f"Send Email Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ReplyEmail(BaseModel):
    to: str
    subject: str
    body: str
    messageId: str  # message ID being replied to
    threadId: str   # thread ID for threading

@router.post("/reply")
async def reply_to_email(email: ReplyEmail, service = Depends(get_gmail_service)):
    try:
        # Get the original message to extract Message-ID header for threading
        original = service.users().messages().get(userId='me', id=email.messageId, format='metadata', metadataHeaders=['Message-ID']).execute()
        original_msg_id_header = ''
        for header in original.get('payload', {}).get('headers', []):
            if header['name'] == 'Message-ID':
                original_msg_id_header = header['value']
                break

        message = EmailMessage()
        message.set_content(email.body)
        message['To'] = email.to
        message['Subject'] = email.subject
        if original_msg_id_header:
            message['In-Reply-To'] = original_msg_id_header
            message['References'] = original_msg_id_header
        
        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        reply_message = service.users().messages().send(
            userId="me",
            body={
                'raw': encoded_message,
                'threadId': email.threadId
            }
        ).execute()
        return reply_message
    except Exception as e:
        print(f"Reply Email Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class MarkReadRequest(BaseModel):
    messageIds: List[str]

@router.post("/mark-read")
async def mark_as_read(req: MarkReadRequest, service = Depends(get_gmail_service)):
    try:
        for msg_id in req.messageIds:
            service.users().messages().modify(
                userId='me',
                id=msg_id,
                body={'removeLabelIds': ['UNREAD']}
            ).execute()
        return {"success": True}
    except Exception as e:
        print(f"Mark Read Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class DraftEmail(BaseModel):
    to: str = ""
    subject: str = ""
    body: str = ""

@router.post("/drafts/create")
async def create_draft(email: DraftEmail, service = Depends(get_gmail_service)):
    try:
        message = EmailMessage()
        message.set_content(email.body)
        if email.to:
            message['To'] = email.to
        message['Subject'] = email.subject
        
        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        draft = service.users().drafts().create(
            userId='me',
            body={'message': {'raw': encoded_message}}
        ).execute()
        return draft
    except Exception as e:
        print(f"Create Draft Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class TrashRequest(BaseModel):
    messageId: str

@router.post("/trash")
async def trash_email(req: TrashRequest, service = Depends(get_gmail_service)):
    """Move an email to trash."""
    try:
        service.users().messages().trash(
            userId='me',
            id=req.messageId
        ).execute()
        return {"success": True}
    except Exception as e:
        print(f"Trash Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))