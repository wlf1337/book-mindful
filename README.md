# PagePace - Reading Tracker Application

A comprehensive reading tracker application built with React, TypeScript, and Supabase. Track your reading sessions, set goals, take notes, and get AI-powered insights about your books.

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture Overview](#architecture-overview)
3. [Database Schema](#database-schema)
4. [Database Functions](#database-functions)
5. [Row-Level Security Policies](#row-level-security-policies)
6. [Frontend Routes](#frontend-routes)
7. [Key Components](#key-components)
8. [External APIs](#external-apis)
9. [Validation Schemas](#validation-schemas)
10. [PWA & Notifications](#pwa--notifications)
11. [Environment Variables](#environment-variables)
12. [Setup Instructions](#setup-instructions)
13. [Complete SQL Migration](#complete-sql-migration)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State Management | TanStack React Query |
| Routing | React Router DOM v6 |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Notifications | Web Notifications API |
| PWA | vite-plugin-pwa |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  Pages:                                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  Auth   │ │Dashboard│ │ Library │ │  Goals  │ │  Notes  │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │BookDetail│ │ Reading │ │  Admin  │ │Notific. │               │
│  │         │ │ Session │ │         │ │         │               │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
├─────────────────────────────────────────────────────────────────┤
│  Core Components:                                                │
│  • ProtectedRoute (auth guard)                                   │
│  • Navbar (navigation + admin detection)                         │
│  • AddBookDialog (OpenLibrary API search)                        │
│  • BookCard (book display)                                       │
│  • StatsCard (dashboard metrics)                                 │
├─────────────────────────────────────────────────────────────────┤
│  Hooks:                                                          │
│  • useNotifications (browser notification permissions)           │
│  • useMobile (responsive detection)                              │
│  • useToast (toast notifications)                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase Backend                             │
├─────────────────────────────────────────────────────────────────┤
│  Authentication:                                                 │
│  • Email/Password signup & login                                 │
│  • Auto-confirm enabled (no email verification)                  │
│  • Session persistence via localStorage                          │
├─────────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL):                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐                   │
│  │ profiles │  │  books   │  │  user_books  │                   │
│  │ (1:1)    │  │ (shared) │  │  (junction)  │                   │
│  └──────────┘  └──────────┘  └──────────────┘                   │
│  ┌──────────────────┐  ┌───────────────┐  ┌─────────┐          │
│  │ reading_sessions │  │ reading_goals │  │  notes  │          │
│  └──────────────────┘  └───────────────┘  └─────────┘          │
│  ┌────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ user_roles │  │ ai_prompts  │  │ ai_insights │              │
│  └────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  Edge Functions:                                                 │
│  • AI insight generation (uses OPENAI_API_KEY)                   │
├─────────────────────────────────────────────────────────────────┤
│  Row-Level Security:                                             │
│  • All tables protected with user-specific policies              │
│  • Admin role check via has_role() function                      │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External APIs                                 │
├─────────────────────────────────────────────────────────────────┤
│  OpenLibrary API (no auth required):                             │
│  • Book search: /search.json?q={query}                           │
│  • ISBN lookup: /isbn/{isbn}.json                                │
│  • Cover images: covers.openlibrary.org/b/id/{id}-L.jpg         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Enums

```sql
-- User roles for admin functionality
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Types of reading goals
CREATE TYPE public.goal_type AS ENUM (
  'daily_minutes',    -- Minutes per day
  'weekly_minutes',   -- Minutes per week  
  'books_per_month',  -- Books to read per month
  'books_per_year'    -- Books to read per year
);

-- Types of notes users can create
CREATE TYPE public.note_type AS ENUM (
  'note',   -- General note
  'quote'   -- Quote from the book
);

-- Reading status for user's books
CREATE TYPE public.reading_status AS ENUM (
  'want_to_read',  -- In wishlist
  'reading',       -- Currently reading
  'completed'      -- Finished reading
);
```

### Tables

#### 1. `profiles` - User Profile Data

Stores additional user information. Created automatically when a user signs up via trigger.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | - | Primary key, references auth.users |
| `full_name` | text | Yes | NULL | User's display name |
| `created_at` | timestamptz | No | now() | Account creation time |

**Relationships:**
- `id` → `auth.users.id` (1:1, CASCADE delete)

---

#### 2. `books` - Book Catalog

Shared book catalog. Books are added once and referenced by multiple users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `isbn` | text | Yes | NULL | ISBN-10 or ISBN-13 |
| `title` | text | No | - | Book title |
| `author` | text | Yes | NULL | Author name(s) |
| `cover_url` | text | Yes | NULL | Cover image URL |
| `publisher` | text | Yes | NULL | Publisher name |
| `published_date` | text | Yes | NULL | Publication date |
| `description` | text | Yes | NULL | Book description |
| `page_count` | integer | Yes | NULL | Total pages |
| `manual_entry` | boolean | Yes | false | True if manually added |
| `created_at` | timestamptz | No | now() | Record creation time |

**Notes:**
- Anyone can INSERT (to add new books)
- Anyone can SELECT (books are shared)
- No UPDATE/DELETE allowed (immutable catalog)

---

#### 3. `user_books` - User's Personal Library

Junction table linking users to books with reading status.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `user_id` | uuid | No | - | References auth.users |
| `book_id` | uuid | No | - | References books.id |
| `status` | reading_status | No | 'want_to_read' | Current reading status |
| `rating` | integer | Yes | NULL | User's rating (1-5) |
| `current_page` | integer | Yes | 0 | Last read page |
| `started_at` | timestamptz | Yes | NULL | When started reading |
| `completed_at` | timestamptz | Yes | NULL | When finished reading |
| `created_at` | timestamptz | No | now() | Record creation time |
| `updated_at` | timestamptz | No | now() | Last update time |

**Unique Constraint:** `(user_id, book_id)` - A user can only have one entry per book

---

#### 4. `reading_sessions` - Reading Time Tracking

Tracks individual reading sessions with pause/resume support.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `user_id` | uuid | No | - | References auth.users |
| `book_id` | uuid | No | - | References books.id |
| `started_at` | timestamptz | No | now() | Session start time |
| `ended_at` | timestamptz | Yes | NULL | Session end time |
| `duration_seconds` | integer | Yes | NULL | Total reading time |
| `start_page` | integer | Yes | NULL | Page when started |
| `end_page` | integer | Yes | NULL | Page when stopped |
| `pages_read` | integer | Yes | NULL | Calculated pages read |
| `paused_at` | timestamptz | Yes | NULL | When paused (if paused) |
| `paused_duration_seconds` | integer | Yes | 0 | Total pause time |
| `created_at` | timestamptz | No | now() | Record creation time |

**Business Logic:**
- `duration_seconds` = total elapsed time - `paused_duration_seconds`
- `pages_read` = `end_page` - `start_page`
- Sessions can be paused/resumed multiple times
- `paused_at` is set when paused, cleared when resumed

---

#### 5. `reading_goals` - User Goals

Stores user's reading goals of various types.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `user_id` | uuid | No | - | References auth.users |
| `goal_type` | goal_type | No | - | Type of goal |
| `target_value` | integer | No | - | Target amount |
| `created_at` | timestamptz | No | now() | Record creation time |
| `updated_at` | timestamptz | No | now() | Last update time |

**Unique Constraint:** `(user_id, goal_type)` - One goal per type per user

**Goal Types Explained:**
- `daily_minutes`: Target minutes to read per day (e.g., 30)
- `weekly_minutes`: Target minutes to read per week (e.g., 150)
- `books_per_month`: Number of books to complete per month
- `books_per_year`: Number of books to complete per year

---

#### 6. `notes` - User Notes & Quotes

Stores notes and quotes users take while reading.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `user_id` | uuid | No | - | References auth.users |
| `book_id` | uuid | No | - | References books.id |
| `note_type` | note_type | No | 'note' | Type: note or quote |
| `content` | text | No | - | Note content |
| `page_number` | integer | Yes | NULL | Associated page |
| `created_at` | timestamptz | No | now() | Record creation time |
| `updated_at` | timestamptz | No | now() | Last update time |

---

#### 7. `user_roles` - Admin Role Management

Stores admin roles. Regular users don't have entries here.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `user_id` | uuid | No | - | References auth.users |
| `role` | app_role | No | - | User's role |
| `created_at` | timestamptz | No | now() | Record creation time |

**Unique Constraint:** `(user_id, role)` - One role type per user

**Important:** To make a user an admin, insert a row with `role = 'admin'`

---

#### 8. `ai_prompts` - AI Prompt Templates (Admin-Managed)

Stores system prompts for AI insight generation. Managed by admins only.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `prompt_type` | text | No | - | Unique identifier (e.g., 'book_summary') |
| `system_prompt` | text | No | - | The AI system prompt |
| `description` | text | Yes | NULL | Human-readable description |
| `created_at` | timestamptz | No | now() | Record creation time |
| `updated_at` | timestamptz | No | now() | Last update time |

**Unique Constraint:** `prompt_type` must be unique

---

#### 9. `ai_insights` - Generated AI Content

Stores AI-generated insights for user's books.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `user_id` | uuid | No | - | References auth.users |
| `book_id` | uuid | No | - | References books.id |
| `prompt_type` | text | No | - | Which prompt was used |
| `custom_instruction` | text | Yes | NULL | User's custom instructions |
| `generated_content` | text | No | - | The AI-generated text |
| `created_at` | timestamptz | No | now() | Record creation time |
| `updated_at` | timestamptz | No | now() | Last update time |

---

## Database Functions

### 1. `handle_new_user()` - Auto-create Profile

Trigger function that creates a profile when a new user signs up.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;

-- Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. `has_role()` - Check User Role

Security definer function to check if a user has a specific role. Used in RLS policies to prevent infinite recursion.

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;
```

### 3. `update_updated_at_column()` - Auto-update Timestamps

Trigger function to automatically update `updated_at` column.

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
```

### 4. `get_user_id_by_email()` - Lookup User by Email

Utility function for admin to find user IDs by email.

```sql
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id FROM auth.users WHERE email = _email LIMIT 1
$$;
```

---

## Row-Level Security Policies

All tables have RLS enabled. Here are the policies:

### `profiles`

| Policy | Command | Expression |
|--------|---------|------------|
| Users can view their own profile | SELECT | `auth.uid() = id` |
| Users can insert their own profile | INSERT | `auth.uid() = id` |
| Users can update their own profile | UPDATE | `auth.uid() = id` |

### `books`

| Policy | Command | Expression |
|--------|---------|------------|
| Anyone can view books | SELECT | `true` |
| Anyone can insert books | INSERT | `true` |

### `user_books`

| Policy | Command | Expression |
|--------|---------|------------|
| Users can view their own books | SELECT | `auth.uid() = user_id` |
| Users can insert their own books | INSERT | `auth.uid() = user_id` |
| Users can update their own books | UPDATE | `auth.uid() = user_id` |
| Users can delete their own books | DELETE | `auth.uid() = user_id` |

### `reading_sessions`

| Policy | Command | Expression |
|--------|---------|------------|
| Users can view their own sessions | SELECT | `auth.uid() = user_id` |
| Users can insert their own sessions | INSERT | `auth.uid() = user_id` |
| Users can update their own sessions | UPDATE | `auth.uid() = user_id` |
| Users can delete their own sessions | DELETE | `auth.uid() = user_id` |

### `reading_goals`

| Policy | Command | Expression |
|--------|---------|------------|
| Users can view their own goals | SELECT | `auth.uid() = user_id` |
| Users can insert their own goals | INSERT | `auth.uid() = user_id` |
| Users can update their own goals | UPDATE | `auth.uid() = user_id` |
| Users can delete their own goals | DELETE | `auth.uid() = user_id` |

### `notes`

| Policy | Command | Expression |
|--------|---------|------------|
| Users can view their own notes | SELECT | `auth.uid() = user_id` |
| Users can insert their own notes | INSERT | `auth.uid() = user_id` |
| Users can update their own notes | UPDATE | `auth.uid() = user_id` |
| Users can delete their own notes | DELETE | `auth.uid() = user_id` |

### `user_roles`

| Policy | Command | Expression |
|--------|---------|------------|
| Users can view their own roles | SELECT | `auth.uid() = user_id` |
| Admins can view all roles | SELECT | `has_role(auth.uid(), 'admin')` |
| Admins can manage roles | ALL | `has_role(auth.uid(), 'admin')` |

### `ai_prompts`

| Policy | Command | Expression |
|--------|---------|------------|
| Anyone can view prompts | SELECT | `true` |
| Admins can manage prompts | ALL | `has_role(auth.uid(), 'admin')` |

### `ai_insights`

| Policy | Command | Expression |
|--------|---------|------------|
| Users can view their own insights | SELECT | `auth.uid() = user_id` |
| Users can insert their own insights | INSERT | `auth.uid() = user_id` |
| Users can update their own insights | UPDATE | `auth.uid() = user_id` |
| Users can delete their own insights | DELETE | `auth.uid() = user_id` |

---

## Frontend Routes

| Route | Page Component | Auth Required | Description |
|-------|---------------|---------------|-------------|
| `/auth` | Auth | No | Login/Signup page |
| `/` | Dashboard | Yes | Main dashboard with stats and current reads |
| `/library` | Library | Yes | User's book collection with filters |
| `/book/:id` | BookDetail | Yes | Book details, notes, AI insights |
| `/read/:id` | ReadingSession | Yes | Reading timer with pause/resume |
| `/goals` | Goals | Yes | Set and track reading goals |
| `/notes` | Notes | Yes | View all notes across books |
| `/setup` | AppSetup | Yes | PWA installation & notification setup guide |
| `/notifications` | Notifications | Yes | Notification preference settings |
| `/admin` | Admin | Yes + Admin | AI prompt management |
| `*` | NotFound | No | 404 page |

---

## Key Components

### `ProtectedRoute`
Wraps routes that require authentication. Redirects to `/auth` if not logged in.

### `Navbar`
Main navigation component. Features:
- Shows user's name from profile
- Conditionally shows Admin link if user has admin role
- Logout functionality

### `AddBookDialog`
Modal for adding books to library:
- Search books via OpenLibrary API
- Manual entry option
- ISBN lookup
- Displays search results with cover images

### `BookCard`
Displays a book in the library grid:
- Cover image with fallback
- Title and author
- Reading status badge
- Progress bar (current_page / page_count)
- Rating display

### `StatsCard`
Dashboard statistic display with icon, label, and value.

### `Auth`
Login/Signup form with:
- Email/password validation
- Toggle between login and signup modes
- Error handling with toast notifications

---

## External APIs

### OpenLibrary API

**Base URL:** `https://openlibrary.org`

| Endpoint | Purpose | Example |
|----------|---------|---------|
| `/search.json?q={query}` | Search books | `/search.json?q=harry+potter` |
| `/isbn/{isbn}.json` | Get book by ISBN | `/isbn/9780747532743.json` |
| `/works/{id}.json` | Get work details | `/works/OL82563W.json` |

**Cover Images:**
- URL: `https://covers.openlibrary.org/b/id/{cover_id}-{size}.jpg`
- Sizes: S (small), M (medium), L (large)

**Response Shape (Search):**
```typescript
interface OpenLibrarySearchResult {
  docs: Array<{
    key: string;           // "/works/OL82563W"
    title: string;
    author_name?: string[];
    cover_i?: number;      // Cover ID
    isbn?: string[];
    publisher?: string[];
    first_publish_year?: number;
    number_of_pages_median?: number;
  }>;
}
```

---

## Validation Schemas

Located in `src/lib/validation.ts`. Uses Zod for runtime validation.

```typescript
// Email validation
export const emailSchema = z.string()
  .email("Invalid email address")
  .min(1, "Email is required");

// Password validation (min 6 chars)
export const passwordSchema = z.string()
  .min(6, "Password must be at least 6 characters");

// Login form
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Signup form
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  fullName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Book form (manual entry)
export const bookSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().optional(),
  isbn: z.string().optional(),
  pageCount: z.number().positive().optional(),
  description: z.string().optional(),
});

// Note form
export const noteSchema = z.object({
  content: z.string().min(1, "Content is required"),
  noteType: z.enum(["note", "quote"]),
  pageNumber: z.number().positive().optional(),
});

// Reading goal form
export const goalSchema = z.object({
  goalType: z.enum([
    "daily_minutes",
    "weekly_minutes", 
    "books_per_month",
    "books_per_year"
  ]),
  targetValue: z.number().positive("Target must be positive"),
});
```

---

## PWA & Notifications

### Service Worker

Located at `public/sw.js`. Handles:
- Offline caching
- Push notification display
- Notification click handling

### Notification System

**Files:**
- `src/lib/notifications.ts` - Core notification utilities
- `src/hooks/useNotifications.ts` - Hook for browser notification permissions
- `src/hooks/usePushSubscription.ts` - Hook for Web Push subscription management

### Server-Side Push Notifications

PagePace supports **true server-side push notifications** that work even when the app is closed. This is implemented using:

1. **Web Push API** - For sending notifications from the server
2. **VAPID Keys** - For secure authentication between server and push service
3. **pg_cron** - For scheduled reminder delivery

**Database Tables:**
- `push_subscriptions` - Stores user's push subscription details (endpoint, keys)
- `notification_settings` - Stores user preferences (reminder time, notification types)

**Edge Function:**
- `send-push-notification` - Handles sending push notifications
  - Supports scheduled reminders via cron job
  - Supports individual notifications (for goals, streaks, completions)

**How it works:**
1. User grants notification permission in browser
2. Browser generates a push subscription with endpoint and keys
3. Subscription is stored in `push_subscriptions` table
4. User sets preferences in `notification_settings` table
5. Cron job runs every minute, checks for users whose reminder time has arrived
6. Edge function sends Web Push to matching users' subscriptions

### Generating VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for Web Push:

```bash
# Using web-push CLI
npm install -g web-push
web-push generate-vapid-keys

# Or using Node.js
node -e "const webpush = require('web-push'); const keys = webpush.generateVAPIDKeys(); console.log(JSON.stringify(keys, null, 2))"
```

Store the generated keys:
- `VAPID_PUBLIC_KEY` - In Supabase secrets AND as `VITE_VAPID_PUBLIC_KEY` in .env
- `VAPID_PRIVATE_KEY` - In Supabase secrets only (never expose to frontend)

### Cron Job Setup

The cron job is configured to run every minute:

```sql
SELECT cron.schedule(
  'send-daily-reminders',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/send-push-notification',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{"type": "scheduled_reminders"}'::jsonb
  );
  $$
);
```

### Self-Hosting Push Notifications

When deploying to your own infrastructure:

| Component | Lovable Cloud | Vercel + Supabase | Other |
|-----------|---------------|-------------------|-------|
| Frontend | Auto-deployed | Vercel deployment | Any static host |
| Database | Lovable Cloud | Your Supabase | PostgreSQL |
| Edge Function | Auto-deployed | Supabase Edge Functions | Adapt to platform |
| Cron Job | pg_cron | pg_cron | Platform scheduler |
| VAPID Keys | Supabase Secrets | Supabase Secrets | Environment vars |

**Required changes for self-hosting:**
1. Update cron job URL to point to your Supabase project
2. Store VAPID keys in your secret management system
3. Update `VITE_VAPID_PUBLIC_KEY` in your frontend .env

### PWA Manifest

Configured in `vite.config.ts` with `vite-plugin-pwa`:
- App name: "PagePace"
- Theme color matches app design
- Icons: 192x192 and 512x512

---

## Environment Variables

Required in `.env` file (auto-generated by Lovable Cloud):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```

**Edge Function Secrets** (configured in Supabase):
- `OPENAI_API_KEY` - For AI insight generation
- `VAPID_PUBLIC_KEY` - For Web Push authentication
- `VAPID_PRIVATE_KEY` - For Web Push authentication (keep secret!)
- `STRIPE_SECRET_KEY` - (If payment features added)

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm or bun
- Supabase account (or use Lovable Cloud)

### 1. Clone Repository

```bash
git clone <repository-url>
cd pagepace
npm install
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned

### 3. Run Database Migrations

Copy the SQL from [Complete SQL Migration](#complete-sql-migration) section and run it in the Supabase SQL Editor.

### 4. Configure Authentication

In Supabase Dashboard → Authentication → Settings:
- Enable Email provider
- **Disable** "Confirm email" for easier development
- Set Site URL to your app URL

### 5. Set Environment Variables

Create `.env` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### 6. Start Development Server

```bash
npm run dev
```

### 7. Create Admin User (Optional)

1. Sign up through the app
2. In Supabase SQL Editor, run:
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'your@email.com'),
  'admin'
);
```

---

## Complete SQL Migration

Run this SQL in Supabase SQL Editor to create the entire database schema:

```sql
-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.goal_type AS ENUM ('daily_minutes', 'weekly_minutes', 'books_per_month', 'books_per_year');
CREATE TYPE public.note_type AS ENUM ('note', 'quote');
CREATE TYPE public.reading_status AS ENUM ('want_to_read', 'reading', 'completed');

-- =====================================================
-- TABLES
-- =====================================================

-- Profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Books (shared catalog)
CREATE TABLE public.books (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  isbn text,
  title text NOT NULL,
  author text,
  cover_url text,
  publisher text,
  published_date text,
  description text,
  page_count integer,
  manual_entry boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User Books (junction table)
CREATE TABLE public.user_books (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  book_id uuid NOT NULL,
  status public.reading_status NOT NULL DEFAULT 'want_to_read',
  rating integer,
  current_page integer DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

-- Reading Sessions
CREATE TABLE public.reading_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  book_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  start_page integer,
  end_page integer,
  pages_read integer,
  paused_at timestamptz,
  paused_duration_seconds integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Reading Goals
CREATE TABLE public.reading_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  goal_type public.goal_type NOT NULL,
  target_value integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, goal_type)
);

-- Notes
CREATE TABLE public.notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  book_id uuid NOT NULL,
  note_type public.note_type NOT NULL DEFAULT 'note',
  content text NOT NULL,
  page_number integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- AI Prompts (admin-managed)
CREATE TABLE public.ai_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_type text NOT NULL UNIQUE,
  system_prompt text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- AI Insights
CREATE TABLE public.ai_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  book_id uuid NOT NULL,
  prompt_type text NOT NULL,
  custom_instruction text,
  generated_content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;

-- Check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Get user ID by email (admin utility)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id FROM auth.users WHERE email = _email LIMIT 1
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update timestamps
CREATE TRIGGER update_user_books_updated_at
  BEFORE UPDATE ON public.user_books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reading_goals_updated_at
  BEFORE UPDATE ON public.reading_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_prompts_updated_at
  BEFORE UPDATE ON public.ai_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_insights_updated_at
  BEFORE UPDATE ON public.ai_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Books (public catalog)
CREATE POLICY "Anyone can view books" ON public.books
  FOR SELECT USING (true);
CREATE POLICY "Anyone can insert books" ON public.books
  FOR INSERT WITH CHECK (true);

-- User Books
CREATE POLICY "Users can view their own books" ON public.user_books
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own books" ON public.user_books
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own books" ON public.user_books
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own books" ON public.user_books
  FOR DELETE USING (auth.uid() = user_id);

-- Reading Sessions
CREATE POLICY "Users can view their own sessions" ON public.reading_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sessions" ON public.reading_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON public.reading_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sessions" ON public.reading_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Reading Goals
CREATE POLICY "Users can view their own goals" ON public.reading_goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own goals" ON public.reading_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own goals" ON public.reading_goals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own goals" ON public.reading_goals
  FOR DELETE USING (auth.uid() = user_id);

-- Notes
CREATE POLICY "Users can view their own notes" ON public.notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own notes" ON public.notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notes" ON public.notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notes" ON public.notes
  FOR DELETE USING (auth.uid() = user_id);

-- User Roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- AI Prompts
CREATE POLICY "Anyone can view prompts" ON public.ai_prompts
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage prompts" ON public.ai_prompts
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- AI Insights
CREATE POLICY "Users can view their own insights" ON public.ai_insights
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own insights" ON public.ai_insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own insights" ON public.ai_insights
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own insights" ON public.ai_insights
  FOR DELETE USING (auth.uid() = user_id);
```

---

## Project URLs

- **Lovable Project:** https://lovable.dev/projects/0f819eeb-b07e-4514-8845-ad71d61d2102
- **Live App:** (Published via Lovable)

---

## License

This project was created with [Lovable](https://lovable.dev).
