--
-- PostgreSQL database dump
--

\restrict FySQziG8BwnUSgq7nvD6AdufZcPGAbkRLe3nFEkyvGPxeDf832YUXKZIsoncIgq

-- Dumped from database version 15.19
-- Dumped by pg_dump version 16.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: notifications_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notifications_type_enum AS ENUM (
    'SCHEDULE_ASSIGNED',
    'SCHEDULE_CHANGED',
    'CONFIRMATION_REQUESTED',
    'SCHEDULE_CANCELLED',
    'AVAILABILITY_REMINDER',
    'SCHEDULE_REMINDER',
    'EVENT_CREATED',
    'RELEASE_REQUESTED',
    'SWAP_REQUESTED',
    'SWAP_RESPONDED'
);


--
-- Name: schedule_swaps_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.schedule_swaps_status_enum AS ENUM (
    'OPEN',
    'ACCEPTED',
    'DECLINED',
    'CANCELLED'
);


--
-- Name: schedules_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.schedules_status_enum AS ENUM (
    'SCHEDULED',
    'RELEASE_REQUESTED',
    'CONFIRMED',
    'CANCELLED',
    'NO_SHOW'
);


--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.users_role_enum AS ENUM (
    'SUPER_ADMIN',
    'CHURCH_ADMIN',
    'LEADER',
    'MEMBER',
    'PASTOR',
    'PRESBYTER'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: availability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "memberId" uuid NOT NULL,
    "dateFrom" date NOT NULL,
    "dateTo" date NOT NULL,
    "isAvailable" boolean DEFAULT true NOT NULL,
    reason character varying(500),
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: churches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.churches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    address text,
    phone character varying(20),
    email character varying(255),
    "logoUrl" character varying(500),
    website character varying(255),
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: event_teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_teams (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "eventId" uuid NOT NULL,
    "teamId" uuid NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "churchId" uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    "eventType" character varying(100) DEFAULT 'culto'::character varying NOT NULL,
    "eventDate" timestamp with time zone NOT NULL,
    location character varying(255),
    "endDate" timestamp with time zone,
    active boolean DEFAULT true NOT NULL,
    "recurrenceRule" character varying(500),
    "createdById" uuid,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invitations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(12) NOT NULL,
    "churchId" uuid NOT NULL,
    "teamId" uuid,
    "createdById" uuid,
    "expiresAt" timestamp with time zone NOT NULL,
    "maxUses" integer,
    "usedCount" integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: member_weekday_availability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_weekday_availability (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "memberId" uuid NOT NULL,
    weekday smallint NOT NULL,
    "isAvailable" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.members (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" uuid NOT NULL,
    "churchId" uuid NOT NULL,
    "fullName" character varying(255) NOT NULL,
    cpf character varying(14),
    "birthDate" date,
    "joinedAt" date DEFAULT ('now'::text)::date NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    notes text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" uuid NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type public.notifications_type_enum NOT NULL,
    "relatedScheduleId" uuid,
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "relatedEventId" uuid,
    "relatedSwapId" uuid,
    "reminderHours" smallint
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" uuid NOT NULL,
    "codeHash" character varying(64) NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    "usedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" uuid NOT NULL,
    "tokenHash" character varying(255) NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "revokedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schedule_swaps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_swaps (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "scheduleId" uuid NOT NULL,
    "requestedByMemberId" uuid NOT NULL,
    "targetMemberId" uuid,
    "acceptedByMemberId" uuid,
    status public.schedule_swaps_status_enum DEFAULT 'OPEN'::public.schedule_swaps_status_enum NOT NULL,
    reason text,
    "respondedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "counterScheduleId" uuid
);


--
-- Name: schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "eventId" uuid NOT NULL,
    "teamId" uuid NOT NULL,
    "memberId" uuid NOT NULL,
    status public.schedules_status_enum DEFAULT 'SCHEDULED'::public.schedules_status_enum NOT NULL,
    "confirmedAt" timestamp with time zone,
    "confirmedById" uuid,
    notes text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "teamRoleId" uuid NOT NULL,
    "releaseReason" text,
    "releaseRequestedAt" timestamp with time zone
);


--
-- Name: team_member_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_member_roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "teamMemberId" uuid NOT NULL,
    "teamRoleId" uuid NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "teamId" uuid NOT NULL,
    "memberId" uuid NOT NULL,
    role character varying(100),
    "startedAt" date DEFAULT ('now'::text)::date NOT NULL,
    "endedAt" date,
    "isLeader" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: team_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "teamId" uuid NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    color character varying(7),
    "defaultSlots" integer DEFAULT 1 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "churchId" uuid NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    color character varying(7),
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    "passwordHash" character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(20),
    "avatarUrl" character varying(500),
    role public.users_role_enum DEFAULT 'MEMBER'::public.users_role_enum NOT NULL,
    "churchId" uuid NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "lastLoginAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "expoPushToken" character varying(255)
);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Data for Name: availability; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.availability (id, "memberId", "dateFrom", "dateTo", "isAvailable", reason, "createdAt", "updatedAt") FROM stdin;
afab3b14-ebdf-4590-aa83-02f042bd89c6	5dbf7330-ae15-47db-b058-ecdb5154d34c	2026-10-18	2026-10-19	f	\N	2026-10-05 05:13:18.975055+00	2026-10-05 05:13:18.975055+00
\.


--
-- Data for Name: churches; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.churches (id, name, slug, description, address, phone, email, "logoUrl", website, active, "createdAt", "updatedAt") FROM stdin;
20202020-2020-4020-8020-202020202020	AD FAMA MORADA DO MORRO	ad-fama-morada-do-morro	Assembleia de Deus Fama - Morada do Morro	\N	\N	\N	\N	\N	t	2026-10-05 03:46:03.589119+00	2026-10-05 03:46:03.589119+00
\.


--
-- Data for Name: event_teams; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.event_teams (id, "eventId", "teamId", "createdAt") FROM stdin;
e90b3607-c7df-4513-9307-8f4a1f653f8e	3a2a1f07-0c01-401f-a097-4f81e2f7203a	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 05:03:47.21666+00
137ba2a0-c39d-4ce9-b34c-8ce31daec527	de6a844f-fd4f-46d4-a7b5-e9b739eec442	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 05:03:47.21666+00
e3a98dde-41f0-408c-b597-5a7a6a07b178	7277c388-a713-46d7-a3b6-8cdb66d6b42e	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 05:03:47.21666+00
8a88a34e-a78d-42e0-a822-bbb4eebf7de5	fd4517ca-231d-48f1-96ac-be1d84cd1eac	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 05:03:47.21666+00
a0811322-83fb-4a91-99a9-6cf51827776c	3194c420-4f63-4bf2-9b9a-383dcf0555e8	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 05:03:47.21666+00
e22aa6cb-4140-437a-9f48-f4e9b917b1ce	1d0bf4c8-c61e-4352-aefd-ab8992d0baf3	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 05:03:47.21666+00
b637922c-b7e3-4b8e-8673-d5f4e8162fc6	63a82b27-50ec-40e0-9cbb-702dd53caa6b	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 05:03:47.21666+00
460669c6-833d-4999-80b1-0f3710239639	fb0b1954-3116-4a60-812b-057bd24ff1b2	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 05:03:47.21666+00
93ad6813-fbbe-4422-b5cb-48ef46031585	8a8d8e98-301c-4356-959b-bb8230f0f2df	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 05:17:54.477726+00
31e42130-05e1-4ea2-a155-7da392a9dca5	347665b8-b63b-460b-b089-168ef8e4cf1e	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
68ccde35-3e99-4a27-87f2-175b7a4afe12	e221c553-746c-4867-8ad7-59151940d4bf	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
3c6a9842-b560-4042-b502-8598dbb3406b	0d8effa3-8557-4089-951a-aea965176f93	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
e7210a97-258d-4543-84b2-ff099cfb2339	76bd778c-46b6-4a1b-83fc-578dcb923e38	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
65024fd2-983b-41da-aebd-cf5a64f6ba8c	8172811f-4aea-48d8-aa7b-f1fc494f8d0a	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
610df055-ab79-4863-90f1-d2dc232d0e27	ced54a70-b7cf-46b0-ae82-17637defcb28	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
bba51fd4-af1c-4b5d-bd16-a846178fabf2	c0e21f5f-1bad-4e27-8760-456391b10075	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
f8743da2-8c6e-48f1-8bb2-5ca130723c28	9b6f96a7-ae6d-46c0-82c0-f4fed6eea912	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
09736cbf-b9ba-40f9-a4b9-9ad8ef332a9a	2a96bf7d-6951-4090-bca3-8ee2342e7573	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
352587f6-fa2a-4140-b647-c4df30fc2c0f	cd115764-687b-4881-83d7-cfa4e1763f46	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
74611fa0-fefa-4b88-9c6d-2f3d55e3bc09	d500d0c8-ff9e-4fdd-bdcb-b704f7d4d850	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
76610dba-881f-45bb-ba98-15dd7bdeb7bf	0aa5fa7b-694c-41ff-97b4-9aafc9104d30	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
6f3fa309-8810-4f76-93fc-ae4fbfaa2c48	5e8299c7-75a8-4f32-b86e-b5a2f2356ca0	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
f4c29af4-67e3-4839-adf5-05d6e59c47ca	fe34dcf0-b5df-4995-bebb-a56675400e1c	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
e3e83473-922a-4a08-a844-9fde9240c88b	a8d47931-f3a7-416e-8490-a9dfdbd18b11	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
802a9ad4-fac1-4149-95ef-79db1b949cd3	cd57a556-2155-41d3-9fbf-5c765d43b690	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
9ba40523-668b-4f32-bdf1-8bec68b2a0e9	13060f39-00e1-465b-b506-5327177479c4	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
9a25dea2-7fe9-41d5-90b9-da4f4b137bbd	544403ef-acaf-4461-8e4e-9ad665a5016c	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
6289d800-63d0-4089-9a1e-375e3b08c5f2	3e59fb08-c28b-43fe-a2d7-6090850ba0d8	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
e47403fe-a8d2-471e-a077-562b9ada5178	96a06fee-651e-4efe-9ed7-cc845fc5eee8	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
9d544e80-f898-4762-9ebc-82b8cf10a6f2	3f27b38c-d7de-46b1-b7d0-8d2880257e82	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
0a325f3f-c7dd-4347-900a-ea21f7ea8530	070b22dc-a913-431d-a12a-d00e5aeaddc1	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
b85cff65-3e9c-46ed-a721-f26bb43ce48d	28761cfb-a17f-464f-b025-08bd219fb2c5	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
d8e8e78b-8abf-4107-863b-abb27edddc69	821c6cc9-1801-45f5-ad27-6d2851e68edc	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
2e6baabf-e523-4ba2-8c07-26d375510b39	a092ae74-b05b-449e-807a-402df6dae43a	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
fe6fc134-3001-4132-bf20-b9a6d4de68f5	3b98da4c-5c29-40ae-a272-b6645b762f1f	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
ac47c3d3-286d-4331-9146-610818d3791c	0ca0fba7-af18-4186-bc7c-4aaed65b9913	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
ded7644a-a76a-42ce-bda1-54ce48dd5c92	b4f688fb-7455-467a-b432-dc80879e7c3d	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
e3df6919-938f-44dc-b9e3-858f3956c578	638d2a06-9c84-4404-b1ef-025b5e0dacc6	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
392e300c-cd97-4f63-895f-3a27da89586c	7b89952e-61c4-4dfe-a917-aa13d59541f4	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 17:56:05.969644+00
09c5d7c1-4504-4732-967c-264ff4446f4f	5d3c0b1c-442c-49a3-87d2-325db7a67bcb	01fc43af-3a93-43c3-b5ce-9e80709203d2	2026-10-05 22:19:48.218813+00
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.events (id, "churchId", name, description, "eventType", "eventDate", location, "endDate", active, "recurrenceRule", "createdById", "createdAt", "updatedAt") FROM stdin;
3a2a1f07-0c01-401f-a097-4f81e2f7203a	20202020-2020-4020-8020-202020202020	EBD - Escola Bíblica Dominical	Escola Bíblica Dominical	culto	2026-09-27 12:00:00+00	\N	\N	t	FREQ=WEEKLY;BYDAY=SU	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 05:03:47.21666+00	2026-10-05 05:03:47.21666+00
de6a844f-fd4f-46d4-a7b5-e9b739eec442	20202020-2020-4020-8020-202020202020	Culto de Ensino	Culto de ensino bíblico	culto	2026-09-29 22:30:00+00	\N	\N	t	FREQ=WEEKLY;BYDAY=TU	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 05:03:47.21666+00	2026-10-05 05:03:47.21666+00
fd4517ca-231d-48f1-96ac-be1d84cd1eac	20202020-2020-4020-8020-202020202020	Culto de Ceia	Santa Ceia do Senhor	culto	2026-09-06 21:00:00+00	\N	\N	t	FREQ=MONTHLY;BYDAY=1SU	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 05:03:47.21666+00	2026-10-05 05:03:47.21666+00
3194c420-4f63-4bf2-9b9a-383dcf0555e8	20202020-2020-4020-8020-202020202020	Culto dos Varões	Culto dos varões	culto	2026-09-13 21:00:00+00	\N	\N	t	FREQ=MONTHLY;BYDAY=2SU	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 05:03:47.21666+00	2026-10-05 05:03:47.21666+00
1d0bf4c8-c61e-4352-aefd-ab8992d0baf3	20202020-2020-4020-8020-202020202020	Culto da CIBE	Culto da CIBE	culto	2026-09-20 21:00:00+00	\N	\N	t	FREQ=MONTHLY;BYDAY=3SU	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 05:03:47.21666+00	2026-10-05 05:03:47.21666+00
63a82b27-50ec-40e0-9cbb-702dd53caa6b	20202020-2020-4020-8020-202020202020	Culto dos Jovens e Adolescentes	Culto dos jovens e adolescentes	culto	2026-09-27 21:00:00+00	\N	\N	t	FREQ=MONTHLY;BYDAY=4SU	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 05:03:47.21666+00	2026-10-05 05:03:47.21666+00
fb0b1954-3116-4a60-812b-057bd24ff1b2	20202020-2020-4020-8020-202020202020	Culto de Louvor e Adoração	Culto de louvor e adoração - quando há 5o domingo	culto	2026-08-30 21:00:00+00	\N	\N	t	FREQ=MONTHLY;BYDAY=5SU	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 05:03:47.21666+00	2026-10-05 05:03:47.21666+00
7277c388-a713-46d7-a3b6-8cdb66d6b42e	20202020-2020-4020-8020-202020202020	Culto de Oração	Culto de oração - quinta antes da Ceia	culto	2026-09-03 22:30:00+00	\N	\N	t	FREQ=MONTHLY;BYDAY=1SU;OFFSET=-3	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 05:03:47.21666+00	2026-10-05 05:03:47.21666+00
8a8d8e98-301c-4356-959b-bb8230f0f2df	20202020-2020-4020-8020-202020202020	Reunião de Líderes Regional 20	Reunião de líderes após o culto de Ceia	culto	2026-09-07 22:30:00+00	\N	\N	t	FREQ=MONTHLY;BYDAY=1SU;OFFSET=1	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 05:17:54.477726+00	2026-10-05 05:17:54.477726+00
347665b8-b63b-460b-b089-168ef8e4cf1e	20202020-2020-4020-8020-202020202020	EBD - Escola Bíblica Dominical	EBD	culto	2026-10-04 12:00:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
e221c553-746c-4867-8ad7-59151940d4bf	20202020-2020-4020-8020-202020202020	EBD - Escola Bíblica Dominical	EBD	culto	2026-10-11 12:00:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
0d8effa3-8557-4089-951a-aea965176f93	20202020-2020-4020-8020-202020202020	EBD - Escola Bíblica Dominical	EBD	culto	2026-10-18 12:00:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
76bd778c-46b6-4a1b-83fc-578dcb923e38	20202020-2020-4020-8020-202020202020	EBD - Escola Bíblica Dominical	EBD	culto	2026-10-25 12:00:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
8172811f-4aea-48d8-aa7b-f1fc494f8d0a	20202020-2020-4020-8020-202020202020	Culto de Ensino	Ensino	culto	2026-10-06 22:30:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
ced54a70-b7cf-46b0-ae82-17637defcb28	20202020-2020-4020-8020-202020202020	Culto de Ensino	Ensino	culto	2026-10-13 22:30:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
c0e21f5f-1bad-4e27-8760-456391b10075	20202020-2020-4020-8020-202020202020	Culto de Ensino	Ensino	culto	2026-10-20 22:30:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
9b6f96a7-ae6d-46c0-82c0-f4fed6eea912	20202020-2020-4020-8020-202020202020	Culto de Ensino	Ensino	culto	2026-10-27 22:30:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
2a96bf7d-6951-4090-bca3-8ee2342e7573	20202020-2020-4020-8020-202020202020	Culto de Oração	Oração	culto	2026-10-01 22:30:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
cd115764-687b-4881-83d7-cfa4e1763f46	20202020-2020-4020-8020-202020202020	Culto de Ceia	Ceia	culto	2026-10-04 21:00:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
d500d0c8-ff9e-4fdd-bdcb-b704f7d4d850	20202020-2020-4020-8020-202020202020	Reunião de Líderes Regional 20	Líderes	culto	2026-10-05 22:30:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
0aa5fa7b-694c-41ff-97b4-9aafc9104d30	20202020-2020-4020-8020-202020202020	Culto dos Varões	Varões	culto	2026-10-11 21:00:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
5e8299c7-75a8-4f32-b86e-b5a2f2356ca0	20202020-2020-4020-8020-202020202020	Culto da CIBE	CIBE	culto	2026-10-18 21:00:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
fe34dcf0-b5df-4995-bebb-a56675400e1c	20202020-2020-4020-8020-202020202020	Culto dos Jovens e Adolescentes	Jovens	culto	2026-10-25 21:00:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
a8d47931-f3a7-416e-8490-a9dfdbd18b11	20202020-2020-4020-8020-202020202020	EBD - Escola Bíblica Dominical	EBD	culto	2026-11-01 12:00:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
cd57a556-2155-41d3-9fbf-5c765d43b690	20202020-2020-4020-8020-202020202020	EBD - Escola Bíblica Dominical	EBD	culto	2026-11-08 12:00:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
13060f39-00e1-465b-b506-5327177479c4	20202020-2020-4020-8020-202020202020	EBD - Escola Bíblica Dominical	EBD	culto	2026-11-15 12:00:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
544403ef-acaf-4461-8e4e-9ad665a5016c	20202020-2020-4020-8020-202020202020	EBD - Escola Bíblica Dominical	EBD	culto	2026-11-22 12:00:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
3e59fb08-c28b-43fe-a2d7-6090850ba0d8	20202020-2020-4020-8020-202020202020	EBD - Escola Bíblica Dominical	EBD	culto	2026-11-29 12:00:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
96a06fee-651e-4efe-9ed7-cc845fc5eee8	20202020-2020-4020-8020-202020202020	Culto de Ensino	Ensino	culto	2026-11-03 22:30:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
3f27b38c-d7de-46b1-b7d0-8d2880257e82	20202020-2020-4020-8020-202020202020	Culto de Ensino	Ensino	culto	2026-11-10 22:30:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
070b22dc-a913-431d-a12a-d00e5aeaddc1	20202020-2020-4020-8020-202020202020	Culto de Ensino	Ensino	culto	2026-11-17 22:30:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
28761cfb-a17f-464f-b025-08bd219fb2c5	20202020-2020-4020-8020-202020202020	Culto de Ensino	Ensino	culto	2026-11-24 22:30:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
821c6cc9-1801-45f5-ad27-6d2851e68edc	20202020-2020-4020-8020-202020202020	Culto de Oração	Oração	culto	2026-10-29 22:30:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
a092ae74-b05b-449e-807a-402df6dae43a	20202020-2020-4020-8020-202020202020	Culto de Ceia	Ceia	culto	2026-11-01 21:00:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
3b98da4c-5c29-40ae-a272-b6645b762f1f	20202020-2020-4020-8020-202020202020	Reunião de Líderes Regional 20	Líderes	culto	2026-11-02 22:30:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
0ca0fba7-af18-4186-bc7c-4aaed65b9913	20202020-2020-4020-8020-202020202020	Culto dos Varões	Varões	culto	2026-11-08 21:00:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
b4f688fb-7455-467a-b432-dc80879e7c3d	20202020-2020-4020-8020-202020202020	Culto da CIBE	CIBE	culto	2026-11-15 21:00:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
638d2a06-9c84-4404-b1ef-025b5e0dacc6	20202020-2020-4020-8020-202020202020	Culto dos Jovens e Adolescentes	Jovens	culto	2026-11-22 21:00:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
7b89952e-61c4-4dfe-a917-aa13d59541f4	20202020-2020-4020-8020-202020202020	Culto de Louvor e Adoração	Louvor	culto	2026-11-29 21:00:00+00	\N	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 17:56:05.969644+00	2026-10-05 17:56:05.969644+00
5d3c0b1c-442c-49a3-87d2-325db7a67bcb	20202020-2020-4020-8020-202020202020	Pré incendiados	\N	culto	2026-10-10 20:00:00+00	Ad fama	\N	t	\N	f9da3a79-3800-46cb-9552-7393cf9222b0	2026-10-05 22:19:48.206643+00	2026-10-05 22:19:48.206643+00
\.


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invitations (id, code, "churchId", "teamId", "createdById", "expiresAt", "maxUses", "usedCount", active, "createdAt") FROM stdin;
\.


--
-- Data for Name: member_weekday_availability; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.member_weekday_availability (id, "memberId", weekday, "isAvailable", "createdAt", "updatedAt") FROM stdin;
f374fc00-61d5-4e34-bce0-7169b41a9a3d	df608a36-7471-4738-97c7-287e42b8ac46	1	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
ddfae3b9-b3a4-4332-a932-eabdf70cd3be	df608a36-7471-4738-97c7-287e42b8ac46	2	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
47aa3210-edb9-43be-9366-7bbb1dcd9ad0	df608a36-7471-4738-97c7-287e42b8ac46	3	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
431a33c2-c283-49c3-aaf4-532d79f78dbc	df608a36-7471-4738-97c7-287e42b8ac46	4	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
99eb5146-3cc2-4ad3-8c8e-41b34cd19dc8	df608a36-7471-4738-97c7-287e42b8ac46	5	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
0f048d02-425e-47ee-8f40-94865d4e4a9f	df608a36-7471-4738-97c7-287e42b8ac46	6	t	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
41391d24-9b7b-4dea-81e7-eab0f069a0db	bf0b4109-e5e9-40f7-bcc8-105f6020df98	0	t	2026-10-05 18:12:54.117941+00	2026-10-05 18:12:54.117941+00
9ff6e1da-e898-4f3c-a1e8-13d9dea590cf	bf0b4109-e5e9-40f7-bcc8-105f6020df98	1	t	2026-10-05 18:12:54.117941+00	2026-10-05 18:12:54.117941+00
beeeaec8-e6c1-4f5a-928d-32277aaa240d	bf0b4109-e5e9-40f7-bcc8-105f6020df98	2	t	2026-10-05 18:12:54.117941+00	2026-10-05 18:12:54.117941+00
b1a0b6c6-f2b4-4da4-b5d1-105fc9c529f2	bf0b4109-e5e9-40f7-bcc8-105f6020df98	3	t	2026-10-05 18:12:54.117941+00	2026-10-05 18:12:54.117941+00
c378b8cb-7e0e-4d81-a016-cfdfefb50d56	bf0b4109-e5e9-40f7-bcc8-105f6020df98	4	t	2026-10-05 18:12:54.117941+00	2026-10-05 18:12:54.117941+00
9d57581d-f3a2-47fa-9902-5e29fa619477	bf0b4109-e5e9-40f7-bcc8-105f6020df98	5	t	2026-10-05 18:12:54.117941+00	2026-10-05 18:12:54.117941+00
e160c338-fd57-4fb2-a701-51fbb65bab82	bf0b4109-e5e9-40f7-bcc8-105f6020df98	6	t	2026-10-05 18:12:54.117941+00	2026-10-05 18:12:54.117941+00
fcd7ec4f-fdcd-46a6-9faa-f9b028b2b932	3fa6bde9-7be0-47de-8985-f586a34ddfc3	1	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
ea3d3585-c32c-4506-9a9c-a1d4a8cbced2	3fa6bde9-7be0-47de-8985-f586a34ddfc3	2	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
a7432d45-4f8f-410d-bc74-2bc8d4ab144c	3fa6bde9-7be0-47de-8985-f586a34ddfc3	3	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
b4557709-dd7d-4340-b934-7d527aaafcf7	3fa6bde9-7be0-47de-8985-f586a34ddfc3	4	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
83498023-7289-431d-8886-701734a5c5d2	3fa6bde9-7be0-47de-8985-f586a34ddfc3	5	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
40c20578-7ae7-430f-b40c-6ee6a805ae4d	3fa6bde9-7be0-47de-8985-f586a34ddfc3	0	t	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
17a4ac5d-5865-4675-bd0a-e520751deeb9	3fa6bde9-7be0-47de-8985-f586a34ddfc3	6	t	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
22873e8f-b735-4326-a45a-365b40aed794	df608a36-7471-4738-97c7-287e42b8ac46	0	t	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
50f829c0-e2a9-4295-95d0-2c7021e63261	5dbf7330-ae15-47db-b058-ecdb5154d34c	0	t	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
e322fcef-f9bc-4282-a85f-d911e2dcea8b	5dbf7330-ae15-47db-b058-ecdb5154d34c	1	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
ca42b047-cae6-44f3-b14e-779cb4577d0a	5dbf7330-ae15-47db-b058-ecdb5154d34c	2	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
9aebd14e-7779-4d5c-a4f1-270e8427cb45	5dbf7330-ae15-47db-b058-ecdb5154d34c	3	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
ef4c90f1-66e6-4048-b23d-6ec5aecb7ab3	5dbf7330-ae15-47db-b058-ecdb5154d34c	4	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
c9dd3574-100d-4cb1-906c-2a341494161a	5dbf7330-ae15-47db-b058-ecdb5154d34c	5	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
60b79dfe-5e29-4a51-8021-79bc93877d3a	5dbf7330-ae15-47db-b058-ecdb5154d34c	6	t	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
5dcc259b-5297-4d3d-95e0-b3e54e5c8ddb	93911583-0881-45e3-840f-258f5c99691a	0	t	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
4abab8ce-543f-4458-a497-12003becb924	93911583-0881-45e3-840f-258f5c99691a	1	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
b719b6be-df72-4ce1-86e1-1e118b97c469	93911583-0881-45e3-840f-258f5c99691a	2	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
59aaed67-e14d-4792-b147-1183ac705749	93911583-0881-45e3-840f-258f5c99691a	3	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
035997c5-d807-4d75-a921-aeef4cdcae75	93911583-0881-45e3-840f-258f5c99691a	4	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
cb4032d1-71ab-4696-b85b-fb4413cbb2a7	93911583-0881-45e3-840f-258f5c99691a	5	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
b23f1eaf-eec6-40ab-a611-651543597d9c	93911583-0881-45e3-840f-258f5c99691a	6	t	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
e2148784-3814-4dbc-b931-26e1aa7224f8	ed1bfca4-06ee-4281-911f-15220b812968	0	t	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
12909921-cce8-445e-a4c0-f959f912befc	ed1bfca4-06ee-4281-911f-15220b812968	1	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
ce0b6396-6348-453f-8750-f65c62b19e67	ed1bfca4-06ee-4281-911f-15220b812968	2	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
67ff0ca2-06fc-47b6-bf22-d2883d964818	ed1bfca4-06ee-4281-911f-15220b812968	3	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
199bfbd2-60b8-4aec-b445-bcc2d0a9e279	ed1bfca4-06ee-4281-911f-15220b812968	4	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
5b9df7dc-d2f2-4058-b3c3-bb1d4346927a	ed1bfca4-06ee-4281-911f-15220b812968	5	f	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
59163bb1-e89b-4412-a3d1-775943482f58	ed1bfca4-06ee-4281-911f-15220b812968	6	t	2026-10-05 04:46:15.0794+00	2026-10-05 04:46:15.0794+00
\.


--
-- Data for Name: members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.members (id, "userId", "churchId", "fullName", cpf, "birthDate", "joinedAt", status, notes, "createdAt", "updatedAt") FROM stdin;
5dbf7330-ae15-47db-b058-ecdb5154d34c	f9da3a79-3800-46cb-9552-7393cf9222b0	20202020-2020-4020-8020-202020202020	Victor	\N	\N	2026-10-05	active	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
d27865b7-a166-45a3-96db-bdd966a64bae	b1c7c1de-e69e-4edd-9436-5d6113383e11	20202020-2020-4020-8020-202020202020	Julio Cesar	\N	\N	2026-10-05	active	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
93911583-0881-45e3-840f-258f5c99691a	89bae816-fc08-4699-b8fe-80e2d366fe8b	20202020-2020-4020-8020-202020202020	Arthur	\N	\N	2026-10-05	active	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
ed1bfca4-06ee-4281-911f-15220b812968	7b3fcfc0-ffeb-4364-945f-791d90306e94	20202020-2020-4020-8020-202020202020	Joabe	\N	\N	2026-10-05	active	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
eac5429d-bb26-49cf-925a-46101b4ebe5d	62293d0e-3fe0-4e22-9590-ed4b2d0475f1	20202020-2020-4020-8020-202020202020	Sarah	\N	\N	2026-10-05	active	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
2b06255a-b6ce-4047-b711-2b0e2e56c0aa	b95cfd1c-479d-495e-9dd5-9fe5e024a567	20202020-2020-4020-8020-202020202020	Kalita	\N	\N	2026-10-05	active	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
3fa6bde9-7be0-47de-8985-f586a34ddfc3	3c294d36-1f45-4b41-97d1-2ba35af9a982	20202020-2020-4020-8020-202020202020	Ana Rafaela	\N	\N	2026-10-05	active	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
377daec7-1a1d-4556-a439-7ff2fb4682ea	5c365b12-4dba-47b1-8c27-57edd57e347d	20202020-2020-4020-8020-202020202020	Melina	\N	\N	2026-10-05	active	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
0c265ee3-396c-45cc-af03-1d98dc11abd7	8d4694e5-85b1-4859-8d69-ca057f06472e	20202020-2020-4020-8020-202020202020	Victor Gabriel	\N	\N	2026-10-05	active	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
b7253db9-2d50-4b59-935e-7811e491cebb	51521a8f-04b3-4aa5-a66e-9c183d631554	20202020-2020-4020-8020-202020202020	Roberthy	\N	\N	2026-10-05	active	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
8a91239b-3ebe-4f49-a78a-6aa67aa976f8	eee4656b-fa91-4752-a2a5-4e3ebdd535e6	20202020-2020-4020-8020-202020202020	Debora	\N	\N	2026-10-05	active	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
b2566d2c-6a16-4f5e-b893-7762be3eae1e	6a3c317a-dfa6-4d55-92d2-0e920e9ed791	20202020-2020-4020-8020-202020202020	Kauã	\N	\N	2026-10-05	active	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
df608a36-7471-4738-97c7-287e42b8ac46	4b2e541f-3d17-46ab-a62b-381d08eea069	20202020-2020-4020-8020-202020202020	Andreza	\N	\N	2026-10-05	active	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
bf0b4109-e5e9-40f7-bcc8-105f6020df98	842fba3e-730f-4119-8519-8eba7bf28c39	20202020-2020-4020-8020-202020202020	Isaac	\N	\N	2026-10-05	active	\N	2026-10-05 18:12:54.117941+00	2026-10-05 18:12:54.117941+00
89fd4865-59be-43e9-9954-58d6cbeee152	a6a2be06-6449-4bb6-ae5a-eea6469b0729	20202020-2020-4020-8020-202020202020	Maria Luiza Galvao	\N	\N	2026-10-05	active	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
a2893954-9afa-4e60-a470-c6cdf9681707	05d0a165-f40d-4bc9-b928-b698cca1d8d0	20202020-2020-4020-8020-202020202020	Maria Luiza Monteiro	\N	\N	2026-10-05	active	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
5c61bcde-f9b7-4814-870e-5a97a1608366	a208255b-3f9b-418b-ba36-10b6605a223e	20202020-2020-4020-8020-202020202020	Murilo	\N	\N	2026-10-05	inactive	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.migrations (id, "timestamp", name) FROM stdin;
1	1791055932464	InitialSchema1791055932464
2	1791059288821	TeamRolesAndSwaps1791059288821
3	1791070949929	MemberUserCascade1791070949929
4	1791071768608	WeekdayAvailability1791071768608
5	1791073700737	EventTeams1791073700737
6	1791074036846	OversightRoles1791074036846
7	1791075392533	ScheduleReleaseFlow1791075392533
8	1791373898857	PushInvitesPasswordReset1791373898857
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, "userId", title, message, type, "relatedScheduleId", "isRead", "readAt", "createdAt", "relatedEventId", "relatedSwapId", "reminderHours") FROM stdin;
86f21ed6-2576-4281-a661-fcd4bf96763b	b1c7c1de-e69e-4edd-9436-5d6113383e11	Você foi escalado(a)!	Você foi escalado(a) como Data Show no evento "EBD - Escola Bíblica Dominical" em domingo, 11/10, 09:00.	SCHEDULE_ASSIGNED	ccb6d2bd-3bd6-4fb7-a77a-bb56e41a3a16	f	\N	2026-10-05 18:20:08.021077+00	\N	\N	\N
ee5a5951-8a61-4722-a307-6de85d7947b6	62293d0e-3fe0-4e22-9590-ed4b2d0475f1	Você foi escalado(a)!	Você foi escalado(a) como Storys no evento "EBD - Escola Bíblica Dominical" em domingo, 11/10, 09:00.	SCHEDULE_ASSIGNED	65d8ea68-51b8-496e-9601-4d61a7e041d0	f	\N	2026-10-05 18:20:08.021077+00	\N	\N	\N
78fb3395-ba8e-46bc-8256-375435ff4e5e	8d4694e5-85b1-4859-8d69-ca057f06472e	Você foi escalado(a)!	Você foi escalado(a) como Data Show no evento "Culto dos Varões" em domingo, 11/10, 18:00.	SCHEDULE_ASSIGNED	141650ab-184d-464f-bc8b-d4f72f1b2374	f	\N	2026-10-05 18:20:19.910287+00	\N	\N	\N
21074f8c-ea50-43e5-98f4-3f8584470816	842fba3e-730f-4119-8519-8eba7bf28c39	Você foi escalado(a)!	Você foi escalado(a) como Fotógrafo no evento "Culto dos Varões" em domingo, 11/10, 18:00.	SCHEDULE_ASSIGNED	29e9b017-ff1e-49a6-9041-d5d371f2dfaf	f	\N	2026-10-05 18:20:19.910287+00	\N	\N	\N
e1854ab8-822a-4bf0-8fa4-295ef0c13460	5c365b12-4dba-47b1-8c27-57edd57e347d	Você foi escalado(a)!	Você foi escalado(a) como Live no evento "Culto dos Varões" em domingo, 11/10, 18:00.	SCHEDULE_ASSIGNED	9e48a186-7a3d-4100-a385-c4152a4b1a70	f	\N	2026-10-05 18:20:19.910287+00	\N	\N	\N
02522c90-e778-47d8-825f-2c9aaa887e7f	3c294d36-1f45-4b41-97d1-2ba35af9a982	Você foi escalado(a)!	Você foi escalado(a) como Storys no evento "Culto dos Varões" em domingo, 11/10, 18:00.	SCHEDULE_ASSIGNED	1661c965-ef8b-40d7-a025-855501456e8e	f	\N	2026-10-05 18:20:19.910287+00	\N	\N	\N
9d2bfc3f-8e0f-452b-92e1-1efe561feb99	89bae816-fc08-4699-b8fe-80e2d366fe8b	Você foi escalado(a)!	Você foi escalado(a) como Videomaker no evento "Culto dos Varões" em domingo, 11/10, 18:00.	SCHEDULE_ASSIGNED	154ee0d8-2d7e-4f22-8b45-b24ba90365b3	f	\N	2026-10-05 18:20:19.910287+00	\N	\N	\N
a1890930-e4c9-40e1-973b-f4433e3152f8	05d0a165-f40d-4bc9-b928-b698cca1d8d0	Você foi escalado(a)!	Você foi escalado(a) como Storys no evento "Culto dos Varões" em domingo, 11/10, 18:00.	SCHEDULE_ASSIGNED	a3117c68-df33-492a-b16c-b18c726b9268	f	\N	2026-10-05 18:20:36.577718+00	\N	\N	\N
9578af40-910d-4d00-82ae-3e532698359e	6a3c317a-dfa6-4d55-92d2-0e920e9ed791	Você foi escalado(a)!	Você foi escalado(a) como Data Show no evento "Culto de Ensino" em terça-feira, 13/10, 19:30.	SCHEDULE_ASSIGNED	9ef13e0d-b546-4af8-a6b6-77d4bd67e109	f	\N	2026-10-05 18:20:50.916274+00	\N	\N	\N
4cf2f3cb-b5f1-44ce-ac55-d41507fe7c2c	5c365b12-4dba-47b1-8c27-57edd57e347d	Você foi escalado(a)!	Você foi escalado(a) como Live no evento "Culto de Ensino" em terça-feira, 13/10, 19:30.	SCHEDULE_ASSIGNED	2cff313e-6d5d-4ba7-832a-eaca4a0d2376	f	\N	2026-10-05 18:20:50.916274+00	\N	\N	\N
72da64ab-00c2-4406-9cb7-0b2b278b108f	a208255b-3f9b-418b-ba36-10b6605a223e	Você foi escalado(a)!	Você foi escalado(a) como Storys no evento "Culto de Ensino" em terça-feira, 13/10, 19:30.	SCHEDULE_ASSIGNED	f143e50f-7da2-468e-9c23-5d0b4793a0c8	f	\N	2026-10-05 18:20:50.916274+00	\N	\N	\N
60394133-44fe-413d-bf8d-3c71d2344271	eee4656b-fa91-4752-a2a5-4e3ebdd535e6	Você foi escalado(a)!	Você foi escalado(a) como Data Show no evento "EBD - Escola Bíblica Dominical" em domingo, 18/10, 09:00.	SCHEDULE_ASSIGNED	a6a7a4f1-1a53-4ccc-84fe-ae580347ca49	f	\N	2026-10-05 18:21:11.302611+00	\N	\N	\N
d8cab738-2ce7-4beb-93da-119f14889c92	3c294d36-1f45-4b41-97d1-2ba35af9a982	Você foi escalado(a)!	Você foi escalado(a) como Storys no evento "EBD - Escola Bíblica Dominical" em domingo, 18/10, 09:00.	SCHEDULE_ASSIGNED	7bcb8ed4-33fd-4dc3-a71e-2c7b902e8550	f	\N	2026-10-05 18:21:11.302611+00	\N	\N	\N
1bdee2c1-6824-4bdf-99f7-bf237eb2ee04	51521a8f-04b3-4aa5-a66e-9c183d631554	Você foi escalado(a)!	Você foi escalado(a) como Data Show no evento "Culto da CIBE" em domingo, 18/10, 18:00.	SCHEDULE_ASSIGNED	fbe0f607-7e74-4129-9f84-8dbfb92038b0	f	\N	2026-10-05 18:21:18.321835+00	\N	\N	\N
ec2625b0-52ca-4179-bf48-fadb74344739	842fba3e-730f-4119-8519-8eba7bf28c39	Você foi escalado(a)!	Você foi escalado(a) como Fotógrafo no evento "Culto da CIBE" em domingo, 18/10, 18:00.	SCHEDULE_ASSIGNED	aa964b61-e30d-4011-b008-c107724ac7b0	f	\N	2026-10-05 18:21:18.321835+00	\N	\N	\N
5fd647ab-e81a-413e-af92-a3fd8878f5a3	b95cfd1c-479d-495e-9dd5-9fe5e024a567	Você foi escalado(a)!	Você foi escalado(a) como Live no evento "Culto da CIBE" em domingo, 18/10, 18:00.	SCHEDULE_ASSIGNED	88603cb5-094d-4152-98da-88f1d5cc2436	f	\N	2026-10-05 18:21:18.321835+00	\N	\N	\N
3f7b1174-7908-4e51-b1b0-2ae3dc61ace0	a6a2be06-6449-4bb6-ae5a-eea6469b0729	Você foi escalado(a)!	Você foi escalado(a) como Storys no evento "Culto da CIBE" em domingo, 18/10, 18:00.	SCHEDULE_ASSIGNED	a8271de7-6a48-4bb1-be83-4a650cd4984a	f	\N	2026-10-05 18:21:18.321835+00	\N	\N	\N
b14f5939-1ffc-4e2e-8781-7db2f5e087a5	7b3fcfc0-ffeb-4364-945f-791d90306e94	Você foi escalado(a)!	Você foi escalado(a) como Videomaker no evento "Culto da CIBE" em domingo, 18/10, 18:00.	SCHEDULE_ASSIGNED	39bb0fb2-9d71-463c-b21d-3efa2c459aad	f	\N	2026-10-05 18:21:18.321835+00	\N	\N	\N
ce30bbee-1190-4cb7-b909-1d8a994a8cf5	b1c7c1de-e69e-4edd-9436-5d6113383e11	Você foi escalado(a)!	Você foi escalado(a) como Data Show no evento "Culto de Ensino" em terça-feira, 20/10, 19:30.	SCHEDULE_ASSIGNED	3e9aebb7-770a-4676-a607-58f07f34dff4	f	\N	2026-10-05 18:22:02.148014+00	\N	\N	\N
519b85c3-e007-4e48-a917-8d9f49913cef	05d0a165-f40d-4bc9-b928-b698cca1d8d0	Você foi escalado(a)!	Você foi escalado(a) como Live no evento "Culto de Ensino" em terça-feira, 20/10, 19:30.	SCHEDULE_ASSIGNED	98c78534-760a-4f7a-9011-329e8af6b288	f	\N	2026-10-05 18:22:02.148014+00	\N	\N	\N
4c622d6a-2feb-4d21-9be2-f8030a7deba2	62293d0e-3fe0-4e22-9590-ed4b2d0475f1	Você foi escalado(a)!	Você foi escalado(a) como Storys no evento "Culto de Ensino" em terça-feira, 20/10, 19:30.	SCHEDULE_ASSIGNED	b95e94c7-956c-4f85-8e32-fdea36830111	f	\N	2026-10-05 18:22:02.148014+00	\N	\N	\N
0a4fbd52-a3b9-4e56-bdd0-f6119c98eab4	8d4694e5-85b1-4859-8d69-ca057f06472e	Você foi escalado(a)!	Você foi escalado(a) como Data Show no evento "EBD - Escola Bíblica Dominical" em domingo, 25/10, 09:00.	SCHEDULE_ASSIGNED	96630f00-fcde-4731-a166-752907c4b190	f	\N	2026-10-05 18:22:19.722941+00	\N	\N	\N
e7d41031-eb16-4a94-b8a1-385d251f5306	a208255b-3f9b-418b-ba36-10b6605a223e	Você foi escalado(a)!	Você foi escalado(a) como Storys no evento "EBD - Escola Bíblica Dominical" em domingo, 25/10, 09:00.	SCHEDULE_ASSIGNED	b7327d0b-8d32-460a-b9ac-1b0cde1b7651	f	\N	2026-10-05 18:22:19.722941+00	\N	\N	\N
2114574e-b8bc-4fd7-a03f-cd46bb250e17	6a3c317a-dfa6-4d55-92d2-0e920e9ed791	Você foi escalado(a)!	Você foi escalado(a) como Data Show no evento "Culto de Ensino" em terça-feira, 27/10, 19:30.	SCHEDULE_ASSIGNED	a7b2a7ac-0b3c-46c4-a2ab-aee7d450e98a	f	\N	2026-10-05 18:22:30.48756+00	\N	\N	\N
5022acaf-2ea3-4c60-8d25-465b2728d7bc	5c365b12-4dba-47b1-8c27-57edd57e347d	Você foi escalado(a)!	Você foi escalado(a) como Live no evento "Culto de Ensino" em terça-feira, 27/10, 19:30.	SCHEDULE_ASSIGNED	26a19b5a-aaef-422c-aa20-a9f39c7ab4eb	f	\N	2026-10-05 18:22:30.48756+00	\N	\N	\N
027e8a83-2b1e-4fda-87d4-0ab84a087321	a6a2be06-6449-4bb6-ae5a-eea6469b0729	Você foi escalado(a)!	Você foi escalado(a) como Storys no evento "Culto de Ensino" em terça-feira, 27/10, 19:30.	SCHEDULE_ASSIGNED	e350d517-bca8-4ca5-bfde-7b41476e04e1	f	\N	2026-10-05 18:22:30.48756+00	\N	\N	\N
790e53ff-8ef6-4a19-8f5a-038df57ab6f4	eee4656b-fa91-4752-a2a5-4e3ebdd535e6	Você foi escalado(a)!	Você foi escalado(a) como Data Show no evento "Culto de Oração" em quinta-feira, 29/10, 19:30.	SCHEDULE_ASSIGNED	a2cb99f8-91cb-4626-98bd-9da79a5e92da	f	\N	2026-10-05 18:22:42.324695+00	\N	\N	\N
ca0f6992-3f1a-463b-8a6f-70303a91cde6	62293d0e-3fe0-4e22-9590-ed4b2d0475f1	Você foi escalado(a)!	Você foi escalado(a) como Storys no evento "Culto de Oração" em quinta-feira, 29/10, 19:30.	SCHEDULE_ASSIGNED	757296b2-bc22-4382-8183-8c61da269675	f	\N	2026-10-05 18:22:42.324695+00	\N	\N	\N
390d84ad-7a76-4c37-9485-6c0a2a6bf917	51521a8f-04b3-4aa5-a66e-9c183d631554	Você foi escalado(a)!	Você foi escalado(a) como Data Show no evento "EBD - Escola Bíblica Dominical" em domingo, 01/11, 09:00.	SCHEDULE_ASSIGNED	052461c3-4c10-455e-9b57-919f34eaac90	f	\N	2026-10-05 18:22:53.391395+00	\N	\N	\N
167519f1-2107-4ddb-ae4c-80bb179a96e2	3c294d36-1f45-4b41-97d1-2ba35af9a982	Você foi escalado(a)!	Você foi escalado(a) como Storys no evento "EBD - Escola Bíblica Dominical" em domingo, 01/11, 09:00.	SCHEDULE_ASSIGNED	33d35e37-f83f-44d4-b7f1-fef2321404b9	f	\N	2026-10-05 18:22:53.391395+00	\N	\N	\N
d971c0bc-763b-4e07-9eba-e98138625ad4	b1c7c1de-e69e-4edd-9436-5d6113383e11	Você foi escalado(a)!	Você foi escalado(a) como Data Show no evento "Culto de Ceia" em domingo, 01/11, 18:00.	SCHEDULE_ASSIGNED	095b5444-58f8-4fde-9901-d9f775c06cc6	f	\N	2026-10-05 18:23:04.776969+00	\N	\N	\N
29137f2d-e8c9-40e0-ba4c-f420ab6876cd	f9da3a79-3800-46cb-9552-7393cf9222b0	Você foi escalado(a)!	Você foi escalado(a) como Fotógrafo no evento "Culto de Ceia" em domingo, 01/11, 18:00.	SCHEDULE_ASSIGNED	9a93211f-2cde-425f-9f24-91562a495774	f	\N	2026-10-05 18:23:04.776969+00	\N	\N	\N
1ea5c3f2-d8f1-46f8-8d68-9edc4293c971	05d0a165-f40d-4bc9-b928-b698cca1d8d0	Você foi escalado(a)!	Você foi escalado(a) como Live no evento "Culto de Ceia" em domingo, 01/11, 18:00.	SCHEDULE_ASSIGNED	bc3f46de-32d5-4eca-8cd3-eb7f4c8e43e2	f	\N	2026-10-05 18:23:04.776969+00	\N	\N	\N
97815645-b545-42af-a854-13b812e1e8bf	b95cfd1c-479d-495e-9dd5-9fe5e024a567	Você foi escalado(a)!	Você foi escalado(a) como Storys no evento "Culto de Ceia" em domingo, 01/11, 18:00.	SCHEDULE_ASSIGNED	2d564e49-62b6-46f3-8665-6c10524e1341	f	\N	2026-10-05 18:23:04.776969+00	\N	\N	\N
00c43ad3-d6c3-44ec-acce-cfac2559150f	89bae816-fc08-4699-b8fe-80e2d366fe8b	Você foi escalado(a)!	Você foi escalado(a) como Videomaker no evento "Culto de Ceia" em domingo, 01/11, 18:00.	SCHEDULE_ASSIGNED	3fc68212-666a-4482-91e1-bbf56936b34f	f	\N	2026-10-05 18:23:04.776969+00	\N	\N	\N
443f4b17-b025-42c7-8858-309c6b59fe10	f9da3a79-3800-46cb-9552-7393cf9222b0	Você foi escalado(a)!	Você foi escalado(a) como Data Show no evento "Culto dos Jovens e Adolescentes" em domingo, 25/10, 18:00.	SCHEDULE_ASSIGNED	26cf8393-7f9a-42a1-a66b-b2524efd2369	f	\N	2026-10-05 19:31:13.279605+00	\N	\N	\N
bfb6031a-ba8b-4255-9dd0-f5b17a6e4f8a	842fba3e-730f-4119-8519-8eba7bf28c39	Você foi escalado(a)!	Você foi escalado(a) como Fotógrafo no evento "Culto dos Jovens e Adolescentes" em domingo, 25/10, 18:00.	SCHEDULE_ASSIGNED	7737492c-46fc-45b1-b0c2-49ba30a1b689	f	\N	2026-10-05 19:31:13.279605+00	\N	\N	\N
a69f26c8-123d-4cc4-9ebe-8798f77fd840	5c365b12-4dba-47b1-8c27-57edd57e347d	Você foi escalado(a)!	Você foi escalado(a) como Live no evento "Culto dos Jovens e Adolescentes" em domingo, 25/10, 18:00.	SCHEDULE_ASSIGNED	6fdedc40-0ff2-4b76-94a7-da4010a7dcef	f	\N	2026-10-05 19:31:13.279605+00	\N	\N	\N
ec7541b2-d5a8-48a5-b1bf-146aaa79194a	89bae816-fc08-4699-b8fe-80e2d366fe8b	Você foi escalado(a)!	Você foi escalado(a) como Storys no evento "Culto dos Jovens e Adolescentes" em domingo, 25/10, 18:00.	SCHEDULE_ASSIGNED	6c8ecfce-043e-42eb-a827-aaf254cc1f61	f	\N	2026-10-05 19:31:13.279605+00	\N	\N	\N
01239b79-70f2-4162-a793-e557ccae76de	7b3fcfc0-ffeb-4364-945f-791d90306e94	Você foi escalado(a)!	Você foi escalado(a) como Videomaker no evento "Culto dos Jovens e Adolescentes" em domingo, 25/10, 18:00.	SCHEDULE_ASSIGNED	557ce5c3-6465-4070-acb1-d9ba5955824a	f	\N	2026-10-05 19:31:13.279605+00	\N	\N	\N
db87ec3f-cdb5-474e-a6cc-7cecdd04fd60	b1c7c1de-e69e-4edd-9436-5d6113383e11	Você foi escalado(a)!	Você foi escalado(a) como Fotógrafo no evento "Culto da CIBE" em domingo, 18/10, 18:00.	SCHEDULE_ASSIGNED	00d59276-7780-439e-b7d9-967d8acfd99e	f	\N	2026-10-05 19:35:30.687569+00	\N	\N	\N
f172bae8-7196-4829-af67-1910b3b621e4	eee4656b-fa91-4752-a2a5-4e3ebdd535e6	Lembrete: Reunião de Líderes Regional 20	Faltam 1 hora para o evento "Reunião de Líderes Regional 20". Você está escalado(a) como Data Show.	SCHEDULE_REMINDER	4fd4f9e4-9c46-4625-a38f-1bea129c58d4	f	\N	2026-10-05 21:00:00.02844+00	\N	\N	\N
294a3696-a4a2-44b9-bacd-bc3817891bed	a208255b-3f9b-418b-ba36-10b6605a223e	Lembrete: Reunião de Líderes Regional 20	Faltam 1 hora para o evento "Reunião de Líderes Regional 20". Você está escalado(a) como Storys.	SCHEDULE_REMINDER	fbbfa415-c4d2-444c-9777-12bde5c42ecd	f	\N	2026-10-05 21:00:00.02844+00	\N	\N	\N
bf4f290d-7cd8-4752-a597-e26db7916910	eee4656b-fa91-4752-a2a5-4e3ebdd535e6	Lembrete: Reunião de Líderes Regional 20	Faltam 1 hora para o evento "Reunião de Líderes Regional 20". Você está escalado(a) como Data Show.	SCHEDULE_REMINDER	4fd4f9e4-9c46-4625-a38f-1bea129c58d4	f	\N	2026-10-05 21:29:59.96257+00	\N	\N	\N
f82b0311-b854-4067-b1fc-4fc8743c2a69	b95cfd1c-479d-495e-9dd5-9fe5e024a567	Lembrete: Reunião de Líderes Regional 20	Faltam 1 hora para o evento "Reunião de Líderes Regional 20". Você está escalado(a) como Storys.	SCHEDULE_REMINDER	c644f7cb-256c-48c9-9a87-f2e1e80138f3	f	\N	2026-10-05 21:29:59.96257+00	\N	\N	\N
ce4483f3-2368-4a38-bab4-675931c3a3eb	51521a8f-04b3-4aa5-a66e-9c183d631554	Lembrete: Culto de Ensino	Faltam 24 horas para o evento "Culto de Ensino". Você está escalado(a) como Data Show.	SCHEDULE_REMINDER	07a28cbc-1e9a-432f-b949-958b817e2f9f	f	\N	2026-10-05 22:00:00.022807+00	\N	\N	\N
acfafdee-269d-43b0-b459-c3fae143f957	b95cfd1c-479d-495e-9dd5-9fe5e024a567	Lembrete: Culto de Ensino	Faltam 24 horas para o evento "Culto de Ensino". Você está escalado(a) como Live.	SCHEDULE_REMINDER	d159f2f4-d65d-4ae8-89d6-7ab39d5f2e4e	f	\N	2026-10-05 22:00:00.022807+00	\N	\N	\N
21a58ade-f945-4401-b587-9162939edab9	89bae816-fc08-4699-b8fe-80e2d366fe8b	Lembrete: Culto de Ensino	Faltam 24 horas para o evento "Culto de Ensino". Você está escalado(a) como Storys.	SCHEDULE_REMINDER	756745cb-a1f5-40ad-8326-d853fd7915b3	f	\N	2026-10-05 22:00:00.022807+00	\N	\N	\N
3a58a65f-855b-425c-a651-999c51bc682d	4b2e541f-3d17-46ab-a62b-381d08eea069	Você foi escalado(a)!	Você foi escalado(a) como Data Show no evento "Pré incendiados" em sábado, 10/10, 17:00.	SCHEDULE_ASSIGNED	92c131cb-fa2a-4346-b3ee-860f56d69a06	f	\N	2026-10-05 22:19:48.279989+00	\N	\N	\N
114def6b-d49a-4cfe-9b97-6c472f600839	842fba3e-730f-4119-8519-8eba7bf28c39	Você foi escalado(a)!	Você foi escalado(a) como Fotógrafo no evento "Pré incendiados" em sábado, 10/10, 17:00.	SCHEDULE_ASSIGNED	64de37ae-f37d-460a-8bf7-11587a2e50a9	f	\N	2026-10-05 22:19:48.279989+00	\N	\N	\N
9af171e5-7e31-49de-9eaa-6b29bbc78626	3c294d36-1f45-4b41-97d1-2ba35af9a982	Você foi escalado(a)!	Você foi escalado(a) como Live no evento "Pré incendiados" em sábado, 10/10, 17:00.	SCHEDULE_ASSIGNED	591f17ff-65d6-4235-9f4f-fcc6f666030b	f	\N	2026-10-05 22:19:48.279989+00	\N	\N	\N
c1152bdb-3702-4499-ad50-0124b1398e9c	a6a2be06-6449-4bb6-ae5a-eea6469b0729	Você foi escalado(a)!	Você foi escalado(a) como Reels no evento "Pré incendiados" em sábado, 10/10, 17:00.	SCHEDULE_ASSIGNED	25313118-345b-441a-8faa-07ee540ee670	f	\N	2026-10-05 22:19:48.279989+00	\N	\N	\N
5cff957b-5e17-49f6-840a-4f02304fc346	05d0a165-f40d-4bc9-b928-b698cca1d8d0	Você foi escalado(a)!	Você foi escalado(a) como Storys no evento "Pré incendiados" em sábado, 10/10, 17:00.	SCHEDULE_ASSIGNED	69c2ea86-1244-4f93-9be9-53dd466a5a12	f	\N	2026-10-05 22:19:48.279989+00	\N	\N	\N
1ab5a83f-77d1-47d2-b2bc-70226496f105	51521a8f-04b3-4aa5-a66e-9c183d631554	Lembrete: Culto de Ensino	Faltam 24 horas para o evento "Culto de Ensino". Você está escalado(a) como Data Show.	SCHEDULE_REMINDER	07a28cbc-1e9a-432f-b949-958b817e2f9f	f	\N	2026-10-05 22:29:59.775777+00	\N	\N	\N
8e6670a4-0810-4651-809a-3cabb01e2d4c	b95cfd1c-479d-495e-9dd5-9fe5e024a567	Lembrete: Culto de Ensino	Faltam 24 horas para o evento "Culto de Ensino". Você está escalado(a) como Live.	SCHEDULE_REMINDER	d159f2f4-d65d-4ae8-89d6-7ab39d5f2e4e	f	\N	2026-10-05 22:29:59.775777+00	\N	\N	\N
c10862d6-e5e1-4852-843d-ef81e5240567	89bae816-fc08-4699-b8fe-80e2d366fe8b	Lembrete: Culto de Ensino	Faltam 24 horas para o evento "Culto de Ensino". Você está escalado(a) como Storys.	SCHEDULE_REMINDER	756745cb-a1f5-40ad-8326-d853fd7915b3	f	\N	2026-10-05 22:29:59.775777+00	\N	\N	\N
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_tokens (id, "userId", "codeHash", "expiresAt", attempts, "usedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, "userId", "tokenHash", "expiresAt", "revokedAt", "createdAt") FROM stdin;
8f38c277-7c1b-413a-a707-b51033c15ad9	f9da3a79-3800-46cb-9552-7393cf9222b0	bf22aaea505f9638f0a3666684cf833a604998d4c11fce3cd3e11eb7a0e29bdd	2026-10-12 04:06:05.064+00	2026-10-05 04:21:30.764+00	2026-10-05 04:06:04.750486+00
1a86f717-edbf-4882-9388-11f9c3cf9d1f	f9da3a79-3800-46cb-9552-7393cf9222b0	d0a19c0991aa3e75468cd716b61f25088886a767ce8e7f7dcad6ee34633a71a0	2026-10-12 04:21:30.77+00	2026-10-05 04:37:27.656+00	2026-10-05 04:21:30.529567+00
e02a236a-d7ef-4222-a422-e1a90c0f12d4	f9da3a79-3800-46cb-9552-7393cf9222b0	cbca95d817a7c80e36b82c0cb006ce2deacf769cd140bd8c5d1e2b3fd13b014e	2026-10-12 04:37:27.66+00	2026-10-05 04:58:45.686+00	2026-10-05 04:37:27.719059+00
ec35049f-fd2f-4be1-bce2-52bad00b9cea	f9da3a79-3800-46cb-9552-7393cf9222b0	4c72cf5647b89805f557cdd1eb3530df048551807922a5c4deab508157d89da1	2026-10-12 04:58:45.704+00	2026-10-05 05:13:50.499+00	2026-10-05 04:58:46.3548+00
1a4fdc3c-6fd5-4a48-9119-8648d4d68f46	f9da3a79-3800-46cb-9552-7393cf9222b0	084642b14454211c5d5883772632140e14e2b50c0803043541ba3b421319d3dd	2026-10-12 05:13:50.51+00	2026-10-05 17:58:04.3+00	2026-10-05 05:13:50.301567+00
e178fdc0-df46-4c7a-8dff-ced2e24252c8	f9da3a79-3800-46cb-9552-7393cf9222b0	96b24c3bedd908496f493bc6aaba6d99349d5cdad1a5f039990094ff6ae306af	2026-10-12 17:58:04.309+00	2026-10-05 18:13:25.455+00	2026-10-05 17:58:04.293451+00
0c65c9f5-8714-4a2a-b615-46fbf22f38c8	f9da3a79-3800-46cb-9552-7393cf9222b0	d3a9ae66437068aaa287c6a3cd58ad3f3b29f78f1f06387e8697822bf826e865	2026-10-12 18:13:25.464+00	2026-10-05 18:36:16.795+00	2026-10-05 18:13:25.449141+00
2896bbdf-24df-479b-a654-ca548bfb5c66	f9da3a79-3800-46cb-9552-7393cf9222b0	2d546a5385b85f5b39acfdaee13e084d4bd15454b21f324e3b2572a8154a17af	2026-10-12 18:36:16.801+00	2026-10-05 19:31:04.682+00	2026-10-05 18:36:16.83088+00
b6e54a83-fa01-4593-8bdc-ec393dac24d0	f9da3a79-3800-46cb-9552-7393cf9222b0	21c69e31834e80a7f3c4fe9f624ad88219f31a73acce78a2213c9a80451880f4	2026-10-12 19:31:04.688+00	2026-10-05 20:45:57.62+00	2026-10-05 19:31:04.701636+00
50dad8da-4ef0-47bf-890c-e58e08ae6b30	f9da3a79-3800-46cb-9552-7393cf9222b0	3b940933c9b3d84d0ff21e1b68a08464b624e82a54dab5a048e0657145a109b1	2026-10-12 20:45:57.629+00	2026-10-05 21:18:28.701+00	2026-10-05 20:45:57.711714+00
d98598d0-f741-4e9d-a26a-1f12dcdb5a26	f9da3a79-3800-46cb-9552-7393cf9222b0	e04b434d212fa4505deebabc3fa556919a6641a2f26837c7d1809b1d63be274b	2026-10-12 21:18:28.706+00	2026-10-05 22:19:00.547+00	2026-10-05 21:18:28.622172+00
56602256-a029-4a6f-8a50-463eadc6c896	f9da3a79-3800-46cb-9552-7393cf9222b0	7d914919acde071b4f28b28251a557aa87710eea49e5817ca74311bd62365ab0	2026-10-12 22:19:00.554+00	\N	2026-10-05 22:19:00.625997+00
8d7911e2-d031-4d30-a5c7-bbecf501a61d	f9da3a79-3800-46cb-9552-7393cf9222b0	48cd04dd58a4110eefb0d2844528ea6fe9c7a35ba4822e6bdea9382270ebfbe3	2026-10-14 22:47:32.935+00	2026-10-07 23:12:23.913+00	2026-10-07 22:47:32.875219+00
15e70052-29a8-4d01-b539-fb650d6d7e9d	f9da3a79-3800-46cb-9552-7393cf9222b0	f1b9eb9b9cf9ac631abf76b6be56216b86b48175b4864b3a7cf9b37d10ee8d17	2026-10-14 23:12:23.928+00	\N	2026-10-07 23:12:23.91495+00
e30af75f-254f-4942-bb97-b26562fad8d4	f9da3a79-3800-46cb-9552-7393cf9222b0	c226933645769031a1c8a857c7ad639051588bf4abc3eb7ccef7fbc9965cfdae	2026-10-14 23:16:28.503+00	\N	2026-10-07 23:16:28.425793+00
\.


--
-- Data for Name: schedule_swaps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.schedule_swaps (id, "scheduleId", "requestedByMemberId", "targetMemberId", "acceptedByMemberId", status, reason, "respondedAt", "createdAt", "updatedAt", "counterScheduleId") FROM stdin;
\.


--
-- Data for Name: schedules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.schedules (id, "eventId", "teamId", "memberId", status, "confirmedAt", "confirmedById", notes, "createdAt", "updatedAt", "teamRoleId", "releaseReason", "releaseRequestedAt") FROM stdin;
3e7e17a7-52d5-4984-ace3-b43bb22fdf98	3a2a1f07-0c01-401f-a097-4f81e2f7203a	01fc43af-3a93-43c3-b5ce-9e80709203d2	0c265ee3-396c-45cc-af03-1d98dc11abd7	SCHEDULED	\N	\N	\N	2026-10-05 05:05:50.57504+00	2026-10-05 05:05:50.57504+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
ce32540d-6a5f-410e-aa3e-f43dc1a21c42	3a2a1f07-0c01-401f-a097-4f81e2f7203a	01fc43af-3a93-43c3-b5ce-9e80709203d2	2b06255a-b6ce-4047-b711-2b0e2e56c0aa	SCHEDULED	\N	\N	\N	2026-10-05 05:05:50.590461+00	2026-10-05 05:05:50.590461+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
f6c2ef92-26bb-4763-822c-1b85f9ec22bd	fd4517ca-231d-48f1-96ac-be1d84cd1eac	01fc43af-3a93-43c3-b5ce-9e80709203d2	8a91239b-3ebe-4f49-a78a-6aa67aa976f8	SCHEDULED	\N	\N	\N	2026-10-05 05:06:25.350198+00	2026-10-05 05:06:25.350198+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
3591a38c-5165-4aa6-b6a0-6845ab59afae	fd4517ca-231d-48f1-96ac-be1d84cd1eac	01fc43af-3a93-43c3-b5ce-9e80709203d2	5c61bcde-f9b7-4814-870e-5a97a1608366	SCHEDULED	\N	\N	\N	2026-10-05 05:06:25.355704+00	2026-10-05 05:06:25.355704+00	878fca34-6d9e-4f93-9d86-45409de1485f	\N	\N
df0997ae-4e68-44ad-b16c-d02bb1a05ea7	fd4517ca-231d-48f1-96ac-be1d84cd1eac	01fc43af-3a93-43c3-b5ce-9e80709203d2	377daec7-1a1d-4556-a439-7ff2fb4682ea	SCHEDULED	\N	\N	\N	2026-10-05 05:06:25.359103+00	2026-10-05 05:06:25.359103+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
4889c479-e531-4ffd-9498-b76cfd1c89c3	fd4517ca-231d-48f1-96ac-be1d84cd1eac	01fc43af-3a93-43c3-b5ce-9e80709203d2	3fa6bde9-7be0-47de-8985-f586a34ddfc3	SCHEDULED	\N	\N	\N	2026-10-05 05:06:25.362756+00	2026-10-05 05:06:25.362756+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
497e3f47-d078-47e2-af12-4268e8ffd4e9	fd4517ca-231d-48f1-96ac-be1d84cd1eac	01fc43af-3a93-43c3-b5ce-9e80709203d2	89fd4865-59be-43e9-9954-58d6cbeee152	SCHEDULED	\N	\N	\N	2026-10-05 05:06:25.366371+00	2026-10-05 05:06:25.366371+00	f8bb86df-4f84-4db0-9618-902734d8a5ef	\N	\N
48d4b32e-6211-4c25-8705-cec6ba23158f	3194c420-4f63-4bf2-9b9a-383dcf0555e8	01fc43af-3a93-43c3-b5ce-9e80709203d2	b2566d2c-6a16-4f5e-b893-7762be3eae1e	SCHEDULED	\N	\N	\N	2026-10-05 05:06:59.782178+00	2026-10-05 05:06:59.782178+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
df676f0b-0b37-43b8-b3f9-7192051dc128	3194c420-4f63-4bf2-9b9a-383dcf0555e8	01fc43af-3a93-43c3-b5ce-9e80709203d2	5dbf7330-ae15-47db-b058-ecdb5154d34c	SCHEDULED	\N	\N	\N	2026-10-05 05:06:59.795934+00	2026-10-05 05:06:59.795934+00	878fca34-6d9e-4f93-9d86-45409de1485f	\N	\N
fb5bbaa3-4ced-471b-878e-8af5c5fe96e0	3194c420-4f63-4bf2-9b9a-383dcf0555e8	01fc43af-3a93-43c3-b5ce-9e80709203d2	a2893954-9afa-4e60-a470-c6cdf9681707	SCHEDULED	\N	\N	\N	2026-10-05 05:06:59.801211+00	2026-10-05 05:06:59.801211+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
e3db60fb-ef1b-427b-a1f6-4b7fa588c851	3194c420-4f63-4bf2-9b9a-383dcf0555e8	01fc43af-3a93-43c3-b5ce-9e80709203d2	2b06255a-b6ce-4047-b711-2b0e2e56c0aa	SCHEDULED	\N	\N	\N	2026-10-05 05:06:59.80446+00	2026-10-05 05:06:59.80446+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
32585556-d62d-423f-9cd1-6666bb6b9978	3194c420-4f63-4bf2-9b9a-383dcf0555e8	01fc43af-3a93-43c3-b5ce-9e80709203d2	93911583-0881-45e3-840f-258f5c99691a	SCHEDULED	\N	\N	\N	2026-10-05 05:06:59.808074+00	2026-10-05 05:06:59.808074+00	f8bb86df-4f84-4db0-9618-902734d8a5ef	\N	\N
fbb8449a-f6c8-4262-bdc3-aec293d48cca	1d0bf4c8-c61e-4352-aefd-ab8992d0baf3	01fc43af-3a93-43c3-b5ce-9e80709203d2	b7253db9-2d50-4b59-935e-7811e491cebb	SCHEDULED	\N	\N	\N	2026-10-05 05:09:05.337144+00	2026-10-05 05:09:05.337144+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
2b1585cf-5c8b-4d47-b774-a7d08a41cb3c	1d0bf4c8-c61e-4352-aefd-ab8992d0baf3	01fc43af-3a93-43c3-b5ce-9e80709203d2	d27865b7-a166-45a3-96db-bdd966a64bae	SCHEDULED	\N	\N	\N	2026-10-05 05:09:05.35662+00	2026-10-05 05:09:05.35662+00	878fca34-6d9e-4f93-9d86-45409de1485f	\N	\N
0a278c5b-339e-4414-90f7-19389b1894b0	1d0bf4c8-c61e-4352-aefd-ab8992d0baf3	01fc43af-3a93-43c3-b5ce-9e80709203d2	377daec7-1a1d-4556-a439-7ff2fb4682ea	SCHEDULED	\N	\N	\N	2026-10-05 05:09:05.361619+00	2026-10-05 05:09:05.361619+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
a5fe6396-2dd8-488c-b0d8-97c3b4624f25	1d0bf4c8-c61e-4352-aefd-ab8992d0baf3	01fc43af-3a93-43c3-b5ce-9e80709203d2	3fa6bde9-7be0-47de-8985-f586a34ddfc3	SCHEDULED	\N	\N	\N	2026-10-05 05:09:05.365293+00	2026-10-05 05:09:05.365293+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
924840f5-48b4-492b-a548-f8b47b2e796c	1d0bf4c8-c61e-4352-aefd-ab8992d0baf3	01fc43af-3a93-43c3-b5ce-9e80709203d2	eac5429d-bb26-49cf-925a-46101b4ebe5d	SCHEDULED	\N	\N	\N	2026-10-05 05:09:05.368928+00	2026-10-05 05:09:05.368928+00	f8bb86df-4f84-4db0-9618-902734d8a5ef	\N	\N
bccdf530-376a-43c4-a829-2391256e7d37	63a82b27-50ec-40e0-9cbb-702dd53caa6b	01fc43af-3a93-43c3-b5ce-9e80709203d2	0c265ee3-396c-45cc-af03-1d98dc11abd7	SCHEDULED	\N	\N	\N	2026-10-05 05:09:18.826442+00	2026-10-05 05:09:18.826442+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
4521c14c-27ab-4920-92e0-e29f0233e22f	63a82b27-50ec-40e0-9cbb-702dd53caa6b	01fc43af-3a93-43c3-b5ce-9e80709203d2	5c61bcde-f9b7-4814-870e-5a97a1608366	SCHEDULED	\N	\N	\N	2026-10-05 05:09:18.831022+00	2026-10-05 05:09:18.831022+00	878fca34-6d9e-4f93-9d86-45409de1485f	\N	\N
5ae5bfe2-ba5c-45e4-876c-eb2da67ba8cb	63a82b27-50ec-40e0-9cbb-702dd53caa6b	01fc43af-3a93-43c3-b5ce-9e80709203d2	a2893954-9afa-4e60-a470-c6cdf9681707	SCHEDULED	\N	\N	\N	2026-10-05 05:09:18.834563+00	2026-10-05 05:09:18.834563+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
44efdff9-be2c-44e4-8678-12663e700585	63a82b27-50ec-40e0-9cbb-702dd53caa6b	01fc43af-3a93-43c3-b5ce-9e80709203d2	2b06255a-b6ce-4047-b711-2b0e2e56c0aa	SCHEDULED	\N	\N	\N	2026-10-05 05:09:18.838319+00	2026-10-05 05:09:18.838319+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
07615c63-2ec8-41af-a544-7f34e9a01523	63a82b27-50ec-40e0-9cbb-702dd53caa6b	01fc43af-3a93-43c3-b5ce-9e80709203d2	ed1bfca4-06ee-4281-911f-15220b812968	SCHEDULED	\N	\N	\N	2026-10-05 05:09:18.841727+00	2026-10-05 05:09:18.841727+00	f8bb86df-4f84-4db0-9618-902734d8a5ef	\N	\N
b3426dc0-d5b4-4566-8684-a40fc5ff13ca	de6a844f-fd4f-46d4-a7b5-e9b739eec442	01fc43af-3a93-43c3-b5ce-9e80709203d2	b2566d2c-6a16-4f5e-b893-7762be3eae1e	SCHEDULED	\N	\N	\N	2026-10-05 05:10:14.939116+00	2026-10-05 05:10:14.939116+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
ae3e8298-e23f-41d4-bb96-68599b6e4e56	de6a844f-fd4f-46d4-a7b5-e9b739eec442	01fc43af-3a93-43c3-b5ce-9e80709203d2	a2893954-9afa-4e60-a470-c6cdf9681707	SCHEDULED	\N	\N	\N	2026-10-05 05:10:14.953611+00	2026-10-05 05:10:14.953611+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
37d6566f-fbb9-47b8-b86d-21c9f684cc7f	de6a844f-fd4f-46d4-a7b5-e9b739eec442	01fc43af-3a93-43c3-b5ce-9e80709203d2	2b06255a-b6ce-4047-b711-2b0e2e56c0aa	SCHEDULED	\N	\N	\N	2026-10-05 05:10:14.958688+00	2026-10-05 05:10:14.958688+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
c2dec6b1-f7a8-4edc-af01-0f949df25631	d500d0c8-ff9e-4fdd-bdcb-b704f7d4d850	01fc43af-3a93-43c3-b5ce-9e80709203d2	df608a36-7471-4738-97c7-287e42b8ac46	CANCELLED	\N	\N	\N	2026-10-05 18:01:44.289326+00	2026-10-05 18:01:55.9375+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	Troca pelo líder	\N
b9f0eb31-0c36-41d3-af25-ef58e8a0cf0d	8172811f-4aea-48d8-aa7b-f1fc494f8d0a	01fc43af-3a93-43c3-b5ce-9e80709203d2	a2893954-9afa-4e60-a470-c6cdf9681707	CANCELLED	\N	\N	\N	2026-10-05 18:02:41.594602+00	2026-10-05 18:03:51.490031+00	761063f7-cdfd-4b02-b19a-fe65d841737b	Troca pelo líder	\N
12aebc76-59ae-488b-b912-8e380d66eb23	8172811f-4aea-48d8-aa7b-f1fc494f8d0a	01fc43af-3a93-43c3-b5ce-9e80709203d2	377daec7-1a1d-4556-a439-7ff2fb4682ea	CANCELLED	\N	\N	\N	2026-10-05 18:02:41.590472+00	2026-10-05 18:03:59.972311+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	Troca pelo líder	\N
07a28cbc-1e9a-432f-b949-958b817e2f9f	8172811f-4aea-48d8-aa7b-f1fc494f8d0a	01fc43af-3a93-43c3-b5ce-9e80709203d2	b7253db9-2d50-4b59-935e-7811e491cebb	SCHEDULED	\N	\N	\N	2026-10-05 18:05:12.454326+00	2026-10-05 18:05:12.454326+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
d159f2f4-d65d-4ae8-89d6-7ab39d5f2e4e	8172811f-4aea-48d8-aa7b-f1fc494f8d0a	01fc43af-3a93-43c3-b5ce-9e80709203d2	2b06255a-b6ce-4047-b711-2b0e2e56c0aa	SCHEDULED	\N	\N	\N	2026-10-05 18:05:12.470213+00	2026-10-05 18:05:12.470213+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
c9c6e0c3-16f7-427f-b81c-483617030756	8172811f-4aea-48d8-aa7b-f1fc494f8d0a	01fc43af-3a93-43c3-b5ce-9e80709203d2	5c61bcde-f9b7-4814-870e-5a97a1608366	CANCELLED	\N	\N	\N	2026-10-05 18:05:12.476283+00	2026-10-05 18:15:26.527434+00	761063f7-cdfd-4b02-b19a-fe65d841737b	Troca pelo líder	\N
ccb6d2bd-3bd6-4fb7-a77a-bb56e41a3a16	e221c553-746c-4867-8ad7-59151940d4bf	01fc43af-3a93-43c3-b5ce-9e80709203d2	d27865b7-a166-45a3-96db-bdd966a64bae	SCHEDULED	\N	\N	\N	2026-10-05 18:20:08.001295+00	2026-10-05 18:20:08.001295+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
141650ab-184d-464f-bc8b-d4f72f1b2374	0aa5fa7b-694c-41ff-97b4-9aafc9104d30	01fc43af-3a93-43c3-b5ce-9e80709203d2	0c265ee3-396c-45cc-af03-1d98dc11abd7	SCHEDULED	\N	\N	\N	2026-10-05 18:20:19.876506+00	2026-10-05 18:20:19.876506+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
29e9b017-ff1e-49a6-9041-d5d371f2dfaf	0aa5fa7b-694c-41ff-97b4-9aafc9104d30	01fc43af-3a93-43c3-b5ce-9e80709203d2	bf0b4109-e5e9-40f7-bcc8-105f6020df98	SCHEDULED	\N	\N	\N	2026-10-05 18:20:19.892322+00	2026-10-05 18:20:19.892322+00	878fca34-6d9e-4f93-9d86-45409de1485f	\N	\N
1661c965-ef8b-40d7-a025-855501456e8e	0aa5fa7b-694c-41ff-97b4-9aafc9104d30	01fc43af-3a93-43c3-b5ce-9e80709203d2	3fa6bde9-7be0-47de-8985-f586a34ddfc3	CANCELLED	\N	\N	\N	2026-10-05 18:20:19.900366+00	2026-10-05 18:20:36.53536+00	761063f7-cdfd-4b02-b19a-fe65d841737b	Troca pelo líder	\N
a3117c68-df33-492a-b16c-b18c726b9268	0aa5fa7b-694c-41ff-97b4-9aafc9104d30	01fc43af-3a93-43c3-b5ce-9e80709203d2	a2893954-9afa-4e60-a470-c6cdf9681707	SCHEDULED	\N	\N	\N	2026-10-05 18:20:36.569513+00	2026-10-05 18:20:36.569513+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
9ef13e0d-b546-4af8-a6b6-77d4bd67e109	ced54a70-b7cf-46b0-ae82-17637defcb28	01fc43af-3a93-43c3-b5ce-9e80709203d2	b2566d2c-6a16-4f5e-b893-7762be3eae1e	SCHEDULED	\N	\N	\N	2026-10-05 18:20:50.890073+00	2026-10-05 18:20:50.890073+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
a6a7a4f1-1a53-4ccc-84fe-ae580347ca49	0d8effa3-8557-4089-951a-aea965176f93	01fc43af-3a93-43c3-b5ce-9e80709203d2	8a91239b-3ebe-4f49-a78a-6aa67aa976f8	SCHEDULED	\N	\N	\N	2026-10-05 18:21:11.291007+00	2026-10-05 18:21:11.291007+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
7bcb8ed4-33fd-4dc3-a71e-2c7b902e8550	0d8effa3-8557-4089-951a-aea965176f93	01fc43af-3a93-43c3-b5ce-9e80709203d2	3fa6bde9-7be0-47de-8985-f586a34ddfc3	SCHEDULED	\N	\N	\N	2026-10-05 18:21:11.296758+00	2026-10-05 18:21:11.296758+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
39bb0fb2-9d71-463c-b21d-3efa2c459aad	5e8299c7-75a8-4f32-b86e-b5a2f2356ca0	01fc43af-3a93-43c3-b5ce-9e80709203d2	ed1bfca4-06ee-4281-911f-15220b812968	SCHEDULED	\N	\N	\N	2026-10-05 18:21:18.316918+00	2026-10-05 18:21:18.316918+00	f8bb86df-4f84-4db0-9618-902734d8a5ef	\N	\N
3e9aebb7-770a-4676-a607-58f07f34dff4	c0e21f5f-1bad-4e27-8760-456391b10075	01fc43af-3a93-43c3-b5ce-9e80709203d2	d27865b7-a166-45a3-96db-bdd966a64bae	SCHEDULED	\N	\N	\N	2026-10-05 18:22:02.120281+00	2026-10-05 18:22:02.120281+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
96630f00-fcde-4731-a166-752907c4b190	76bd778c-46b6-4a1b-83fc-578dcb923e38	01fc43af-3a93-43c3-b5ce-9e80709203d2	0c265ee3-396c-45cc-af03-1d98dc11abd7	SCHEDULED	\N	\N	\N	2026-10-05 18:22:19.699478+00	2026-10-05 18:22:19.699478+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
65d8ea68-51b8-496e-9601-4d61a7e041d0	e221c553-746c-4867-8ad7-59151940d4bf	01fc43af-3a93-43c3-b5ce-9e80709203d2	eac5429d-bb26-49cf-925a-46101b4ebe5d	CANCELLED	\N	\N	\N	2026-10-05 18:20:08.012322+00	2026-10-05 18:20:08.012322+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
98c78534-760a-4f7a-9011-329e8af6b288	c0e21f5f-1bad-4e27-8760-456391b10075	01fc43af-3a93-43c3-b5ce-9e80709203d2	a2893954-9afa-4e60-a470-c6cdf9681707	CANCELLED	\N	\N	\N	2026-10-05 18:22:02.136924+00	2026-10-05 18:22:02.136924+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
fbbfa415-c4d2-444c-9777-12bde5c42ecd	d500d0c8-ff9e-4fdd-bdcb-b704f7d4d850	01fc43af-3a93-43c3-b5ce-9e80709203d2	5c61bcde-f9b7-4814-870e-5a97a1608366	CANCELLED	\N	\N	\N	2026-10-05 18:02:19.438354+00	2026-10-05 18:02:19.438354+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
f143e50f-7da2-468e-9c23-5d0b4793a0c8	ced54a70-b7cf-46b0-ae82-17637defcb28	01fc43af-3a93-43c3-b5ce-9e80709203d2	5c61bcde-f9b7-4814-870e-5a97a1608366	CANCELLED	\N	\N	\N	2026-10-05 18:20:50.910547+00	2026-10-05 18:20:50.910547+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
2cff313e-6d5d-4ba7-832a-eaca4a0d2376	ced54a70-b7cf-46b0-ae82-17637defcb28	01fc43af-3a93-43c3-b5ce-9e80709203d2	3fa6bde9-7be0-47de-8985-f586a34ddfc3	CANCELLED	\N	\N	\N	2026-10-05 18:20:50.906888+00	2026-10-05 18:20:50.906888+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
e8c7497a-2ef7-475e-bc51-f9b164046968	8172811f-4aea-48d8-aa7b-f1fc494f8d0a	01fc43af-3a93-43c3-b5ce-9e80709203d2	89fd4865-59be-43e9-9954-58d6cbeee152	CANCELLED	\N	\N	\N	2026-10-05 18:15:26.562772+00	2026-10-05 18:15:26.562772+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
a8271de7-6a48-4bb1-be83-4a650cd4984a	5e8299c7-75a8-4f32-b86e-b5a2f2356ca0	01fc43af-3a93-43c3-b5ce-9e80709203d2	89fd4865-59be-43e9-9954-58d6cbeee152	CANCELLED	\N	\N	\N	2026-10-05 18:21:18.312239+00	2026-10-05 18:21:18.312239+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
fbe0f607-7e74-4129-9f84-8dbfb92038b0	5e8299c7-75a8-4f32-b86e-b5a2f2356ca0	01fc43af-3a93-43c3-b5ce-9e80709203d2	df608a36-7471-4738-97c7-287e42b8ac46	SCHEDULED	\N	\N	\N	2026-10-05 18:21:18.301017+00	2026-10-05 18:21:18.301017+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
9e48a186-7a3d-4100-a385-c4152a4b1a70	0aa5fa7b-694c-41ff-97b4-9aafc9104d30	01fc43af-3a93-43c3-b5ce-9e80709203d2	377daec7-1a1d-4556-a439-7ff2fb4682ea	CANCELLED	\N	\N	\N	2026-10-05 18:20:19.896139+00	2026-10-05 18:20:19.896139+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
4fd4f9e4-9c46-4625-a38f-1bea129c58d4	d500d0c8-ff9e-4fdd-bdcb-b704f7d4d850	01fc43af-3a93-43c3-b5ce-9e80709203d2	b7253db9-2d50-4b59-935e-7811e491cebb	SCHEDULED	\N	\N	\N	2026-10-05 18:02:19.422003+00	2026-10-05 18:02:19.422003+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
88603cb5-094d-4152-98da-88f1d5cc2436	5e8299c7-75a8-4f32-b86e-b5a2f2356ca0	01fc43af-3a93-43c3-b5ce-9e80709203d2	3fa6bde9-7be0-47de-8985-f586a34ddfc3	SCHEDULED	\N	\N	\N	2026-10-05 18:21:18.308399+00	2026-10-05 18:21:18.308399+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
a2cb99f8-91cb-4626-98bd-9da79a5e92da	821c6cc9-1801-45f5-ad27-6d2851e68edc	01fc43af-3a93-43c3-b5ce-9e80709203d2	8a91239b-3ebe-4f49-a78a-6aa67aa976f8	SCHEDULED	\N	\N	\N	2026-10-05 18:22:42.303541+00	2026-10-05 18:22:42.303541+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
052461c3-4c10-455e-9b57-919f34eaac90	a8d47931-f3a7-416e-8490-a9dfdbd18b11	01fc43af-3a93-43c3-b5ce-9e80709203d2	b7253db9-2d50-4b59-935e-7811e491cebb	SCHEDULED	\N	\N	\N	2026-10-05 18:22:53.381618+00	2026-10-05 18:22:53.381618+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
33d35e37-f83f-44d4-b7f1-fef2321404b9	a8d47931-f3a7-416e-8490-a9dfdbd18b11	01fc43af-3a93-43c3-b5ce-9e80709203d2	3fa6bde9-7be0-47de-8985-f586a34ddfc3	SCHEDULED	\N	\N	\N	2026-10-05 18:22:53.386282+00	2026-10-05 18:22:53.386282+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
095b5444-58f8-4fde-9901-d9f775c06cc6	a092ae74-b05b-449e-807a-402df6dae43a	01fc43af-3a93-43c3-b5ce-9e80709203d2	d27865b7-a166-45a3-96db-bdd966a64bae	SCHEDULED	\N	\N	\N	2026-10-05 18:23:04.744994+00	2026-10-05 18:23:04.744994+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
9a93211f-2cde-425f-9f24-91562a495774	a092ae74-b05b-449e-807a-402df6dae43a	01fc43af-3a93-43c3-b5ce-9e80709203d2	5dbf7330-ae15-47db-b058-ecdb5154d34c	SCHEDULED	\N	\N	\N	2026-10-05 18:23:04.759647+00	2026-10-05 18:23:04.759647+00	878fca34-6d9e-4f93-9d86-45409de1485f	\N	\N
bc3f46de-32d5-4eca-8cd3-eb7f4c8e43e2	a092ae74-b05b-449e-807a-402df6dae43a	01fc43af-3a93-43c3-b5ce-9e80709203d2	a2893954-9afa-4e60-a470-c6cdf9681707	SCHEDULED	\N	\N	\N	2026-10-05 18:23:04.763552+00	2026-10-05 18:23:04.763552+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
2d564e49-62b6-46f3-8665-6c10524e1341	a092ae74-b05b-449e-807a-402df6dae43a	01fc43af-3a93-43c3-b5ce-9e80709203d2	2b06255a-b6ce-4047-b711-2b0e2e56c0aa	SCHEDULED	\N	\N	\N	2026-10-05 18:23:04.767593+00	2026-10-05 18:23:04.767593+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
3fc68212-666a-4482-91e1-bbf56936b34f	a092ae74-b05b-449e-807a-402df6dae43a	01fc43af-3a93-43c3-b5ce-9e80709203d2	93911583-0881-45e3-840f-258f5c99691a	SCHEDULED	\N	\N	\N	2026-10-05 18:23:04.771485+00	2026-10-05 18:23:04.771485+00	f8bb86df-4f84-4db0-9618-902734d8a5ef	\N	\N
7737492c-46fc-45b1-b0c2-49ba30a1b689	fe34dcf0-b5df-4995-bebb-a56675400e1c	01fc43af-3a93-43c3-b5ce-9e80709203d2	bf0b4109-e5e9-40f7-bcc8-105f6020df98	SCHEDULED	\N	\N	\N	2026-10-05 19:31:13.261977+00	2026-10-05 19:31:13.261977+00	878fca34-6d9e-4f93-9d86-45409de1485f	\N	\N
6c8ecfce-043e-42eb-a827-aaf254cc1f61	fe34dcf0-b5df-4995-bebb-a56675400e1c	01fc43af-3a93-43c3-b5ce-9e80709203d2	93911583-0881-45e3-840f-258f5c99691a	SCHEDULED	\N	\N	\N	2026-10-05 19:31:13.270094+00	2026-10-05 19:31:13.270094+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
557ce5c3-6465-4070-acb1-d9ba5955824a	fe34dcf0-b5df-4995-bebb-a56675400e1c	01fc43af-3a93-43c3-b5ce-9e80709203d2	ed1bfca4-06ee-4281-911f-15220b812968	SCHEDULED	\N	\N	\N	2026-10-05 19:31:13.274022+00	2026-10-05 19:31:13.274022+00	f8bb86df-4f84-4db0-9618-902734d8a5ef	\N	\N
aa964b61-e30d-4011-b008-c107724ac7b0	5e8299c7-75a8-4f32-b86e-b5a2f2356ca0	01fc43af-3a93-43c3-b5ce-9e80709203d2	bf0b4109-e5e9-40f7-bcc8-105f6020df98	CANCELLED	\N	\N	\N	2026-10-05 18:21:18.304405+00	2026-10-05 19:35:30.648579+00	878fca34-6d9e-4f93-9d86-45409de1485f	Troca pelo líder	\N
00d59276-7780-439e-b7d9-967d8acfd99e	5e8299c7-75a8-4f32-b86e-b5a2f2356ca0	01fc43af-3a93-43c3-b5ce-9e80709203d2	d27865b7-a166-45a3-96db-bdd966a64bae	SCHEDULED	\N	\N	\N	2026-10-05 19:35:30.68114+00	2026-10-05 19:35:30.68114+00	878fca34-6d9e-4f93-9d86-45409de1485f	\N	\N
154ee0d8-2d7e-4f22-8b45-b24ba90365b3	0aa5fa7b-694c-41ff-97b4-9aafc9104d30	01fc43af-3a93-43c3-b5ce-9e80709203d2	93911583-0881-45e3-840f-258f5c99691a	CANCELLED	\N	\N	\N	2026-10-05 18:20:19.904149+00	2026-10-05 18:20:19.904149+00	f8bb86df-4f84-4db0-9618-902734d8a5ef	\N	\N
b95e94c7-956c-4f85-8e32-fdea36830111	c0e21f5f-1bad-4e27-8760-456391b10075	01fc43af-3a93-43c3-b5ce-9e80709203d2	eac5429d-bb26-49cf-925a-46101b4ebe5d	CANCELLED	\N	\N	\N	2026-10-05 18:22:02.142714+00	2026-10-05 18:22:02.142714+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
757296b2-bc22-4382-8183-8c61da269675	821c6cc9-1801-45f5-ad27-6d2851e68edc	01fc43af-3a93-43c3-b5ce-9e80709203d2	eac5429d-bb26-49cf-925a-46101b4ebe5d	CANCELLED	\N	\N	\N	2026-10-05 18:22:42.319501+00	2026-10-05 18:22:42.319501+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
b1466321-ef0a-461a-90e8-ca97da6331c3	e221c553-746c-4867-8ad7-59151940d4bf	01fc43af-3a93-43c3-b5ce-9e80709203d2	93911583-0881-45e3-840f-258f5c99691a	SCHEDULED	\N	\N	\N	2026-10-05 19:45:55.488637+00	2026-10-05 19:45:55.488637+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
cc5cdf4a-e14c-4549-93c6-7a2664718103	0aa5fa7b-694c-41ff-97b4-9aafc9104d30	01fc43af-3a93-43c3-b5ce-9e80709203d2	eac5429d-bb26-49cf-925a-46101b4ebe5d	SCHEDULED	\N	\N	\N	2026-10-05 19:45:55.488637+00	2026-10-05 19:45:55.488637+00	f8bb86df-4f84-4db0-9618-902734d8a5ef	\N	\N
5775a019-0f88-4ca3-a0fb-332c30b8e728	c0e21f5f-1bad-4e27-8760-456391b10075	01fc43af-3a93-43c3-b5ce-9e80709203d2	93911583-0881-45e3-840f-258f5c99691a	SCHEDULED	\N	\N	\N	2026-10-05 19:45:55.488637+00	2026-10-05 19:45:55.488637+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
b460982c-d6d1-48ae-bedf-8870ea5e56a6	821c6cc9-1801-45f5-ad27-6d2851e68edc	01fc43af-3a93-43c3-b5ce-9e80709203d2	93911583-0881-45e3-840f-258f5c99691a	SCHEDULED	\N	\N	\N	2026-10-05 19:45:55.488637+00	2026-10-05 19:45:55.488637+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
b7327d0b-8d32-460a-b9ac-1b0cde1b7651	76bd778c-46b6-4a1b-83fc-578dcb923e38	01fc43af-3a93-43c3-b5ce-9e80709203d2	5c61bcde-f9b7-4814-870e-5a97a1608366	CANCELLED	\N	\N	\N	2026-10-05 18:22:19.715601+00	2026-10-05 18:22:19.715601+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
23612a31-b115-45dc-9adb-dc738729090d	c0e21f5f-1bad-4e27-8760-456391b10075	01fc43af-3a93-43c3-b5ce-9e80709203d2	3fa6bde9-7be0-47de-8985-f586a34ddfc3	CANCELLED	\N	\N	\N	2026-10-05 20:08:16.476095+00	2026-10-05 20:08:16.476095+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
26a19b5a-aaef-422c-aa20-a9f39c7ab4eb	9b6f96a7-ae6d-46c0-82c0-f4fed6eea912	01fc43af-3a93-43c3-b5ce-9e80709203d2	3fa6bde9-7be0-47de-8985-f586a34ddfc3	CANCELLED	\N	\N	\N	2026-10-05 18:22:30.478376+00	2026-10-05 18:22:30.478376+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
c644f7cb-256c-48c9-9a87-f2e1e80138f3	d500d0c8-ff9e-4fdd-bdcb-b704f7d4d850	01fc43af-3a93-43c3-b5ce-9e80709203d2	2b06255a-b6ce-4047-b711-2b0e2e56c0aa	SCHEDULED	\N	\N	\N	2026-10-05 21:14:31.781749+00	2026-10-05 21:14:31.781749+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
20928065-3fa5-429a-a0ed-689c122f0e8f	ced54a70-b7cf-46b0-ae82-17637defcb28	01fc43af-3a93-43c3-b5ce-9e80709203d2	2b06255a-b6ce-4047-b711-2b0e2e56c0aa	SCHEDULED	\N	\N	\N	2026-10-05 21:14:31.781749+00	2026-10-05 21:14:31.781749+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
92b7cb3f-0e80-4ce4-a946-cdf19b0cf58c	ced54a70-b7cf-46b0-ae82-17637defcb28	01fc43af-3a93-43c3-b5ce-9e80709203d2	a2893954-9afa-4e60-a470-c6cdf9681707	SCHEDULED	\N	\N	\N	2026-10-05 21:14:31.781749+00	2026-10-05 21:14:31.781749+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
39797587-297c-451d-a8a9-97771c67e95b	76bd778c-46b6-4a1b-83fc-578dcb923e38	01fc43af-3a93-43c3-b5ce-9e80709203d2	3fa6bde9-7be0-47de-8985-f586a34ddfc3	SCHEDULED	\N	\N	\N	2026-10-05 21:14:31.781749+00	2026-10-05 21:14:31.781749+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
e5fac5ca-be89-490e-9c56-c978ffdb56e0	9b6f96a7-ae6d-46c0-82c0-f4fed6eea912	01fc43af-3a93-43c3-b5ce-9e80709203d2	2b06255a-b6ce-4047-b711-2b0e2e56c0aa	SCHEDULED	\N	\N	\N	2026-10-05 21:14:31.781749+00	2026-10-05 21:14:31.781749+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
a7b2a7ac-0b3c-46c4-a2ab-aee7d450e98a	9b6f96a7-ae6d-46c0-82c0-f4fed6eea912	01fc43af-3a93-43c3-b5ce-9e80709203d2	377daec7-1a1d-4556-a439-7ff2fb4682ea	SCHEDULED	\N	\N	\N	2026-10-05 18:22:30.462773+00	2026-10-05 18:22:30.462773+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
92c131cb-fa2a-4346-b3ee-860f56d69a06	5d3c0b1c-442c-49a3-87d2-325db7a67bcb	01fc43af-3a93-43c3-b5ce-9e80709203d2	df608a36-7471-4738-97c7-287e42b8ac46	SCHEDULED	\N	\N	\N	2026-10-05 22:19:48.252142+00	2026-10-05 22:19:48.252142+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
e350d517-bca8-4ca5-bfde-7b41476e04e1	9b6f96a7-ae6d-46c0-82c0-f4fed6eea912	01fc43af-3a93-43c3-b5ce-9e80709203d2	89fd4865-59be-43e9-9954-58d6cbeee152	CANCELLED	\N	\N	\N	2026-10-05 18:22:30.482253+00	2026-10-05 18:22:30.482253+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
756745cb-a1f5-40ad-8326-d853fd7915b3	8172811f-4aea-48d8-aa7b-f1fc494f8d0a	01fc43af-3a93-43c3-b5ce-9e80709203d2	93911583-0881-45e3-840f-258f5c99691a	SCHEDULED	\N	\N	\N	2026-10-05 21:32:44.911787+00	2026-10-05 21:32:44.911787+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
1e1913e0-3dbc-4d86-a3c1-95ce368dae13	5e8299c7-75a8-4f32-b86e-b5a2f2356ca0	01fc43af-3a93-43c3-b5ce-9e80709203d2	a2893954-9afa-4e60-a470-c6cdf9681707	SCHEDULED	\N	\N	\N	2026-10-05 21:32:44.921975+00	2026-10-05 21:32:44.921975+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
7d03d7af-e2d3-4153-ba40-c369ab90c879	9b6f96a7-ae6d-46c0-82c0-f4fed6eea912	01fc43af-3a93-43c3-b5ce-9e80709203d2	a2893954-9afa-4e60-a470-c6cdf9681707	SCHEDULED	\N	\N	\N	2026-10-05 21:32:44.925952+00	2026-10-05 21:32:44.925952+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
26cf8393-7f9a-42a1-a66b-b2524efd2369	fe34dcf0-b5df-4995-bebb-a56675400e1c	01fc43af-3a93-43c3-b5ce-9e80709203d2	df608a36-7471-4738-97c7-287e42b8ac46	SCHEDULED	\N	\N	\N	2026-10-05 19:31:13.256119+00	2026-10-05 19:31:13.256119+00	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	\N	\N
6fdedc40-0ff2-4b76-94a7-da4010a7dcef	fe34dcf0-b5df-4995-bebb-a56675400e1c	01fc43af-3a93-43c3-b5ce-9e80709203d2	377daec7-1a1d-4556-a439-7ff2fb4682ea	CANCELLED	\N	\N	\N	2026-10-05 19:31:13.266039+00	2026-10-05 19:31:13.266039+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
74355eba-a068-49a2-b6b3-f03d7c769c30	c0e21f5f-1bad-4e27-8760-456391b10075	01fc43af-3a93-43c3-b5ce-9e80709203d2	377daec7-1a1d-4556-a439-7ff2fb4682ea	CANCELLED	\N	\N	\N	2026-10-05 21:14:31.781749+00	2026-10-05 21:14:31.781749+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
d815c342-5b1b-4c6d-aa0d-723bba708519	0aa5fa7b-694c-41ff-97b4-9aafc9104d30	01fc43af-3a93-43c3-b5ce-9e80709203d2	2b06255a-b6ce-4047-b711-2b0e2e56c0aa	SCHEDULED	\N	\N	\N	2026-10-05 22:03:28.135099+00	2026-10-05 22:03:28.135099+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
16dacf16-a67d-4358-b2cb-9ada45536bcd	c0e21f5f-1bad-4e27-8760-456391b10075	01fc43af-3a93-43c3-b5ce-9e80709203d2	2b06255a-b6ce-4047-b711-2b0e2e56c0aa	SCHEDULED	\N	\N	\N	2026-10-05 22:03:28.135099+00	2026-10-05 22:03:28.135099+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
826d40de-d5ee-4b75-8a14-d317721fefeb	fe34dcf0-b5df-4995-bebb-a56675400e1c	01fc43af-3a93-43c3-b5ce-9e80709203d2	3fa6bde9-7be0-47de-8985-f586a34ddfc3	SCHEDULED	\N	\N	\N	2026-10-05 22:03:28.135099+00	2026-10-05 22:03:28.135099+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
64de37ae-f37d-460a-8bf7-11587a2e50a9	5d3c0b1c-442c-49a3-87d2-325db7a67bcb	01fc43af-3a93-43c3-b5ce-9e80709203d2	bf0b4109-e5e9-40f7-bcc8-105f6020df98	SCHEDULED	\N	\N	\N	2026-10-05 22:19:48.259251+00	2026-10-05 22:19:48.259251+00	878fca34-6d9e-4f93-9d86-45409de1485f	\N	\N
591f17ff-65d6-4235-9f4f-fcc6f666030b	5d3c0b1c-442c-49a3-87d2-325db7a67bcb	01fc43af-3a93-43c3-b5ce-9e80709203d2	3fa6bde9-7be0-47de-8985-f586a34ddfc3	SCHEDULED	\N	\N	\N	2026-10-05 22:19:48.264975+00	2026-10-05 22:19:48.264975+00	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	\N	\N
25313118-345b-441a-8faa-07ee540ee670	5d3c0b1c-442c-49a3-87d2-325db7a67bcb	01fc43af-3a93-43c3-b5ce-9e80709203d2	89fd4865-59be-43e9-9954-58d6cbeee152	SCHEDULED	\N	\N	\N	2026-10-05 22:19:48.269093+00	2026-10-05 22:19:48.269093+00	f8bb86df-4f84-4db0-9618-902734d8a5ef	\N	\N
69c2ea86-1244-4f93-9be9-53dd466a5a12	5d3c0b1c-442c-49a3-87d2-325db7a67bcb	01fc43af-3a93-43c3-b5ce-9e80709203d2	a2893954-9afa-4e60-a470-c6cdf9681707	SCHEDULED	\N	\N	\N	2026-10-05 22:19:48.273164+00	2026-10-05 22:19:48.273164+00	761063f7-cdfd-4b02-b19a-fe65d841737b	\N	\N
\.


--
-- Data for Name: team_member_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.team_member_roles (id, "teamMemberId", "teamRoleId", "isPrimary", "createdAt") FROM stdin;
5a969ebf-9e35-4dc4-b69c-926a68e050db	233571ac-353a-4b9f-9567-945798d42128	878fca34-6d9e-4f93-9d86-45409de1485f	t	2026-10-05 03:49:07.502313+00
cd068115-5b70-47be-8f65-169d39ab7b35	d3fe5bbe-8953-4d16-ab1d-66f7de9e0927	878fca34-6d9e-4f93-9d86-45409de1485f	t	2026-10-05 03:49:07.502313+00
50bdf577-90f8-4fe2-9bd9-22982d7a4c41	d3fe5bbe-8953-4d16-ab1d-66f7de9e0927	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	f	2026-10-05 03:49:07.502313+00
a85d594c-3e67-45e3-bce7-c31a89f84aa9	db60ac41-27c7-4063-a072-8211988cc269	f8bb86df-4f84-4db0-9618-902734d8a5ef	t	2026-10-05 03:49:07.502313+00
9db85651-81bd-48cf-9daf-78898f8520a6	bce09b8e-73ae-49ff-b44c-04ac06de4aa0	f8bb86df-4f84-4db0-9618-902734d8a5ef	t	2026-10-05 03:49:07.502313+00
477caa1e-36f2-4678-ab9d-005c3c63292f	1f52f1e0-ec26-460e-846f-1059123b382e	f8bb86df-4f84-4db0-9618-902734d8a5ef	t	2026-10-05 03:49:07.502313+00
0b07fd88-1da0-4d67-94a8-2bf5aa86dd50	67b4da8e-98a3-4b39-a125-6dba38d97694	761063f7-cdfd-4b02-b19a-fe65d841737b	f	2026-10-05 03:49:07.502313+00
f9ca0fa1-09e0-4bc5-ab39-a190c64cdb61	9c0e7b7e-ce02-438b-aaa9-11f76ae867c1	761063f7-cdfd-4b02-b19a-fe65d841737b	t	2026-10-05 03:49:07.502313+00
694f5aa6-a3a5-4e9d-85c1-507cd35b5c58	9c0e7b7e-ce02-438b-aaa9-11f76ae867c1	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	f	2026-10-05 03:49:07.502313+00
ed65e190-b4f4-4916-b81f-4c54bb1d15d3	d0a235d7-8a55-4a41-ad3b-9c2f37de2cc7	761063f7-cdfd-4b02-b19a-fe65d841737b	t	2026-10-05 03:49:07.502313+00
55cc195e-5f86-4511-9dba-5f1023bc4e29	d0a235d7-8a55-4a41-ad3b-9c2f37de2cc7	b32eff48-12d2-48d2-bb90-2aa1092cfc2d	f	2026-10-05 03:49:07.502313+00
dd2e65d6-716d-4622-bef9-f79dee6e3811	70c69e26-b5aa-4acb-856f-300a4e065dd0	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	f	2026-10-05 03:49:07.502313+00
16828804-17a0-4bac-9163-06e0146b3a92	85d27b67-423d-4fd8-9f94-14434a8ec8b2	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	t	2026-10-05 03:49:07.502313+00
30e1b541-ad65-48ce-a7d4-bd0e9aa379ee	dd6ad525-9a90-4d3f-b40e-f40b59b18acb	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	t	2026-10-05 03:49:07.502313+00
b448e2cb-1060-4289-88fc-d583834e3490	0f65069f-2bd8-4a47-b7a6-3b1c74b29594	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	t	2026-10-05 03:49:07.502313+00
3687f941-fbd5-4c83-aa26-f8d1dc129f01	53338694-5e7f-4a35-925a-63db1d9f8cd5	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	t	2026-10-05 03:49:07.502313+00
17f3ce24-5377-499c-b85e-b5ceed251335	56d4e758-56e6-44a0-8ff8-fe88def8ff50	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	t	2026-10-05 03:49:07.502313+00
156dd487-a42a-4f48-afa9-8398421c5b07	56a19445-4a1e-493a-8cdc-511f6708dec7	878fca34-6d9e-4f93-9d86-45409de1485f	f	2026-10-05 18:12:54.117941+00
bfa0fd27-7aef-4637-adda-105c1d2950b1	85d27b67-423d-4fd8-9f94-14434a8ec8b2	878fca34-6d9e-4f93-9d86-45409de1485f	f	2026-10-05 18:36:25.51551+00
485db6f3-69f4-4761-b8c6-86d5f04ba5c3	233571ac-353a-4b9f-9567-945798d42128	ad823934-6a03-4ba4-95cb-9e1ccf0bd506	f	2026-10-05 18:36:37.637033+00
caeaac85-b77e-452f-81da-ae12bd0e6ae9	c74415fd-490a-4f41-a0a3-71688a657952	761063f7-cdfd-4b02-b19a-fe65d841737b	f	2026-10-05 18:36:57.100841+00
\.


--
-- Data for Name: team_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.team_members (id, "teamId", "memberId", role, "startedAt", "endedAt", "isLeader", "createdAt", "updatedAt") FROM stdin;
233571ac-353a-4b9f-9567-945798d42128	01fc43af-3a93-43c3-b5ce-9e80709203d2	5dbf7330-ae15-47db-b058-ecdb5154d34c	\N	2026-10-05	\N	t	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
d3fe5bbe-8953-4d16-ab1d-66f7de9e0927	01fc43af-3a93-43c3-b5ce-9e80709203d2	d27865b7-a166-45a3-96db-bdd966a64bae	\N	2026-10-05	\N	f	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
db60ac41-27c7-4063-a072-8211988cc269	01fc43af-3a93-43c3-b5ce-9e80709203d2	89fd4865-59be-43e9-9954-58d6cbeee152	\N	2026-10-05	\N	f	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
c74415fd-490a-4f41-a0a3-71688a657952	01fc43af-3a93-43c3-b5ce-9e80709203d2	93911583-0881-45e3-840f-258f5c99691a	\N	2026-10-05	\N	f	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
bce09b8e-73ae-49ff-b44c-04ac06de4aa0	01fc43af-3a93-43c3-b5ce-9e80709203d2	ed1bfca4-06ee-4281-911f-15220b812968	\N	2026-10-05	\N	f	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
1f52f1e0-ec26-460e-846f-1059123b382e	01fc43af-3a93-43c3-b5ce-9e80709203d2	eac5429d-bb26-49cf-925a-46101b4ebe5d	\N	2026-10-05	\N	f	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
67b4da8e-98a3-4b39-a125-6dba38d97694	01fc43af-3a93-43c3-b5ce-9e80709203d2	a2893954-9afa-4e60-a470-c6cdf9681707	\N	2026-10-05	\N	f	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
9c0e7b7e-ce02-438b-aaa9-11f76ae867c1	01fc43af-3a93-43c3-b5ce-9e80709203d2	2b06255a-b6ce-4047-b711-2b0e2e56c0aa	\N	2026-10-05	\N	f	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
d0a235d7-8a55-4a41-ad3b-9c2f37de2cc7	01fc43af-3a93-43c3-b5ce-9e80709203d2	3fa6bde9-7be0-47de-8985-f586a34ddfc3	\N	2026-10-05	\N	f	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
70c69e26-b5aa-4acb-856f-300a4e065dd0	01fc43af-3a93-43c3-b5ce-9e80709203d2	377daec7-1a1d-4556-a439-7ff2fb4682ea	\N	2026-10-05	\N	f	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
85d27b67-423d-4fd8-9f94-14434a8ec8b2	01fc43af-3a93-43c3-b5ce-9e80709203d2	0c265ee3-396c-45cc-af03-1d98dc11abd7	\N	2026-10-05	\N	f	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
dd6ad525-9a90-4d3f-b40e-f40b59b18acb	01fc43af-3a93-43c3-b5ce-9e80709203d2	b7253db9-2d50-4b59-935e-7811e491cebb	\N	2026-10-05	\N	f	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
0f65069f-2bd8-4a47-b7a6-3b1c74b29594	01fc43af-3a93-43c3-b5ce-9e80709203d2	8a91239b-3ebe-4f49-a78a-6aa67aa976f8	\N	2026-10-05	\N	f	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
53338694-5e7f-4a35-925a-63db1d9f8cd5	01fc43af-3a93-43c3-b5ce-9e80709203d2	b2566d2c-6a16-4f5e-b893-7762be3eae1e	\N	2026-10-05	\N	f	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
56d4e758-56e6-44a0-8ff8-fe88def8ff50	01fc43af-3a93-43c3-b5ce-9e80709203d2	df608a36-7471-4738-97c7-287e42b8ac46	\N	2026-10-05	\N	f	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
56a19445-4a1e-493a-8cdc-511f6708dec7	01fc43af-3a93-43c3-b5ce-9e80709203d2	bf0b4109-e5e9-40f7-bcc8-105f6020df98	\N	2026-10-05	\N	f	2026-10-05 18:12:54.117941+00	2026-10-05 18:12:54.117941+00
\.


--
-- Data for Name: team_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.team_roles (id, "teamId", name, slug, color, "defaultSlots", active, "createdAt", "updatedAt") FROM stdin;
878fca34-6d9e-4f93-9d86-45409de1485f	01fc43af-3a93-43c3-b5ce-9e80709203d2	Fotógrafo	fotografo	#3B82F6	1	t	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
761063f7-cdfd-4b02-b19a-fe65d841737b	01fc43af-3a93-43c3-b5ce-9e80709203d2	Storys	storys	#F59E0B	1	t	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
b32eff48-12d2-48d2-bb90-2aa1092cfc2d	01fc43af-3a93-43c3-b5ce-9e80709203d2	Live	live	#10B981	1	t	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
ad823934-6a03-4ba4-95cb-9e1ccf0bd506	01fc43af-3a93-43c3-b5ce-9e80709203d2	Data Show	data-show	#8B5CF6	1	t	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
f8bb86df-4f84-4db0-9618-902734d8a5ef	01fc43af-3a93-43c3-b5ce-9e80709203d2	Reels	videomaker	#EF4444	1	t	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.teams (id, "churchId", name, slug, description, color, active, "createdAt", "updatedAt") FROM stdin;
01fc43af-3a93-43c3-b5ce-9e80709203d2	20202020-2020-4020-8020-202020202020	ATOS AO PAI	atos-ao-pai	Equipe de Mídia	#6366F1	t	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, "passwordHash", name, phone, "avatarUrl", role, "churchId", active, "lastLoginAt", "createdAt", "updatedAt", "expoPushToken") FROM stdin;
4b2e541f-3d17-46ab-a62b-381d08eea069	andreza@igrejaescala.app	$2b$10$TjYsfUds3cSHfDbzGZg6v.XRNiiLKQjVaQmDnSEj76N6ISfnSCVlm	Andreza	\N	\N	MEMBER	20202020-2020-4020-8020-202020202020	t	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00	\N
a208255b-3f9b-418b-ba36-10b6605a223e	murilo@igrejaescala.app	$2b$10$TjYsfUds3cSHfDbzGZg6v.XRNiiLKQjVaQmDnSEj76N6ISfnSCVlm	Murilo	\N	\N	MEMBER	20202020-2020-4020-8020-202020202020	t	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00	\N
b1c7c1de-e69e-4edd-9436-5d6113383e11	juliocesar@igrejaescala.app	$2b$10$TjYsfUds3cSHfDbzGZg6v.XRNiiLKQjVaQmDnSEj76N6ISfnSCVlm	Julio Cesar	\N	\N	MEMBER	20202020-2020-4020-8020-202020202020	t	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00	\N
a6a2be06-6449-4bb6-ae5a-eea6469b0729	marialuiza@igrejaescala.app	$2b$10$TjYsfUds3cSHfDbzGZg6v.XRNiiLKQjVaQmDnSEj76N6ISfnSCVlm	Maria Luiza	\N	\N	MEMBER	20202020-2020-4020-8020-202020202020	t	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00	\N
89bae816-fc08-4699-b8fe-80e2d366fe8b	arthur@igrejaescala.app	$2b$10$TjYsfUds3cSHfDbzGZg6v.XRNiiLKQjVaQmDnSEj76N6ISfnSCVlm	Arthur	\N	\N	MEMBER	20202020-2020-4020-8020-202020202020	t	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00	\N
7b3fcfc0-ffeb-4364-945f-791d90306e94	joabe@igrejaescala.app	$2b$10$TjYsfUds3cSHfDbzGZg6v.XRNiiLKQjVaQmDnSEj76N6ISfnSCVlm	Joabe	\N	\N	MEMBER	20202020-2020-4020-8020-202020202020	t	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00	\N
62293d0e-3fe0-4e22-9590-ed4b2d0475f1	sarah@igrejaescala.app	$2b$10$TjYsfUds3cSHfDbzGZg6v.XRNiiLKQjVaQmDnSEj76N6ISfnSCVlm	Sarah	\N	\N	MEMBER	20202020-2020-4020-8020-202020202020	t	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00	\N
05d0a165-f40d-4bc9-b928-b698cca1d8d0	marialuizam@igrejaescala.app	$2b$10$TjYsfUds3cSHfDbzGZg6v.XRNiiLKQjVaQmDnSEj76N6ISfnSCVlm	Maria Luiza M.	\N	\N	MEMBER	20202020-2020-4020-8020-202020202020	t	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00	\N
b95cfd1c-479d-495e-9dd5-9fe5e024a567	kalita@igrejaescala.app	$2b$10$TjYsfUds3cSHfDbzGZg6v.XRNiiLKQjVaQmDnSEj76N6ISfnSCVlm	Kalita	\N	\N	MEMBER	20202020-2020-4020-8020-202020202020	t	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00	\N
3c294d36-1f45-4b41-97d1-2ba35af9a982	anarafaela@igrejaescala.app	$2b$10$TjYsfUds3cSHfDbzGZg6v.XRNiiLKQjVaQmDnSEj76N6ISfnSCVlm	Ana Rafaela	\N	\N	MEMBER	20202020-2020-4020-8020-202020202020	t	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00	\N
842fba3e-730f-4119-8519-8eba7bf28c39	isaac@igreja.local	$2b$10$placeholder	Isaac	\N	\N	MEMBER	20202020-2020-4020-8020-202020202020	t	\N	2026-10-05 18:12:54.117941+00	2026-10-05 18:12:54.117941+00	\N
5c365b12-4dba-47b1-8c27-57edd57e347d	melina@igrejaescala.app	$2b$10$TjYsfUds3cSHfDbzGZg6v.XRNiiLKQjVaQmDnSEj76N6ISfnSCVlm	Melina	\N	\N	MEMBER	20202020-2020-4020-8020-202020202020	t	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00	\N
8d4694e5-85b1-4859-8d69-ca057f06472e	victorgabriel@igrejaescala.app	$2b$10$TjYsfUds3cSHfDbzGZg6v.XRNiiLKQjVaQmDnSEj76N6ISfnSCVlm	Victor Gabriel	\N	\N	MEMBER	20202020-2020-4020-8020-202020202020	t	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00	\N
51521a8f-04b3-4aa5-a66e-9c183d631554	roberthy@igrejaescala.app	$2b$10$TjYsfUds3cSHfDbzGZg6v.XRNiiLKQjVaQmDnSEj76N6ISfnSCVlm	Roberthy	\N	\N	MEMBER	20202020-2020-4020-8020-202020202020	t	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00	\N
eee4656b-fa91-4752-a2a5-4e3ebdd535e6	debora@igrejaescala.app	$2b$10$TjYsfUds3cSHfDbzGZg6v.XRNiiLKQjVaQmDnSEj76N6ISfnSCVlm	Debora	\N	\N	MEMBER	20202020-2020-4020-8020-202020202020	t	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00	\N
6a3c317a-dfa6-4d55-92d2-0e920e9ed791	kaua@igrejaescala.app	$2b$10$TjYsfUds3cSHfDbzGZg6v.XRNiiLKQjVaQmDnSEj76N6ISfnSCVlm	Kauã	\N	\N	MEMBER	20202020-2020-4020-8020-202020202020	t	\N	2026-10-05 03:49:07.502313+00	2026-10-05 03:49:07.502313+00	\N
f9da3a79-3800-46cb-9552-7393cf9222b0	victor@gmail.com	$2b$10$qpNZH6oajwiB1Nvtdlzr0O1RuppqMHBcp1goh5h/HovH5Bn4C9uLa	victor	\N	\N	CHURCH_ADMIN	20202020-2020-4020-8020-202020202020	t	2026-10-07 23:16:28.497+00	2026-10-03 19:36:39.50332+00	2026-10-07 23:16:28.420769+00	ExponentPushToken[2nmPCiAvTZ8Fc8b_1T3ja8]
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.migrations_id_seq', 8, true);


--
-- Name: event_teams PK_02a00c33f9aedce303aabb6ba16; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_teams
    ADD CONSTRAINT "PK_02a00c33f9aedce303aabb6ba16" PRIMARY KEY (id);


--
-- Name: availability PK_05a8158cf1112294b1c86e7f1d3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability
    ADD CONSTRAINT "PK_05a8158cf1112294b1c86e7f1d3" PRIMARY KEY (id);


--
-- Name: members PK_28b53062261b996d9c99fa12404; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "PK_28b53062261b996d9c99fa12404" PRIMARY KEY (id);


--
-- Name: events PK_40731c7151fe4be3116e45ddf73; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY (id);


--
-- Name: team_member_roles PK_461750fce168300cdcd6bfac0a4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_member_roles
    ADD CONSTRAINT "PK_461750fce168300cdcd6bfac0a4" PRIMARY KEY (id);


--
-- Name: team_roles PK_4d682873a391d93b0e5fe2f082f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_roles
    ADD CONSTRAINT "PK_4d682873a391d93b0e5fe2f082f" PRIMARY KEY (id);


--
-- Name: invitations PK_5dec98cfdfd562e4ad3648bbb07; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT "PK_5dec98cfdfd562e4ad3648bbb07" PRIMARY KEY (id);


--
-- Name: churches PK_6048a6f37c897751d61cbb0347a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.churches
    ADD CONSTRAINT "PK_6048a6f37c897751d61cbb0347a" PRIMARY KEY (id);


--
-- Name: notifications PK_6a72c3c0f683f6462415e653c3a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id);


