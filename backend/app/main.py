from fastapi import Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import WebSocket, WebSocketDisconnect
from app.realtime import manager
from io import BytesIO
from datetime import datetime
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from math import ceil
from sqlalchemy import text
import jwt
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    status,
    Request,
    WebSocket,
    WebSocketDisconnect
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import Base, engine, get_db
from app.models.models import User, Location, QueueRecord, ActivityLog

from app.schemas.queue_schema import LocationCreate, QueueUpdate
from app.schemas.auth_schema import (
    RegisterRequest,
    LoginRequest,
    UserResponse,
    TokenResponse
)

from app.auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    SECRET_KEY,
    ALGORITHM
)


class RoleUpdateRequest(BaseModel):
    role: str


Base.metadata.create_all(bind=engine)
# ==========================
# ACTIVITY LOGGING HELPER
# ==========================

def log_activity(db, user_id, action, description):
    try:
        activity = ActivityLog(
            user_id=user_id,
            action=action,
            description=description
        )

        db.add(activity)
        db.commit()

    except Exception as error:
        db.rollback()
        print("Activity logging error:", error)
app = FastAPI(
    title="QueueLens API",
    description="Smart Queue Tracking System",
    version="2.0.0"
)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

app.state.limiter = limiter

app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(
    request: Request,
    exc: Exception
):
    print(f"Unexpected server error: {exc}")

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error. Please try again later."
        }
    )
    title="QueueLens API",
    description="Smart Queue Tracking System",
    version="2.0.0"


limiter = Limiter(key_func=get_remote_address)

app.state.limiter = limiter

app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
# Authentication configuration
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication token is required"
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = int(payload.get("sub"))

    except (jwt.InvalidTokenError, TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user


def get_admin_user(
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return current_user



# ==========================
# AUTHENTICATION
# ==========================


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication token is required"
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = int(payload.get("sub"))

    except (jwt.InvalidTokenError, TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user

def get_admin_user(
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return current_user


@app.get("/")
def home():
    return {"message": "Welcome to QueueLens API"}



@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected",
            "application": "QueueLens API"
        }
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Database connection failed"
        )

@app.post("/api/auth/register", status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):

    existing_user = db.query(User).filter(
        User.email == data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email is already registered"
        )

    user = User(
        name=data.name,
        email=data.email,
        password=hash_password(data.password)
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "Account created successfully",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    }



@app.post("/api/auth/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    data: LoginRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == data.email).first()

    if not user or not verify_password(data.password, user.password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password"
        )

    log_activity(
        db,
        user.id,
        "LOGIN",
        f"User {user.email} logged in successfully"
    )

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    }

@app.get("/api/auth/me", response_model=UserResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role
    }


# ==========================
# ADMIN APIs
# ==========================

@app.get("/api/admin/users")
def admin_list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    users = db.query(User).order_by(User.id.asc()).all()
    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at
        }
        for user in users
    ]

# ==========================
# ADMIN ACTIVITY LOGS API
# ==========================


