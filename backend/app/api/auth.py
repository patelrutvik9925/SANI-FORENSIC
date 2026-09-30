from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from app.database import get_db
from app.models.entities import User, UserRole
from app.schemas.auth import Token, UserLogin, UserCreate, UserResponse, UserUpdate
from app.services.auth_service import (
    verify_password, hash_password, create_access_token,
    get_current_user, require_role
)
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])

@router.post("/login", response_model=Token, summary="User authentication and JWT token issuance")
def login(login_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Authenticate user with username and password, return signed JWT bearer token."""
    client_ip = request.client.host if request.client else "unknown"
    user = db.query(User).filter(User.username == login_data.username).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        # Record failed login audit log
        record_audit_log(
            db=db,
            action="USER_LOGIN_FAILED",
            user=user if user else None,
            target_type="AUTH",
            target_identifier=login_data.username,
            ip_address=client_ip,
            result="DENIED",
            details="Invalid username or password attempt"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        record_audit_log(
            db=db,
            action="USER_LOGIN_BLOCKED",
            user=user,
            target_type="AUTH",
            target_identifier=user.username,
            ip_address=client_ip,
            result="DENIED",
            details="Attempted login on deactivated user account"
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    user.last_login = datetime.utcnow()
    db.commit()

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "user_id": user.id}
    )

    record_audit_log(
        db=db,
        action="USER_LOGIN_SUCCESS",
        user=user,
        target_type="AUTH",
        target_identifier=user.username,
        ip_address=client_ip,
        result="SUCCESS",
        details=f"User {user.username} logged in successfully with role {user.role}"
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=480 * 60,
        user_id=user.id,
        username=user.username,
        role=user.role,
        full_name=user.full_name
    )

@router.get("/me", response_model=UserResponse, summary="Get current authenticated user profile")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/logout", summary="Log out user session and record audit event")
def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    record_audit_log(
        db=db,
        action="USER_LOGOUT",
        user=current_user,
        target_type="AUTH",
        target_identifier=current_user.username,
        ip_address=client_ip,
        result="SUCCESS",
        details=f"User {current_user.username} logged out"
    )
    return {"message": "Logged out successfully"}

@router.get("/users", response_model=List[UserResponse], summary="List users (Admin only)")
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role([UserRole.ADMIN.value]))
):
    return db.query(User).order_by(User.id.asc()).all()

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Create new user (Admin only)")
def create_user(
    user_in: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role([UserRole.ADMIN.value]))
):
    client_ip = request.client.host if request.client else "unknown"
    existing = db.query(User).filter(
        (User.username == user_in.username) | (User.email == user_in.email)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role or UserRole.OPERATOR.value,
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    record_audit_log(
        db=db,
        action="USER_CREATED",
        user=admin,
        target_type="USER",
        target_identifier=new_user.username,
        ip_address=client_ip,
        result="SUCCESS",
        details=f"Created user {new_user.username} with role {new_user.role}"
    )

    return new_user