--
-- Name: refresh_tokens PK_7d8bee0204106019488c4c50ffa; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY (id);


--
-- Name: schedules PK_7e33fc2ea755a5765e3564e66dd; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT "PK_7e33fc2ea755a5765e3564e66dd" PRIMARY KEY (id);


--
-- Name: teams PK_7e5523774a38b08a6236d322403; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT "PK_7e5523774a38b08a6236d322403" PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: team_members PK_ca3eae89dcf20c9fd95bf7460aa; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT "PK_ca3eae89dcf20c9fd95bf7460aa" PRIMARY KEY (id);


--
-- Name: password_reset_tokens PK_d16bebd73e844c48bca50ff8d3d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY (id);


--
-- Name: member_weekday_availability PK_e6c03cd10296798a59a32b7fecd; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_weekday_availability
    ADD CONSTRAINT "PK_e6c03cd10296798a59a32b7fecd" PRIMARY KEY (id);


--
-- Name: schedule_swaps PK_ee7b517cf56604b742f49add003; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_swaps
    ADD CONSTRAINT "PK_ee7b517cf56604b742f49add003" PRIMARY KEY (id);


--
-- Name: team_member_roles UQ_26bae8661931dbea576075d71e5; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_member_roles
    ADD CONSTRAINT "UQ_26bae8661931dbea576075d71e5" UNIQUE ("teamMemberId", "teamRoleId");