@app.get("/api/admin/activity-logs")
def admin_activity_logs(
    activity_id: int = None,
    user_id: int = None,
    action: str = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    query = (
        db.query(ActivityLog, User)
        .outerjoin(User, ActivityLog.user_id == User.id)
    )

    # Filter by Activity ID
    if activity_id is not None:
        query = query.filter(ActivityLog.id == activity_id)

    # Filter by User ID
    if user_id is not None:
        query = query.filter(ActivityLog.user_id == user_id)

    # Filter by Activity Type
    if action:
        query = query.filter(ActivityLog.action == action.upper())

    # Limit results
    limit = max(1, min(limit, 500))

    results = (
        query
        .order_by(
            ActivityLog.created_at.desc(),
            ActivityLog.id.desc()
        )
        .limit(limit)
        .all()
    )

    return [
        {
            "id": activity.id,
            "user_id": activity.user_id,
            "user_name": user.name if user else "Deleted User",
            "user_email": user.email if user else None,
            "action": activity.action,
            "description": activity.description,
            "created_at": activity.created_at
        }
        for activity, user in results
    ]



@app.patch("/api/admin/users/{user_id}/role")
def admin_update_user_role(
    user_id: int,
    data: RoleUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    new_role = data.role.strip().lower()
    if new_role not in ["admin", "user"]:
        raise HTTPException(status_code=400, detail="Role must be admin or user")

    target = db.query(User).filter(User.id == user_id).first()
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")

    if target.id == admin.id and new_role != "admin":
        raise HTTPException(status_code=400, detail="You cannot remove your own admin role")

    if target.role == "admin" and new_role == "user":
        admin_count = db.query(User).filter(User.role == "admin").count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot demote the last admin")

    target.role = new_role
    db.commit()
    db.refresh(target)
    return {
        "message": "User role updated successfully",
        "user": {
            "id": target.id,
            "name": target.name,
            "email": target.email,
            "role": target.role
        }
    }


@app.get("/api/admin/locations")
def admin_list_all_locations(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    latest_records = (
        db.query(
            QueueRecord.location_id,
            func.max(QueueRecord.id).label("latest_id")
        )
        .group_by(QueueRecord.location_id)
        .subquery()
    )

    results = (
        db.query(Location, User, QueueRecord)
        .join(User, Location.user_id == User.id)
        .outerjoin(latest_records, Location.id == latest_records.c.location_id)
        .outerjoin(QueueRecord, QueueRecord.id == latest_records.c.latest_id)
        .order_by(Location.id.asc())
        .all()
    )

    return [
        {
            "id": location.id,
            "name": location.name,
            "description": location.description,
            "user_id": owner.id,
            "owner_name": owner.name,
            "owner_email": owner.email,
            "people": record.people_waiting if record else 0,
            "waitTime": get_wait_time(record.people_waiting if record else 0),
            "crowdLevel": get_crowd_level(record.people_waiting if record else 0),
            "created_at": location.created_at
        }
        for location, owner, record in results
    ]


# ==========================
# QUEUE HELPERS
# ==========================

def get_crowd_level(people):
    if people <= 10:
        return "Low"
    elif people <= 20:
        return "Medium"
    return "High"


def get_wait_time(people):
    return ceil(people * 0.6)


def get_owned_location(location_id, user_id, db):
    location = db.query(Location).filter(
        Location.id == location_id,
        Location.user_id == user_id
    ).first()

    if not location:
        raise HTTPException(
            status_code=404,
            detail="Location not found"
        )

    return location

# ==========================
# ADMIN GLOBAL ANALYTICS API
# ==========================

@app.get("/api/admin/analytics")
def admin_global_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    # Total registered users
    total_users = db.query(User).count()

    total_admins = db.query(User).filter(
        User.role == "admin"
    ).count()

    total_normal_users = db.query(User).filter(
        User.role == "user"
    ).count()

    # Total registered locations
    total_locations = db.query(Location).count()

    # Total historical queue records
    total_queue_records = db.query(QueueRecord).count()

    # Find the latest queue record for every location
    latest_records = (
        db.query(
            QueueRecord.location_id,
            func.max(QueueRecord.id).label("latest_id")
        )
        .group_by(QueueRecord.location_id)
        .subquery()
    )

    current_records = (
        db.query(QueueRecord)
        .join(
            latest_records,
            QueueRecord.id == latest_records.c.latest_id
        )
        .all()
    )

    # Current people waiting across all locations
    total_people_waiting = sum(
        record.people_waiting for record in current_records
    )

    # Current crowd distribution
    crowd_distribution = {
        "Low": 0,
        "Medium": 0,
        "High": 0
    }

    for record in current_records:
        level = get_crowd_level(record.people_waiting)
        crowd_distribution[level] += 1

    # Average historical queue size
    average_queue = db.query(
        func.avg(QueueRecord.people_waiting)
    ).scalar()

    average_queue = round(float(average_queue or 0), 2)

    # Estimated average waiting time
    average_wait_time = round(average_queue * 0.6, 2)

    # Queue activity grouped by date (latest 7 days)
    activity_query = (
        db.query(
            func.date(QueueRecord.created_at).label("date"),
            func.count(QueueRecord.id).label("updates"),
            func.avg(QueueRecord.people_waiting).label("average_people")
        )
        .group_by(func.date(QueueRecord.created_at))
        .order_by(func.date(QueueRecord.created_at).desc())
        .limit(7)
        .all()
    )

    queue_activity = [
        {
            "date": str(row.date),
            "updates": row.updates,
            "average_people": round(float(row.average_people or 0), 2)
        }
        for row in reversed(activity_query)
    ]

    return {
        "summary": {
            "total_users": total_users,
            "total_admins": total_admins,
            "total_normal_users": total_normal_users,
            "total_locations": total_locations,
            "total_queue_records": total_queue_records,
            "total_people_waiting": total_people_waiting,
            "average_queue": average_queue,
            "average_wait_time": average_wait_time
        },
        "crowd_distribution": crowd_distribution,
        "queue_activity": queue_activity
    }


# ==========================
# PROTECTED QUEUE APIs
# ==========================

@app.post("/api/locations", status_code=201)
def create_location(
    data: LocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    location = Location(
        user_id=current_user.id,
        name=data.name,
        description=data.description
    )

    db.add(location)
    db.commit()
    db.refresh(location)
    log_activity(
    db,
    current_user.id,
    "LOCATION_CREATE",
    f"Created location: {location.name}"
)
    record = QueueRecord(
        location_id=location.id,
        people_waiting=data.people_waiting
    )

    db.add(record)
    db.commit()

    return {
        "message": "Location created successfully",
        "id": location.id,
        "name": location.name
    }


@app.get("/api/queues")
def get_queues(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    latest_records = (
        db.query(
            QueueRecord.location_id,
            func.max(QueueRecord.id).label("latest_id")
        )
        .group_by(QueueRecord.location_id)
        .subquery()
    )

    results = (
        db.query(Location, QueueRecord)
        .outerjoin(
            latest_records,
            Location.id == latest_records.c.location_id
        )
        .outerjoin(
            QueueRecord,
            QueueRecord.id == latest_records.c.latest_id
        )
        .filter(Location.user_id == current_user.id)
        .order_by(Location.id)
        .all()
    )

    queues = []

    for location, record in results:

        people = record.people_waiting if record else 0

        queues.append({
            "id": location.id,
            "name": location.name,
            "description": location.description,
            "people": people,
            "waitTime": get_wait_time(people),
            "crowdLevel": get_crowd_level(people)
        })

    return queues

# ==========================
# QUEUE HISTORY API
# ==========================

@app.get("/api/locations/{location_id}/history")
def get_queue_history(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    # Verify that this location belongs to the logged-in user
    location = get_owned_location(
        location_id,
        current_user.id,
        db
    )

    # Fetch the latest 100 queue history records
    records = (
        db.query(QueueRecord)
        .filter(QueueRecord.location_id == location.id)
        .order_by(
            QueueRecord.created_at.desc(),
            QueueRecord.id.desc()
        )
        .limit(100)
        .all()
    )

    return {
        "location_id": location.id,
        "location_name": location.name,
        "total_records": len(records),
        "history": [
            {
                "id": record.id,
                "people_waiting": record.people_waiting,
                "created_at": record.created_at
            }
            for record in records
        ]
    }

# ==========================
# PDF EXPORT API
# ==========================

@app.get("/api/locations/{location_id}/export/pdf")
def export_queue_pdf(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    location = get_owned_location(
        location_id,
        current_user.id,
        db
    )

    records = (
        db.query(QueueRecord)
        .filter(QueueRecord.location_id == location.id)
        .order_by(QueueRecord.created_at.desc(), QueueRecord.id.desc())
        .limit(100)
        .all()
    )

    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        title="QueueLens Queue Report"
    )

    styles = getSampleStyleSheet()
    elements = []

    elements.append(
        Paragraph("QueueLens - Queue Report", styles["Title"])
    )

    elements.append(Spacer(1, 15))

    elements.append(
        Paragraph(f"Location: {location.name}", styles["Heading2"])
    )

    elements.append(
        Paragraph(
            f"Generated on: {datetime.now().strftime('%d-%m-%Y %H:%M:%S')}",
            styles["Normal"]
        )
    )

    elements.append(Spacer(1, 20))

    table_data = [
        ["Record ID", "People Waiting", "Date & Time"]
    ]

    for record in records:
        table_data.append([
            str(record.id),
            str(record.people_waiting),
            record.created_at.strftime("%d-%m-%Y %H:%M:%S")
            if record.created_at else "N/A"
        ])

    table = Table(table_data, repeatRows=1)

    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("PADDING", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [
            colors.white,
            colors.HexColor("#f1f5f9")
        ])
    ]))

    elements.append(table)

    document.build(elements)

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="queuelens_location_{location.id}.pdf"'
        }
    )

# ==========================
# EXCEL EXPORT API
# ==========================

@app.get("/api/locations/{location_id}/export/excel")
def export_queue_excel(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    location = get_owned_location(
        location_id,
        current_user.id,
        db
    )

    records = (
        db.query(QueueRecord)
        .filter(QueueRecord.location_id == location.id)
        .order_by(QueueRecord.created_at.desc(), QueueRecord.id.desc())
        .limit(100)
        .all()
    )

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Queue History"

    sheet.append(["QueueLens - Queue Report"])
    sheet.append(["Location", location.name])
    sheet.append(["Generated On", datetime.now().strftime("%d-%m-%Y %H:%M:%S")])
    sheet.append([])
    sheet.append(["Record ID", "People Waiting", "Date & Time"])

    for record in records:
        sheet.append([
            record.id,
            record.people_waiting,
            record.created_at.strftime("%d-%m-%Y %H:%M:%S")
            if record.created_at else "N/A"
        ])
        

    # Format the report heading
    from openpyxl.styles import Font, PatternFill, Alignment

    sheet["A1"].font = Font(size=16, bold=True, color="2563EB")
    sheet["A5"].font = Font(bold=True, color="FFFFFF")
    sheet["B5"].font = Font(bold=True, color="FFFFFF")
    sheet["C5"].font = Font(bold=True, color="FFFFFF")

    for cell in sheet[5]:
        cell.fill = PatternFill(
            start_color="1E293B",
            end_color="1E293B",
            fill_type="solid"
        )
        cell.alignment = Alignment(horizontal="center")

    sheet.column_dimensions["A"].width = 20
    sheet.column_dimensions["B"].width = 22
    sheet.column_dimensions["C"].width = 28

    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="queuelens_location_{location.id}.xlsx"'
        }
    )


