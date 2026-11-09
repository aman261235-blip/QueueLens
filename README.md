# QueueLens – Smart Queue Tracking System

A full-stack web application designed to simplify queue management through real-time queue updates, analytics, user management and administrative monitoring.

## Project Overview

QueueLens helps users monitor and manage queues at different locations. Administrators can manage users, monitor queue activity and view system-wide analytics.

## Key Features

### User Features
- User registration and JWT-based login
- Secure user authentication
- Create and manage queue locations
- Update queue information
- Real-time queue synchronization using WebSockets
- Search and filter queue locations
- Queue history
- Analytics dashboard
- PDF and Excel report exports
- In-app and browser notifications

### Admin Features
- Admin dashboard
- User management and role assignment
- Location management
- Global analytics
- Activity logs
- Admin-only API protection

### Security
- JWT authentication
- Password hashing using Argon2
- Password strength validation
- Login rate limiting
- Role-based access control
- CORS configuration
- Centralized API error handling

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js, Vite |
| Styling | Tailwind CSS |
| Backend | Python, FastAPI |
| Database | MySQL |
| ORM | SQLAlchemy |
| Authentication | JWT |
| Password Hashing | Argon2 |
| Real-time Communication | WebSockets |
| Charts | Recharts |
| HTTP Client | Axios |
| Server | Uvicorn |

## Architecture

React Frontend → FastAPI Backend → MySQL Database

WebSocket connections provide real-time queue synchronization between connected users.

## Project Structure

```text
QueueLens/
├── backend/
│   ├── app/
│   │   ├── auth/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── main.py
│   │   ├── database.py
│   │   └── realtime.py
│   ├── .env
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
└── README.md
```

## Local Installation

### Prerequisites
- Python 3.11+
- Node.js
- MySQL 8+
- Git

### 1. Clone the repository

```bash
git clone https://github.com/aman261235-blip/QueueLens.git
cd QueueLens
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
```

Activate the environment on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure your backend `.env` file with your local MySQL connection and a secure JWT secret.

Create the MySQL database:

```sql
CREATE DATABASE queuelens_db;
```

Start the backend:

```bash
python -m uvicorn app.main:app --reload
```

Backend URL: http://127.0.0.1:8000

API documentation: http://127.0.0.1:8000/docs

### 3. Frontend Setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the frontend URL displayed in your terminal.

## API Documentation

FastAPI Swagger documentation:

http://127.0.0.1:8000/docs

## Current Project Status

- Core queue management implemented
- User and admin authentication implemented
- Real-time synchronization implemented
- Analytics and reporting implemented
- Admin management implemented
- Security improvements implemented
- GitHub repository published
- Production deployment preparation in progress

## Future Enhancements

- Cloud deployment
- Advanced analytics
- Automated queue prediction
- Mobile application integration
- Scalable production infrastructure

## Author

**Aman**

GitHub: https://github.com/aman261235-blip

---

Built as a full-stack software engineering project.