--
-- Name: member_weekday_availability UQ_2e655b3c73e10f46611d7f8e4fa; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_weekday_availability
    ADD CONSTRAINT "UQ_2e655b3c73e10f46611d7f8e4fa" UNIQUE ("memberId", weekday);


--
-- Name: team_roles UQ_4f788b9fddebf810d26e790f047; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_roles
    ADD CONSTRAINT "UQ_4f788b9fddebf810d26e790f047" UNIQUE ("teamId", slug);


--
-- Name: event_teams UQ_62fc2ce6ff160203adabc6e8e64; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_teams
    ADD CONSTRAINT "UQ_62fc2ce6ff160203adabc6e8e64" UNIQUE ("eventId", "teamId");


--
-- Name: schedules UQ_7485a1bf53f6e883bfea3500edc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT "UQ_7485a1bf53f6e883bfea3500edc" UNIQUE ("eventId", "teamId", "memberId");


--
-- Name: churches UQ_7cf9653e300cedb022d70a7c1a6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.churches
    ADD CONSTRAINT "UQ_7cf9653e300cedb022d70a7c1a6" UNIQUE (slug);


--
-- Name: members UQ_839756572a2c38eb5a3b563126e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "UQ_839756572a2c38eb5a3b563126e" UNIQUE ("userId");