# ==========================
# REAL-TIME WEBSOCKET API
# ==========================


# ==========================
# SECURE REAL-TIME WEBSOCKET API
# ==========================

@app.websocket("/ws/queues/{location_id}")
async def queue_websocket(
    websocket: WebSocket,
    location_id: int
):
    db_generator = get_db()
    db = next(db_generator)
    connected = False

    try:
        # Read JWT from WebSocket query parameters
        token = websocket.query_params.get("token")

        if not token:
            await websocket.close(code=1008)
            return

        # Validate JWT
        try:
            payload = jwt.decode(
                token,
                SECRET_KEY,
                algorithms=[ALGORITHM]
            )

            user_id = int(payload.get("sub"))

        except (jwt.InvalidTokenError, TypeError, ValueError):
            await websocket.close(code=1008)
            return

        # Verify user
        user = db.query(User).filter(
            User.id == user_id
        ).first()

        if not user:
            await websocket.close(code=1008)
            return

        # Verify location ownership
        location = db.query(Location).filter(
            Location.id == location_id,
            Location.user_id == user.id
        ).first()

        if not location:
            await websocket.close(code=1008)
            return

        # Connect authenticated user
        await manager.connect(websocket, location_id)
        connected = True

        # Get latest queue record
        latest_record = (
            db.query(QueueRecord)
            .filter(QueueRecord.location_id == location_id)
            .order_by(QueueRecord.id.desc())
            .first()
        )

        # Send current queue count
        await websocket.send_json({
            "type": "initial",
            "location_id": location_id,
            "people_waiting": (
                latest_record.people_waiting
                if latest_record else 0
            )
        })

        # Keep connection alive
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        pass

    finally:
        if connected:
            manager.disconnect(websocket, location_id)

        db_generator.close()



