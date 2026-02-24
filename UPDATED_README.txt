
Mail AI — AI-Powered Email Assistant

An AI-powered email client that lets you manage your Gmail through natural language. Ask the assistant to compose emails, search your mailbox, navigate views, and more — it directly controls the UI.

Now featuring **Real-Time Gmail Webhooks** for instant updates!

---

## Setup & Run Locally

### Prerequisites:
- Node.js ≥ 18
- Python ≥ 3.9
- A Google Cloud project with Gmail API enabled
- An OpenRouter API key (for AI)
- **Ngrok** (Required for Gmail Webhooks)

---

### 1. Install & Configure Ngrok

To receive real-time updates (instead of using slow polling), we use Ngrok to tunnel Gmail notifications to your local machine.

**macOS (Homebrew):**
```bash
brew install ngrok/ngrok/ngrok
```

**Linux (Apt):**
```bash
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok
```

**Windows (Chocolatey):**
```bash
choco install ngrok
# Or download the ZIP from https://ngrok.com/download
```

**Authenticate Ngrok (Critical):**
To prevent session timeouts, you should add your Ngrok Authtoken (get it from [dashboard.ngrok.com](https://dashboard.ngrok.com/get-started/your-authtoken)):
```bash
ngrok config add-authtoken <YOUR_AUTHTOKEN>
```

---

### 2. Configure Live Webhooks (One-Time Setup)

1.  **Start Ngrok**:
    Run this in a separate terminal and keep it running:
    ```bash
    ngrok http 8000
    ```
    Copy the **Forwarding URL** (e.g., `https://<random-id>.ngrok-free.app`).

    > **Important**: The backend code (`mail.py`) is NOT dependent on this URL. However, **Google Cloud Pub/Sub IS**. If you restart Ngrok and get a new URL (free tier), you **MUST** update the Subscription Endpoint in Google Cloud Console.

2.  **Configure Google Cloud Pub/Sub**:
    - Go to [Google Cloud Pub/Sub](https://console.cloud.google.com/cloudpubsub/topic/list).
    - Create a Topic: `gmail-updates`.
    - **Add Principal**: `gmail-api-push@system.gserviceaccount.com` (Role: Pub/Sub Publisher).
      *(If blocked by "Domain Restricted Sharing", edit your Org Policy to allow this domain).*
    - Create a **Push Subscription** on this topic:
        - Endpoint URL: `<YOUR_NGROK_URL>/api/mail/webhook`
        - Expiration: Never.

3.  **Activate Webhooks**:
    Once your backend is running (see below), run this **once** to tell Gmail to start pushing data.
    (Replace `<TOKEN>` with your `gmail_access_token` from browser cookies after login):
    ```bash
    curl -X POST http://localhost:8000/api/mail/watch \
      -H "Authorization: Bearer <TOKEN>" \
      -d '{"topicName": "projects/<YOUR_PROJECT_ID>/topics/gmail-updates"}'
    ```

---

### 3. Clone & Install Dependencies

```bash
git clone <your-repo-url>
cd mail-ai-app

# Frontend:
npm install

# Backend:
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

### 4. Configure Environment

Create `.env.local` in the project root:

```bash
# Gmail API (from Google Cloud Console → OAuth 2.0 Credentials)
GOOGLE_CLIENT_ID=<your_client_id>
GOOGLE_CLIENT_SECRET=<your_client_secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# AI Provider
AI_PROVIDER=nemotron
OPENROUTER_API_KEY=your_openrouter_key

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
```

### 5. Run Both Servers

**Terminal 1 : Backend (FastAPI):**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 : Frontend (Next.js):**
```bash
npm run dev
```

Open `http://localhost:3000` → Login with Google → Start chatting!

---

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript (App Router, server actions, modern React )
- **Styling**: Tailwind CSS 4 + shadcn/ui (Rapid UI development, consistent design system )
- **State**: Zustand (Lightweight, no boilerplate, works outside React components )
- **Data Fetching**: TanStack Query + **Gmail Webhooks** (Real-time updates, zero polling)
- **Backend**: FastAPI (Python) (Fast, typed API layer, easy Google SDK integration )
- **Auth**: Google OAuth 2.0 (Direct Gmail access via access + refresh tokens )
- **AI**: OpenRouter → NVIDIA Nemotron (Cost-effective, powerful reasoning, structured JSON output )
- **Animations**: Framer Motion + CSS (Typewriter effects, email highlights, smooth transitions )

## Supported Actions

- `compose`: Opens compose with typewriter animation, prefills To/Subject/Body
- `reply`: Opens reply to a specific email with thread context
- `send`: Sends the currently composed email
- `save_draft`: Saves current compose as Gmail draft
- `discard_compose`: Intelligently discards drafts (with AI "save first?" prompt)
- `navigate`: Switches between Inbox/Sent/Drafts/Trash views
- `search`: Filters the visible email list
- `gmail_search`: Fallback - searches entire Gmail when email isn't loaded locally
- `open_email`: Highlights and opens a specific email
- `filter`: Applies date ranges (calendar picker) and read status filters
- `summarize`: Summarizes the currently viewed email
- `clear_filters`: Resets all active filters
- `logout`: Logs you out of the application

### Gmail Search Fallback
**Decision**: Two-tier search: local first, then full Gmail API search.

**Why?**: The app loads 20 emails at a time. When a user asks "find the email about X", the AI first checks the loaded emails. If not found, it triggers `gmail_search` which hits Gmail's full-text search API (searches subject, body, attachments etc.). The results are then fed back to the AI for summarization. This avoids unnecessary API calls while still providing full mailbox coverage.

### Conversation Memory
**Decision**: Send the last 10 chat messages as context with each AI request.

**Why**: Without history, each request is stateless. If the AI composes an email and the user says "send", the AI didn't know a compose happened. Now it remembers the full conversation flow.

### Optimistic UI Updates
**Decision**: For actions like trash and mark-as-read, update the UI immediately before the API call completes.

**Why**: Perceived performance. The email disappears from the list instantly when trashed, while the API call happens in the background. If the call fails, the user is notified via toast.

---

## Improvements With More Time:

### Technical Improvements
- **Streaming AI responses**: Use SSE/WebSocket to stream AI responses token-by-token instead of waiting for the full response
- **Email pagination**: Currently loads 50 emails per view; add infinite scroll with cursor-based pagination
- **Offline support**: Cache emails in IndexedDB for offline reading

### Feature Improvements
- **Speech To Text Model**: The voice button is currently a placeholder, a good implementation for later to completely control the entire system with just your voice and minimal keyboard input.
- **Forward emails**: The Forward button is currently a placeholder
- **Email attachments**: View and download attachments, support adding attachments to compose
- **Labels & categories**: Support custom Gmail labels, categories (Primary/Social/Promotions)
- **Multi-select & bulk actions**: Select multiple emails to trash, archive, or mark as read
- **Dark mode**: Theme toggle (the infrastructure is already in place via `next-themes`)
- **AI learning**: Remember user preferences (e.g., tone of voice, frequent contacts) across sessions