--
-- Name: team_members UQ_893ee5058641f987d58ed7a9869; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT "UQ_893ee5058641f987d58ed7a9869" UNIQUE ("teamId", "memberId");


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: members UQ_f05952a65232edc96f5f86b538e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "UQ_f05952a65232edc96f5f86b538e" UNIQUE (cpf);


--
-- Name: IDX_d6a19d4b4f6c62dcd29daa497e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d6a19d4b4f6c62dcd29daa497e" ON public.password_reset_tokens USING btree ("userId");


--
-- Name: IDX_dfcfae6af22931048ef7307841; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_dfcfae6af22931048ef7307841" ON public.invitations USING btree (code);


--
-- Name: schedules FK_040ac7fb9e0799a2f4c7d37e9a5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT "FK_040ac7fb9e0799a2f4c7d37e9a5" FOREIGN KEY ("eventId") REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: invitations FK_113cb1411bac0e764b922699d4b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT "FK_113cb1411bac0e764b922699d4b" FOREIGN KEY ("teamId") REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: schedules FK_1bad651634b9c5f4fe170726519; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT "FK_1bad651634b9c5f4fe170726519" FOREIGN KEY ("teamId") REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_member_roles FK_2b66fa10fc39d2c72503490a054; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_member_roles
    ADD CONSTRAINT "FK_2b66fa10fc39d2c72503490a054" FOREIGN KEY ("teamMemberId") REFERENCES public.team_members(id) ON DELETE CASCADE;


