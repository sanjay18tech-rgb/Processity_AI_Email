from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse
from google_auth_oauthlib.flow import Flow
import os
import json

router = APIRouter(prefix="/auth", tags=["auth"])

# HTTP for local dev
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

CLIENT_CONFIG = {
    "web": {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/api/auth/callback")],
    }
}

SCOPES = [
    'openid',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
]

@router.get("/login")
async def login():
    if not os.getenv("GOOGLE_CLIENT_ID") or not os.getenv("GOOGLE_CLIENT_SECRET"):
         return JSONResponse({"error": "Missing Google Credentials"}, status_code=500)

    flow = Flow.from_client_config(
        CLIENT_CONFIG,
        scopes=SCOPES
    )
    flow.redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/api/auth/callback")
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )
    
    return RedirectResponse(authorization_url)

@router.get("/callback")
async def callback(code: str):
    try:
        flow = Flow.from_client_config(
            CLIENT_CONFIG,
            scopes=SCOPES
        )
        flow.redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/api/auth/callback")
        
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Return tokens to frontend
        
        # Calculate remaining seconds until expiry
        import datetime
        if credentials.expiry:
            remaining = (credentials.expiry - datetime.datetime.utcnow().replace(tzinfo=credentials.expiry.tzinfo)).total_seconds()
            expires_in = max(int(remaining), 0)
        else:
            expires_in = 3600
        
        content = {
            "access_token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "expires_in": expires_in,
        }
        
        return JSONResponse(content)
        
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
