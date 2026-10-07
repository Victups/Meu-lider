# 🚀 Quick Start Guide

Get Igreja Escala running in 10 minutes.

## Prerequisites

- Node.js 18+ (https://nodejs.org)
- PostgreSQL 12+ (or use Docker)
- Docker & Docker Compose (optional, recommended)

## Step 1: Start Database

### Option A: Docker (Recommended)

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- pgAdmin on http://localhost:5050 (user: admin@example.com, pass: admin)
- Redis on port 6379

### Option B: Manual PostgreSQL

```bash
# Create database
createdb -U postgres igreja_escala

# Run schema
psql -U postgres -d igreja_escala -a -f database/schema.sql
```

## Step 2: Start Backend

```bash
cd backend

# Copy environment
cp .env.example .env

# Install & run
npm install
npm run start:dev
```

✅ Backend ready on http://localhost:3001

## Step 3: Start Frontend

In a new terminal:

```bash
cd frontend

# Copy environment
cp .env.example .env

# Install & run
npm install
npm start
```

Choose platform:
- Press `w` for web (http://localhost:8081)
- Press `i` for iOS simulator
- Press `a` for Android emulator

✅ Frontend ready!

## Step 4: Test API

### Create test church (SUPER_ADMIN only)

```bash
curl -X POST http://localhost:3001/churches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Igreja Teste",
    "slug": "igreja-teste",
    "email": "contact@church.com"
  }'
```

### Register user

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "João Silva",
    "churchId": "CHURCH_ID_HERE"
  }'
```

### Login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "user": { "id": "...", "name": "João Silva", ... },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "...",
  "expiresIn": 900
}
```

## Step 5: Explore App

1. **Web**: http://localhost:8081
2. **Login** with your test account
3. **Create teams**: Teams → + button
4. **Create events**: Main menu → Events
5. **Create schedules**: Select event → Add schedule

## Stopping Services

```bash
# Stop all containers
docker-compose down

# Stop backend
Ctrl+C in backend terminal

# Stop frontend
Ctrl+C in frontend terminal
```

## Troubleshooting

### Database already exists
```bash
docker-compose down -v  # Remove volumes
docker-compose up -d
```

### Port already in use
```bash
# Find what's using port 5432 (or 3001, etc)
lsof -i :5432  # macOS/Linux
netstat -ano | findstr :5432  # Windows
```

### Backend won't start
```bash
cd backend
rm -rf node_modules dist
npm install
npm run start:dev
```

### Frontend won't start
```bash
cd frontend
npm install --force
npm start -- --clear
```

### API connection error
Check `.env` files:
- `backend/.env`: DB_* settings match docker-compose
- `frontend/.env`: `EXPO_PUBLIC_API_URL=http://localhost:3001`

## Project Structure

```
├── backend/       # NestJS API
├── frontend/      # Expo React Native
├── database/      # PostgreSQL schema
├── docker-compose.yml  # Local services
└── PROJECT.md     # Full documentation
```

## Next Steps

1. Read [PROJECT.md](PROJECT.md) for architecture
2. Read [DOMAIN_MODEL.md](DOMAIN_MODEL.md) for data model
3. Check [backend/README.md](backend/README.md) for API details
4. Check [frontend/README.md](frontend/README.md) for mobile details

## Key Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/login` | Login |
| POST | `/auth/register` | Register |
| GET | `/churches` | List churches |
| GET | `/churches/:id/events` | List events |
| GET | `/churches/:id/schedules/members/:memberId` | Member schedules |
| POST | `/churches/:id/schedules/:scheduleId/confirm` | Confirm schedule |

## Default Credentials

For testing:

| Field | Value |
|-------|-------|
| Email | test@example.com |
| Password | password123 |

Create one via `/auth/register` endpoint.

## Tips

- Use Postman or Insomnia to test API endpoints
- Check Docker logs: `docker-compose logs -f postgres`
- Browse database with pgAdmin: http://localhost:5050
- Use mobile simulator for iOS/Android testing
- Hot reload works in both backend and frontend

---

**Having issues?** See [PROJECT.md](PROJECT.md) Troubleshooting section.