@app.put("/api/locations/{location_id}/queue")
async def update_queue(
    location_id: int,
    data: QueueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    location = get_owned_location(
        location_id,
        current_user.id,
        db
    )

    record = QueueRecord(
        location_id=location_id,
        people_waiting=data.people_waiting
    )

    db.add(record)
    db.commit()
    db.refresh(record)
    log_activity(
    db,
    current_user.id,
    "QUEUE_UPDATE",
    f"Updated queue at {location.name}: {record.people_waiting} people waiting"
)
    # Broadcast updated queue count to connected users
    await manager.broadcast(
        location_id,
        {
            "type": "queue_update",
            "location_id": location_id,
            "location_name": location.name,
            "people_waiting": record.people_waiting,
            "created_at": (
                record.created_at.isoformat()
                if record.created_at else None
            )
        }
    )

    return {
        "message": "Queue updated successfully",
        "location_id": location_id,
        "people_waiting": data.people_waiting
    }



@app.delete("/api/locations/{location_id}")
def delete_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    location = get_owned_location(
        location_id,
        current_user.id,
        db
    )

    db.query(QueueRecord).filter(
        QueueRecord.location_id == location_id
    ).delete(synchronize_session=False)

    location_name = location.name

    db.delete(location)
    db.commit()

    log_activity(
    db,
    current_user.id,
    "LOCATION_DELETE",
    f"Deleted location: {location_name}"
)
    return {"message": "Location deleted successfully"}
