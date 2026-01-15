"""
Authentication endpoints for Strava and Garmin OAuth integration.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
import httpx
import uuid

from app.database import get_db
from app.models import OAuthToken, User
from app.auth_utils import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token
)

security = HTTPBearer()

router = APIRouter(prefix="/auth", tags=["authentication"])

# OAuth configuration (should be in environment variables)
STRAVA_CLIENT_ID = os.getenv("STRAVA_CLIENT_ID", "your_strava_client_id")
STRAVA_CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET", "your_strava_client_secret")
STRAVA_REDIRECT_URI = os.getenv("STRAVA_REDIRECT_URI", "http://localhost:8000/auth/strava/callback")

# Frontend URL for OAuth redirects
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

GARMIN_CONSUMER_KEY = os.getenv("GARMIN_CONSUMER_KEY", "your_garmin_key")
GARMIN_CONSUMER_SECRET = os.getenv("GARMIN_CONSUMER_SECRET", "your_garmin_secret")
GARMIN_REDIRECT_URI = os.getenv("GARMIN_REDIRECT_URI", "http://localhost:8000/auth/garmin/callback")


# Pydantic models for request/response
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# Dependency to get current user
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get the current authenticated user from JWT token."""
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Convert string to UUID for database query
    try:
        user_id = uuid.UUID(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return user


# Registration endpoint
@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate password strength
    if len(user_data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    
    # Create new user
    try:
        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            full_name=user_data.full_name,
            is_active=True,
            is_verified=False  # Email verification can be added later
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception as e:
        db.rollback()
        print(f"Error creating user: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )
    
    # Create access token (convert UUID to string for JWT)
    access_token = create_access_token(data={"sub": str(new_user.id)})
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name
        }
    )


# Login endpoint
@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login with email and password."""
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    # Create access token (convert UUID to string for JWT)
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name
        }
    )


# Get current user endpoint
@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_verified": current_user.is_verified,
        "created_at": current_user.created_at.isoformat()
    }


@router.get("/strava")
async def strava_auth(
    current_user: User = Depends(get_current_user),
    return_url: bool = False
):
    """
    Initiate Strava OAuth flow.
    Redirects user to Strava authorization page.
    Requires authentication.
    
    Args:
        return_url: If True, returns JSON with URL instead of redirecting
    """
    strava_auth_url = (
        f"https://www.strava.com/oauth/authorize"
        f"?client_id={STRAVA_CLIENT_ID}"
        f"&redirect_uri={STRAVA_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=activity:read_all"
        f"&approval_prompt=force"
        f"&state={str(current_user.id)}"  # Pass user ID as string in state for callback
    )
    
    # If return_url is True, return JSON instead of redirecting
    if return_url:
        return {"auth_url": strava_auth_url}
    
    return RedirectResponse(url=strava_auth_url)


@router.get("/strava/callback")
async def strava_callback(code: str, state: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Handle Strava OAuth callback.
    Exchange authorization code for access token and store in database.
    State parameter contains user_id.
    """
    if not state:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/auth/strava/callback?error=missing_user_id"
        )
    
    # Verify user exists (state contains UUID as string)
    try:
        user_id = uuid.UUID(state)
    except (ValueError, TypeError):
        return RedirectResponse(
            url=f"{FRONTEND_URL}/auth/strava/callback?error=invalid_user_id"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/auth/strava/callback?error=user_not_found"
        )
    
    try:
        async with httpx.AsyncClient() as client:
            # Exchange code for token
            token_response = await client.post(
                "https://www.strava.com/oauth/token",
                data={
                    "client_id": STRAVA_CLIENT_ID,
                    "client_secret": STRAVA_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                },
            )
            
            if token_response.status_code != 200:
                error_detail = token_response.text
                print(f"Strava token exchange failed: {error_detail}")
                return RedirectResponse(
                    url=f"{FRONTEND_URL}/auth/strava/callback?error=token_exchange_failed"
                )
            
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            refresh_token = token_data.get("refresh_token")
            expires_at = None
            
            if "expires_at" in token_data:
                expires_at = datetime.fromtimestamp(token_data["expires_at"], tz=timezone.utc)
            elif "expires_in" in token_data:
                expires_at = datetime.now(timezone.utc) + timedelta(seconds=token_data["expires_in"])
            
            # Check if token already exists for this user and provider
            existing_token = db.query(OAuthToken).filter(
                OAuthToken.provider == "strava",
                OAuthToken.user_id == user.id
            ).first()
            
            if existing_token:
                # Update existing token
                existing_token.access_token = access_token
                if refresh_token:
                    existing_token.refresh_token = refresh_token
                if expires_at:
                    existing_token.expires_at = expires_at
                existing_token.updated_at = datetime.now(timezone.utc)
                if "scope" in token_data:
                    existing_token.scope = token_data["scope"]
            else:
                # Create new token record
                new_token = OAuthToken(
                    provider="strava",
                    user_id=user.id,
                    access_token=access_token,
                    refresh_token=refresh_token,
                    expires_at=expires_at,
                    token_type="Bearer",
                    scope=token_data.get("scope"),
                )
                db.add(new_token)
            
            db.commit()
            
            # Redirect to frontend with success
            return RedirectResponse(
                url=f"{FRONTEND_URL}/auth/strava/callback?success=true"
            )
            
    except Exception as e:
        print(f"Error in Strava callback: {e}")
        import traceback
        traceback.print_exc()
        return RedirectResponse(
            url=f"{FRONTEND_URL}/auth/strava/callback?error={str(e)}"
        )


@router.get("/garmin")
async def garmin_auth():
    """
    Initiate Garmin OAuth flow.
    Note: Garmin uses OAuth 1.0a, which requires more complex implementation.
    This endpoint will be implemented once Garmin Developer Program access is granted.
    """
    # Garmin OAuth 1.0a requires:
    # 1. Request token
    # 2. User authorization
    # 3. Access token exchange
    # This is a placeholder for future implementation
    
    return {
        "message": "Garmin OAuth integration requires Garmin Developer Program approval",
        "status": "coming_soon",
        "info": "Please apply at https://developer.garmin.com/gc-developer-program/overview/"
    }


@router.get("/garmin/callback")
async def garmin_callback(db: Session = Depends(get_db)):
    """
    Handle Garmin OAuth callback.
    Garmin OAuth 1.0a callback implementation.
    """
    # TODO: Implement OAuth 1.0a callback handling
    return {"message": "Garmin callback - in development"}


@router.get("/status")
async def auth_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Check authentication status for Strava and Garmin for current user.
    """
    strava_token = db.query(OAuthToken).filter(
        OAuthToken.provider == "strava",
        OAuthToken.user_id == current_user.id
    ).first()
    garmin_token = db.query(OAuthToken).filter(
        OAuthToken.provider == "garmin",
        OAuthToken.user_id == current_user.id
    ).first()
    
    return {
        "strava": {
            "connected": strava_token is not None,
            "expires_at": strava_token.expires_at.isoformat() if strava_token and strava_token.expires_at else None,
        },
        "garmin": {
            "connected": garmin_token is not None,
            "expires_at": garmin_token.expires_at.isoformat() if garmin_token and garmin_token.expires_at else None,
        }
    }


