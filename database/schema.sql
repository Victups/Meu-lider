-- Church Scale Management System - PostgreSQL Schema
-- This is a production-ready schema for a church scheduling application

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'CHURCH_ADMIN', 'LEADER', 'MEMBER');
CREATE TYPE schedule_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE notification_type AS ENUM (
  'SCHEDULE_ASSIGNED',
  'SCHEDULE_CHANGED',
  'CONFIRMATION_REQUESTED',
  'SCHEDULE_CANCELLED',
  'AVAILABILITY_REMINDER'
);

-- ============================================================================
-- CHURCHES
-- ============================================================================

CREATE TABLE churches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  logo_url VARCHAR(500),
  website VARCHAR(255),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_churches_slug ON churches(slug);
CREATE INDEX idx_churches_active ON churches(active);

-- ============================================================================
-- USERS
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  role user_role NOT NULL DEFAULT 'MEMBER',
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_church_id ON users(church_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(active);

-- ============================================================================
-- MEMBERS (Extended user info specific to church members)
-- ============================================================================

CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE,
  birth_date DATE,
  joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_members_church_id ON members(church_id);
CREATE INDEX idx_members_user_id ON members(user_id);
CREATE INDEX idx_members_cpf ON members(cpf);

-- ============================================================================
-- TEAMS (Grupos dentro da igreja: louvor, mídia, etc)
-- ============================================================================

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(church_id, slug)
);

CREATE INDEX idx_teams_church_id ON teams(church_id);
CREATE INDEX idx_teams_active ON teams(active);

-- ============================================================================
-- TEAM MEMBERS
-- ============================================================================

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role VARCHAR(100),
  started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  ended_at DATE,
  is_leader BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, member_id)
);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_member_id ON team_members(member_id);
CREATE INDEX idx_team_members_is_leader ON team_members(is_leader);

-- ============================================================================
-- EVENTS (Cultos, retiros, eventos especiais)
-- ============================================================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(100) NOT NULL DEFAULT 'culto',
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(255),
  end_date TIMESTAMP WITH TIME ZONE,
  active BOOLEAN DEFAULT true,
  recurrence_rule VARCHAR(500),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_church_id ON events(church_id);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_active ON events(active);

-- ============================================================================
-- SCHEDULES (Escalas: quem faz o quê em qual evento)
-- ============================================================================

CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  function_name VARCHAR(255) NOT NULL,
  status schedule_status NOT NULL DEFAULT 'PENDING',
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, member_id, team_id)
);

CREATE INDEX idx_schedules_event_id ON schedules(event_id);
CREATE INDEX idx_schedules_member_id ON schedules(member_id);
CREATE INDEX idx_schedules_team_id ON schedules(team_id);
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_schedules_event_member ON schedules(event_id, member_id);

-- ============================================================================
-- AVAILABILITY (Disponibilidade dos membros)
-- ============================================================================

CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  reason VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_availability_member_id ON availability(member_id);
CREATE INDEX idx_availability_date_range ON availability(date_from, date_to);
CREATE INDEX idx_availability_is_available ON availability(is_available);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL,
  related_schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_church_id ON audit_logs(church_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ============================================================================
-- REFRESH TOKENS
-- ============================================================================

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View para ver escalas confirmadas de um membro em um período
CREATE VIEW v_member_confirmed_schedules AS
SELECT
  s.id,
  s.event_id,
  s.member_id,
  s.team_id,
  s.function_name,
  e.name as event_name,
  e.event_date,
  t.name as team_name,
  m.full_name as member_name,
  s.status,
  s.confirmed_at
FROM schedules s
JOIN events e ON e.id = s.event_id
JOIN teams t ON t.id = s.team_id
JOIN members m ON m.id = s.member_id
WHERE s.status IN ('CONFIRMED', 'PENDING');

-- View para ver disponibilidade de membros em um período
CREATE VIEW v_member_availability_summary AS
SELECT
  m.id as member_id,
  m.full_name,
  tm.team_id,
  t.name as team_name,
  a.date_from,
  a.date_to,
  a.is_available,
  a.reason
FROM members m
LEFT JOIN team_members tm ON tm.member_id = m.id
LEFT JOIN teams t ON t.id = tm.team_id
LEFT JOIN availability a ON a.member_id = m.id;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_churches_updated_at BEFORE UPDATE ON churches
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_updated_at BEFORE UPDATE ON availability
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