--
-- Name: schedule_swaps FK_2c938047e933f6160f36327ce3b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_swaps
    ADD CONSTRAINT "FK_2c938047e933f6160f36327ce3b" FOREIGN KEY ("acceptedByMemberId") REFERENCES public.members(id) ON DELETE SET NULL;


--
-- Name: events FK_2fb864f37ad210f4295a09b684d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT "FK_2fb864f37ad210f4295a09b684d" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: users FK_3ad405e3bd92680e4792ac50880; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_3ad405e3bd92680e4792ac50880" FOREIGN KEY ("churchId") REFERENCES public.churches(id) ON DELETE CASCADE;


--
-- Name: events FK_4f499e019fe4ee6771c25573936; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT "FK_4f499e019fe4ee6771c25573936" FOREIGN KEY ("churchId") REFERENCES public.churches(id) ON DELETE CASCADE;


--
-- Name: members FK_510f1afb45089ca2af12bbc4a19; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "FK_510f1afb45089ca2af12bbc4a19" FOREIGN KEY ("churchId") REFERENCES public.churches(id) ON DELETE CASCADE;


--
-- Name: schedules FK_5b6f4c0fbc0e8d47df0f66c6e1d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT "FK_5b6f4c0fbc0e8d47df0f66c6e1d" FOREIGN KEY ("confirmedById") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: refresh_tokens FK_610102b60fea1455310ccd299de; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: event_teams FK_6720f4049d3c12c78077998bb05; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_teams
    ADD CONSTRAINT "FK_6720f4049d3c12c78077998bb05" FOREIGN KEY ("eventId") REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: notifications FK_692a909ee0fa9383e7859f9b406; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_members FK_6d1c8c7f705803f0711336a5c33; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT "FK_6d1c8c7f705803f0711336a5c33" FOREIGN KEY ("teamId") REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members FK_6f1c89b33f1391d2ffd8d590671; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT "FK_6f1c89b33f1391d2ffd8d590671" FOREIGN KEY ("memberId") REFERENCES public.members(id) ON DELETE CASCADE;


