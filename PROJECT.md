# Igreja Escala - Project Documentation

A professional church scheduling system with web and mobile apps.

## Project Overview

**Igreja Escala** is a complete scheduling solution for churches. It allows churches to manage teams, create events, and assign members to specific functions with a confirmation workflow.

### Problem Solved
Churches struggle to manually coordinate who should do what, when. This system automates scheduling, confirmations, and availability tracking.

### Target Users
- Church admins (manage everything)
- Team leaders (manage their team's schedules)
- Church members (view and confirm their schedules)

## Architecture

```
┌─────────────────────────────────────────────┐
│                   Frontend                  │
│  Expo (React Native) - iOS/Android/Web     │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│         REST API (HTTP/JSON)                │
│                                             │
├─────────────────────────────────────────────┤
│                   Backend                   │
│  NestJS + TypeORM + PostgreSQL             │
│                                             │
└─────────────────────────────────────────────┘
```

## Technology Stack

### Backend
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Authentication**: JWT + Refresh Tokens
- **Validation**: class-validator
- **API**: RESTful with request/response DTOs

### Frontend
- **Framework**: React Native + Expo
- **Routing**: Expo Router (file-based)
- **State Management**: Zustand (lightweight)
- **HTTP Client**: Axios with interceptors
- **Styling**: React Native StyleSheet
- **Type Safety**: TypeScript

### Deployment
- Backend: Docker container on VPS/Cloud
- Frontend: EAS Build (Expo's cloud build service)
- Database: PostgreSQL (managed or self-hosted)

## Project Structure

```
igreja-escala/
├── database/
│   └── schema.sql                 # PostgreSQL schema
├── backend/                       # NestJS API
│   ├── src/
│   │   ├── modules/              # Feature modules
│   │   │   ├── auth/             # Authentication
│   │   │   ├── churches/         # Church management
│   │   │   ├── teams/            # Teams & members
│   │   │   ├── members/          # Church members
│   │   │   ├── events/           # Event management
│   │   │   ├── schedules/        # Core scheduling
│   │   │   ├── availability/     # Availability management
│   │   │   └── notifications/    # Notifications
│   │   ├── common/               # Shared guards, interceptors
│   │   ├── config/               # App configuration
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── package.json
│   └── README.md
├── frontend/                      # Expo React Native app
│   ├── src/
│   │   ├── app/                  # Expo Router screens
│   │   │   ├── (auth)/          # Auth flows
│   │   │   └── (app)/           # Main app (tabs)
│   │   ├── services/            # API client
│   │   ├── stores/              # Zustand state
│   │   ├── components/          # Reusable components
│   │   ├── hooks/               # Custom hooks
│   │   └── utils/               # Utilities
│   ├── app.json                 # Expo config
│   ├── package.json
│   └── README.md
├── DOMAIN_MODEL.md              # Business domain
├── PROJECT.md                   # This file
└── docker-compose.yml           # Local dev environment
```

## Data Model

### Core Entities

**Church** (Tenant)
- Root entity for multi-tenant isolation
- All data belongs to a church

**User** (SUPER_ADMIN, CHURCH_ADMIN, LEADER, MEMBER)
- Authentication & authorization
- RBAC: role-based permissions

**Member**
- Extended user data (CPF, birth date, etc)
- Links users to churches
- Scalable people in a church

**Team**
- Groups: Louvor, Mídia, Som, etc
- Hierarchical: church → teams → members

**Event**
- Cultos, retiros, weddings, etc
- Can recur (every Sunday)
- Associated with a date/time

**Schedule** (Core Business Logic)
- Mapping: Event + Team + Member + Function
- Status: PENDING → CONFIRMED or CANCELLED
- Confirmation workflow

**Availability**
- Members indicate unavailable periods
- Reason: vacation, sick, etc
- Used to avoid scheduling conflicts

**Notification**
- Real-time alerts for assignments
- Types: assigned, changed, cancelled, reminder
- Read/unread tracking

## Permissions Model

```
SUPER_ADMIN
├─ Can create churches
├─ Can access any church
└─ Can manage all users

CHURCH_ADMIN
├─ Full control of their church
├─ Can create teams, events
├─ Can make any schedule
└─ Can manage all church members

LEADER
├─ Can view their team
├─ Can schedule their team members
├─ Can see their team's availability
└─ Cannot access other teams

MEMBER
├─ Can view their schedules
├─ Can confirm/decline assignments
├─ Can set availability
└─ Cannot modify others' data
```

## API Workflow

### Authentication Flow

```
1. User registers/logs in
   POST /auth/register or /auth/login
   ↓
2. Server returns accessToken + refreshToken
   ↓
3. Client stores tokens securely
   ↓
4. Client includes Bearer token in all requests
   ↓
5. Token expires after 15 minutes
   ↓
6. Client auto-refreshes using refreshToken
   POST /auth/refresh
```

### Schedule Confirmation Flow

```
1. Admin creates schedule
   POST /churches/:id/schedules
   Status: PENDING
   ↓
2. Member receives notification
   POST /notifications (auto-triggered)
   ↓
3. Member confirms or declines
   POST /schedules/:id/confirm or /decline
   ↓
4. Status updates to CONFIRMED/CANCELLED
   ↓
5. Admin sees confirmation status
   GET /schedules/events/:id
```

## Development Setup

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```

API runs on http://localhost:3001

### Database

```bash
# Using Docker Compose (recommended)
docker-compose up -d postgres

# Or manual PostgreSQL setup
psql -U postgres -d postgres -a -f ../database/schema.sql
```

### Frontend

```bash
cd frontend
npm install
npm start
```

Choose:
- `w` for web (http://localhost:8081)
- `i` for iOS simulator
- `a` for Android emulator

## Key Features

### Phase 1 (MVP)
- ✅ Multi-tenant architecture
- ✅ User authentication
- ✅ Church & team management
- ✅ Schedule creation & confirmation
- ✅ Availability tracking
- ✅ Role-based access control

### Phase 2 (Q2)
- 🚧 WebSocket for real-time updates
- 🚧 Email notifications
- 🚧 SMS notifications via Twilio
- 🚧 Recurring events

### Phase 3 (Q3)
- 🗺️ Repertoire management (songs/hymns)
- 🗺️ AI-powered schedule suggestions
- 🗺️ Analytics & reports
- 🗺️ Integration with Google Calendar
- 🗺️ Mobile app refinements

## Security Considerations

1. **Multi-tenancy**: ChurchGuard ensures users only access their church
2. **JWT**: Stateless auth with short-lived tokens
3. **Refresh Tokens**: Secure refresh token rotation
4. **Password Hashing**: bcrypt with salt
5. **HTTPS**: Enforce in production
6. **CORS**: Configured per environment
7. **Rate Limiting**: (To be added)
8. **Input Validation**: class-validator on all DTOs

## Database Backups

```bash
# Backup
pg_dump -U postgres igreja_escala > backup.sql

# Restore
psql -U postgres -d igreja_escala < backup.sql
```

## Deployment Checklist

### Backend
- [ ] Set NODE_ENV=production
- [ ] Change JWT_SECRET in .env
- [ ] Change REFRESH_TOKEN_SECRET in .env
- [ ] Configure database backups
- [ ] Enable HTTPS
- [ ] Set up CI/CD pipeline
- [ ] Configure logging
- [ ] Set up monitoring/alerting
- [ ] Enable rate limiting
- [ ] Configure CORS for prod domain

### Frontend
- [ ] Build with EAS
- [ ] Test on real devices
- [ ] Configure app signing
- [ ] Submit to App Stores
- [ ] Set up beta testing channel
- [ ] Configure push notifications

## Performance Optimizations

### Backend
- Database indexes on frequently queried columns
- Query optimization with relations
- Caching layer (Redis) for future
- Pagination for large datasets

### Frontend
- FlatList virtualization for long lists
- Component memoization
- Code splitting with Expo Router
- Image optimization

## Testing Strategy

### Backend
- Unit tests: Services, guards, DTOs
- Integration tests: Controllers with database
- E2E tests: API workflows

### Frontend
- Unit tests: Components, hooks, stores
- Integration tests: Navigation flows
- E2E tests: User workflows (Detox)

## Monitoring & Analytics

- [ ] Error tracking (Sentry)
- [ ] Analytics (Mixpanel/Segment)
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Database monitoring

## Contributing Guidelines

1. Create feature branch: `git checkout -b feature/xyz`
2. Make changes with tests
3. Ensure TypeScript strict mode passes
4. Format code: `npm run format`
5. Commit with meaningful messages
6. Create PR with description
7. Pass code review
8. Merge to main

## Roadmap

### Q4 2024 (Current)
- MVP launch
- iOS/Android apps on stores
- Web version live

### Q1 2025
- Real-time updates (WebSocket)
- Email & SMS notifications
- Analytics dashboard

### Q2 2025
- AI-powered scheduling
- Integration marketplace
- Enterprise features

## Support & Contact

For issues, questions, or suggestions:
- Create GitHub issue
- Contact: dev.software48@f-cities.cloud
- Docs: See README files in each folder

## License

UNLICENSED

---

**Last Updated**: October 2024
**Version**: 0.1.0 (Alpha)
