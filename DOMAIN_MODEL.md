# Domain Model - Igreja Escala

## Overview
Sistema de escalas para igrejas. Gerencia quem faz o quê, em qual evento, com confirmação e disponibilidade.

## Core Entities

### Church (Igreja)
Raiz do tenant. Toda informação pertence a uma igreja.

```
Church
├── Users (admins, líderes, membros)
├── Teams (louvor, mídia, som, etc)
├── Members (pessoas escaláveis)
├── Events (cultos, retiros, etc)
└── Schedules (escalas dos membros)
```

### User (Usuário)
Sistema de autenticação com 4 roles:

| Role | Permissões |
|------|-----------|
| SUPER_ADMIN | Acesso a todas as igrejas |
| CHURCH_ADMIN | Acesso total a uma igreja |
| LEADER | Pode criar eventos e fazer escalas |
| MEMBER | Apenas consulta e confirma escalas |

### Member (Membro)
Extensão do User com info da pessoa:
- CPF (único)
- Data de nascimento
- Data de ingresso
- Histórico de equipes

### Team (Equipe)
Grupos funcionais dentro da Igreja:
- Louvor (vocal, instrumentistas)
- Mídia (slides, vídeo)
- Som (técnicos)
- Ushers (recepção)

### TeamMember
Relacionamento entre Member e Team com:
- Função na equipe (ex: "Vocalista", "Guitarrista")
- Data de início/fim
- Se é líder da equipe

### Event (Evento)
Cultos, retiros, eventos especiais:
- Pode ter recorrência (ex: todo domingo)
- Data e local
- Tipo (culto, retiro, casamento, etc)

### Schedule (Escala)
Core do negócio: quem faz o quê em qual evento
- Relacionamento: Event + Team + Member
- Status: PENDING → CONFIRMED ou CANCELLED
- Campos únicos garantem: um membro não é escalado 2x na mesma função/evento/equipe

### Availability (Disponibilidade)
Membros indicam períodos quando não podem ser escalados:
- Range de datas
- Razão (férias, viagem, doença, etc)
- Sistema verifica antes de sugerir escalas

### Notification
Notificações em tempo real:
- Membro foi escalado
- Escala mudou
- Pedido de confirmação
- Lembretes de disponibilidade

## Permission Model

```
┌─────────────────────────────────────┐
│  SUPER_ADMIN                        │
│  - Gerencia todas as igrejas        │
│  - Cria igrejas, admins             │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  CHURCH_ADMIN                       │
│  - Gerencia uma igreja              │
│  - Cria usuários, equipes, eventos  │
│  - Faz qualquer escala              │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  LEADER                             │
│  - Cria eventos (só suas equipes)   │
│  - Pode fazer escalas de sua equipe │
│  - Vê disponibilidade da sua equipe │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  MEMBER                             │
│  - Vê suas escalas                  │
│  - Confirma/rejeita escala          │
│  - Indica disponibilidade           │
└─────────────────────────────────────┘
```

## Key Business Rules

### 1. Tenant Isolation
- Usuário nunca vê dados de outra igreja
- Guard verifica church_id em toda requisição

### 2. Schedule Assignment
- Membro só pode ser escalado 1x por evento/equipe
- Constraint UNIQUE(event_id, member_id, team_id)

### 3. Confirmation Flow
```
PENDING → (member confirms) → CONFIRMED
PENDING → (member declines) → CANCELLED
PENDING → (leader cancels) → CANCELLED
CONFIRMED → (leader changes) → PENDING
```

### 4. Availability Constraints
- Se membro tem availability=false no período, não sugerir escala
- Membro ainda pode ser forçado (por admin)

### 5. Leader Permissions
- Líder da equipe pode ver/gerenciar apenas sua equipe
- Admin pode gerenciar todas as equipes

## API Structure

```
/auth
  POST /register
  POST /login
  POST /refresh
  POST /logout

/churches
  GET / (lista todas que user pertence)
  GET /:churchId
  POST / (SUPER_ADMIN only)

/teams
  GET /churches/:churchId
  POST /churches/:churchId
  PUT /:teamId
  DELETE /:teamId

/members
  GET /churches/:churchId
  GET /churches/:churchId/teams/:teamId
  POST /churches/:churchId
  PUT /:memberId

/events
  GET /churches/:churchId
  POST /churches/:churchId
  GET /:eventId
  PUT /:eventId
  DELETE /:eventId

/schedules
  GET /churches/:churchId/events/:eventId
  GET /members/:memberId/schedules
  POST /events/:eventId/schedules
  PUT /:scheduleId
  DELETE /:scheduleId
  POST /:scheduleId/confirm
  POST /:scheduleId/decline

/availability
  GET /members/:memberId
  POST /members/:memberId
  PUT /:availabilityId
  DELETE /:availabilityId

/notifications
  GET /me/notifications
  PUT /:notificationId/read
  PUT /me/notifications/read-all
```

## Data Consistency

### Constraints
- UNIQUE(users.email)
- UNIQUE(members.cpf)
- UNIQUE(churches.slug)
- UNIQUE(teams.church_id, teams.slug)
- UNIQUE(team_members.team_id, team_members.member_id)
- UNIQUE(schedules.event_id, schedules.member_id, schedules.team_id)

### Cascades
- Church deleted → tudo relacionado é deletado
- Member deleted → schedules marcadas como CANCELLED
- Event deleted → schedules deletadas
- Team deleted → team_members e schedules afetadas

## Future Enhancements

- [ ] Repertório (músicas para louvor)
- [ ] Sugestões automáticas de escalas com IA
- [ ] Recorrência de eventos
- [ ] SMS/Push notifications
- [ ] Relatórios de participação
- [ ] Integração com Google Calendar
- [ ] Mobile app nativo (Expo/RN)
