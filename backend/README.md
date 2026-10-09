# Meu Líder - Backend API

Professional church scheduling system backend built with NestJS and PostgreSQL.

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=igreja_escala
JWT_SECRET=your-secret-key-here
```

### 3. Run database setup

```bash
# Create database tables
npm run db:sync

# Or run migrations (if you have any)
npm run db:run
```

### 4. Start development server

```bash
npm run start:dev
```

Server will run on `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user

### Churches
- `GET /churches` - List user's churches
- `POST /churches` - Create church (SUPER_ADMIN only)
- `GET /churches/:churchId` - Get church details
- `PUT /churches/:churchId` - Update church
- `DELETE /churches/:churchId` - Deactivate church

### Teams
- `GET /churches/:churchId/teams` - List teams
- `POST /churches/:churchId/teams` - Create team
- `GET /churches/:churchId/teams/:teamId` - Get team
- `PUT /churches/:churchId/teams/:teamId` - Update team
- `DELETE /churches/:churchId/teams/:teamId` - Delete team
- `GET /churches/:churchId/teams/:teamId/members` - List team members
- `POST /churches/:churchId/teams/:teamId/members/:memberId` - Add member to team
- `DELETE /churches/:churchId/teams/:teamId/members/:memberId` - Remove member from team

### Members
- `GET /churches/:churchId/members` - List members
- `POST /churches/:churchId/members` - Create member
- `GET /churches/:churchId/members/:memberId` - Get member
- `PUT /churches/:churchId/members/:memberId` - Update member

### Events
- `GET /churches/:churchId/events` - List events
- `POST /churches/:churchId/events` - Create event
- `GET /churches/:churchId/events/:eventId` - Get event
- `PUT /churches/:churchId/events/:eventId` - Update event
- `DELETE /churches/:churchId/events/:eventId` - Delete event

### Schedules (Core Feature)
- `GET /churches/:churchId/schedules/events/:eventId` - List schedules for event
- `GET /churches/:churchId/schedules/events/:eventId/statistics` - Get scheduling stats
- `GET /churches/:churchId/schedules/members/:memberId` - List member's schedules
- `POST /churches/:churchId/schedules` - Create schedule
- `GET /churches/:churchId/schedules/:scheduleId` - Get schedule
- `PUT /churches/:churchId/schedules/:scheduleId` - Update schedule
- `POST /churches/:churchId/schedules/:scheduleId/confirm` - Member confirms schedule
- `POST /churches/:churchId/schedules/:scheduleId/decline` - Member declines schedule
- `DELETE /churches/:churchId/schedules/:scheduleId` - Delete schedule

### Availability
- `GET /members/:memberId/availability` - List member's availability
- `POST /members/:memberId/availability` - Create availability
- `GET /members/:memberId/availability/:availabilityId` - Get availability
- `PUT /members/:memberId/availability/:availabilityId` - Update availability
- `DELETE /members/:memberId/availability/:availabilityId` - Delete availability

### Notifications
- `GET /notifications` - List notifications (unread: ?unread=true)
- `GET /notifications/:notificationId` - Get notification
- `PUT /notifications/:notificationId/read` - Mark as read
- `POST /notifications/read-all` - Mark all as read
- `DELETE /notifications/:notificationId` - Delete notification

## Project Structure

```
src/
├── config/
│   └── database.ts          # TypeORM configuration
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   └── church.guard.ts
│   └── decorators/
├── modules/
│   ├── auth/
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── strategies/
│   │   └── dtos/
│   ├── churches/
│   ├── teams/
│   ├── members/
│   ├── events/
│   ├── schedules/          # Core business logic
│   ├── availability/
│   └── notifications/
├── app.module.ts
└── main.ts
```

## Database Schema

Key entities:
- **Church** - Root tenant
- **User** - Authentication (SUPER_ADMIN, CHURCH_ADMIN, LEADER, MEMBER)
- **Member** - Extended user info with church membership
- **Team** - Groups (Louvor, Mídia, Som, etc)
- **TeamMember** - Membership relationship
- **Event** - Cultos, events (with recurrence support)
- **Schedule** - Core: who does what in which event
- **Availability** - Members indicate when unavailable
- **Notification** - Real-time notifications

## Permission Model

```
SUPER_ADMIN
  └─ Can manage all churches

CHURCH_ADMIN
  └─ Full control of their church

LEADER
  └─ Can manage their team's schedules

MEMBER
  └─ Can see and confirm their schedules
```

## Development Commands

```bash
# Start development server (with auto-reload)
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod

# Run tests
npm run test

# Run tests with coverage
npm run test:cov

# Lint code
npm run lint

# Format code
npm run format

# Database commands
npm run db:generate   # Generate migration
npm run db:run        # Run migrations
npm run db:revert     # Revert last migration
npm run db:sync       # Sync schema to database
npm run db:drop       # Drop all tables
```

## Security Checklist

- [ ] Change JWT_SECRET in .env
- [ ] Change REFRESH_TOKEN_SECRET in .env
- [ ] Use HTTPS in production
- [ ] Configure proper CORS_ORIGIN
- [ ] Set NODE_ENV=production
- [ ] Use strong database password
- [ ] Enable database backups
- [ ] Implement rate limiting
- [ ] Add request logging
- [ ] Enable HTTPS for API

## Features

- ✅ Multi-tenant architecture (church-based isolation)
- ✅ JWT authentication with refresh tokens
- ✅ Role-based access control (RBAC)
- ✅ Schedule management with confirmation flow
- ✅ Team member management
- ✅ Availability tracking
- ✅ Real-time notifications
- ✅ Type-safe with TypeScript
- ✅ Comprehensive audit logging ready
- 🚧 WebSocket support (coming)
- 🚧 Email notifications (coming)
- 🚧 SMS notifications (coming)

## Testing

```bash
npm run test                # Run unit tests
npm run test:watch        # Watch mode
npm run test:cov          # Coverage report
npm run test:e2e          # End-to-end tests
```

## License

UNLICENSED