--
-- Name: team_roles FK_6fcd658c29d67d82492e351294b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_roles
    ADD CONSTRAINT "FK_6fcd658c29d67d82492e351294b" FOREIGN KEY ("teamId") REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: member_weekday_availability FK_745b6920ba6b831778bc8e6b3f6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_weekday_availability
    ADD CONSTRAINT "FK_745b6920ba6b831778bc8e6b3f6" FOREIGN KEY ("memberId") REFERENCES public.members(id) ON DELETE CASCADE;


--
-- Name: schedule_swaps FK_7ff6ff98d7a1af46f4702735cf3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_swaps
    ADD CONSTRAINT "FK_7ff6ff98d7a1af46f4702735cf3" FOREIGN KEY ("requestedByMemberId") REFERENCES public.members(id) ON DELETE CASCADE;


--
-- Name: members FK_839756572a2c38eb5a3b563126e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "FK_839756572a2c38eb5a3b563126e" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: invitations FK_9604510d55382959ec04238b345; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT "FK_9604510d55382959ec04238b345" FOREIGN KEY ("churchId") REFERENCES public.churches(id) ON DELETE CASCADE;


--
-- Name: event_teams FK_9f378171710c23538b4804cf4ea; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_teams
    ADD CONSTRAINT "FK_9f378171710c23538b4804cf4ea" FOREIGN KEY ("teamId") REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: schedules FK_be2a3da0b6695a08ebfd6781512; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT "FK_be2a3da0b6695a08ebfd6781512" FOREIGN KEY ("memberId") REFERENCES public.members(id) ON DELETE CASCADE;


