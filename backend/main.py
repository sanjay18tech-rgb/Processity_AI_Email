from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env.local")

from auth import router as auth_router
from ai import router as ai_router
from mail import router as mail_router

app = FastAPI(title="Mail AI Backend")

app.include_router(auth_router)
app.include_router(ai_router)
app.include_router(mail_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (Vercel + Localhost)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Mail AI Backend is running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