--
-- Name: teams FK_c83113ebd9f0ffc88050b8fd22f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT "FK_c83113ebd9f0ffc88050b8fd22f" FOREIGN KEY ("churchId") REFERENCES public.churches(id) ON DELETE CASCADE;


--
-- Name: schedule_swaps FK_d282f7fe303177d7f2855647181; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_swaps
    ADD CONSTRAINT "FK_d282f7fe303177d7f2855647181" FOREIGN KEY ("counterScheduleId") REFERENCES public.schedules(id) ON DELETE CASCADE;


--
-- Name: invitations FK_d5bc6e2af606d5aaaa4ef4e6be5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT "FK_d5bc6e2af606d5aaaa4ef4e6be5" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: password_reset_tokens FK_d6a19d4b4f6c62dcd29daa497e2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT "FK_d6a19d4b4f6c62dcd29daa497e2" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_member_roles FK_d6ec37f12b769fb18d123387582; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_member_roles
    ADD CONSTRAINT "FK_d6ec37f12b769fb18d123387582" FOREIGN KEY ("teamRoleId") REFERENCES public.team_roles(id) ON DELETE CASCADE;


--
-- Name: schedule_swaps FK_d9fb0716da1294330d94380523c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_swaps
    ADD CONSTRAINT "FK_d9fb0716da1294330d94380523c" FOREIGN KEY ("scheduleId") REFERENCES public.schedules(id) ON DELETE CASCADE;


--
-- Name: availability FK_ec30447737d240f0b5182d5c269; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability
    ADD CONSTRAINT "FK_ec30447737d240f0b5182d5c269" FOREIGN KEY ("memberId") REFERENCES public.members(id) ON DELETE CASCADE;


--
-- Name: notifications FK_f6a1b78687f3cec8aeb8fb36adb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_f6a1b78687f3cec8aeb8fb36adb" FOREIGN KEY ("relatedScheduleId") REFERENCES public.schedules(id) ON DELETE SET NULL;


--
-- Name: schedules FK_fc4d51f9f8a5bef9584e7096cd8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT "FK_fc4d51f9f8a5bef9584e7096cd8" FOREIGN KEY ("teamRoleId") REFERENCES public.team_roles(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict FySQziG8BwnUSgq7nvD6AdufZcPGAbkRLe3nFEkyvGPxeDf832YUXKZIsoncIgq

