# LIFE OS — Version 1 Specification

**Project:** LIFE OS  
**Product Type:** Personal AI Operating System  
**Version:** 1.0  
**Status:** LOCKED SPECIFICATION  
**Primary User:** Single private owner  
**Repository:** life-os  
**Default Language:** Arabic  
**Layout Direction:** RTL  
**Development Approach:** Contract First → Build → Test → Freeze

---

# 1. Vision

LIFE OS is a private personal operating system powered by artificial intelligence.

Its purpose is to organize the user's life in one simple, calm, secure and intelligent system.

The system must understand:

- finances
- salary
- monthly allocations
- investments
- goals
- projects
- career
- learning
- education
- tasks
- personal development
- travel goals
- fitness goals
- future opportunities
- important personal context

The system must help answer three questions:

1. Where am I now?
2. What matters most?
3. What should I do next?

---

# 2. Core Product Principle

The product must be:

**Simple on the outside. Intelligent underneath.**

The interface must never become overloaded.

The system must prefer:

- short text
- clear cards
- simple tables
- short lists
- clear progress
- clear priorities
- clear next actions

The system must avoid:

- unnecessary paragraphs
- excessive numbers
- information overload
- complicated dashboards
- technical language in the user interface
- duplicate information
- unnecessary charts
- excessive notifications

---

# 3. Dashboard Rule

The Home Dashboard is the main command center.

It should primarily show:

1. current status
2. top 3 priorities
3. important alerts
4. next actions
5. short financial snapshot
6. short investment snapshot
7. active goals
8. current learning/career progress
9. latest AI recommendation

The Dashboard must never become a page containing everything.

Maximum priority items shown at once:

**3**

Other information should remain inside its relevant section.

---

# 4. Version 1 Scope

Version 1 includes the following modules.

## 4.1 Dashboard

Purpose:

Provide a calm overview of the user's current situation.

Includes:

- top 3 priorities
- current month
- financial snapshot
- investment snapshot
- active goals
- active projects
- learning progress
- career progress
- urgent tasks
- latest AI advice

---

## 4.2 Goals

Purpose:

Track personal and professional goals.

Goal categories:

- finance
- investments
- career
- learning
- education
- business
- travel
- fitness
- personal
- other

Each goal may contain:

- title
- category
- description
- target
- current progress
- target date
- priority
- status
- next action

Goal status values:

- planned
- active
- paused
- completed
- cancelled

---

## 4.3 Projects

Purpose:

Manage larger initiatives.

Examples:

- AI projects
- master's degree
- business preparation
- professional development
- travel planning

Each project contains:

- title
- description
- category
- status
- progress
- start date
- target date
- priority
- next action
- related goal

Project status values:

- planned
- active
- blocked
- paused
- completed
- cancelled

---

# 5. Finance

The Finance module manages personal financial planning.

Version 1 supports:

- salary
- other income
- monthly budget
- recurring allocations
- savings
- emergency fund
- travel savings
- investment allocation
- personal spending allocation
- monthly snapshots
- planned versus actual values

The Finance interface must remain simple.

Primary Finance screen:

- income
- committed amount
- savings
- investments
- available amount

Detailed information may appear below in a simple table.

LIFE OS does not connect directly to bank accounts in V1.

Financial information is entered or updated manually.

---

# 6. Investments

The Investments module tracks investment planning.

Version 1 supports:

- investment assets
- asset category
- ticker
- quantity
- average cost
- current reference price
- invested amount
- monthly contribution
- target
- notes
- transactions
- portfolio snapshot

The system may calculate:

- total invested
- current estimated value
- estimated gain/loss
- allocation percentage
- progress toward target

The AI may:

- analyze
- explain
- compare
- suggest
- identify concentration
- identify goal conflicts

The AI may NOT:

- buy
- sell
- place orders
- connect to brokerage execution
- transfer money

---

# 7. Career

The Career module tracks professional development.

Version 1 supports:

- current role
- career target
- skills
- experience
- professional milestones
- CV status
- achievements
- career gaps
- future target roles

The system should help identify:

- strengths
- missing skills
- next career step
- useful development areas

---

# 8. Learning & Education

The Learning module manages:

- courses
- certifications
- learning paths
- master's degree
- universities
- education milestones
- progress
- completion status

Learning item status:

- planned
- active
- completed
- paused
- dropped

The AI should avoid recommending excessive courses.

A recommendation must explain briefly:

- why it matters
- priority
- expected value
- when to do it

---

# 9. Tasks

Tasks represent concrete actions.

Each task contains:

- title
- related project or goal
- priority
- due date
- status
- notes

Task status:

- pending
- active
- completed
- cancelled

The Dashboard may display urgent tasks.

---

# 10. AI Chief of Staff

The AI Chief of Staff is the central intelligence layer.

Its job is to understand the user's structured LIFE OS data and provide useful recommendations.

Its responsibilities:

- summarize current situation
- prioritize goals
- identify conflicts
- recommend next actions
- detect stalled projects
- identify financial pressure
- connect learning with career goals
- connect financial goals with other goals
- generate development ideas
- provide short decision support

It must prefer concise recommendations.

Default response structure:

1. Situation
2. Recommendation
3. Next Action

When appropriate, the AI should provide only the recommendation and next action.

---

# 11. AI Context

The AI must receive only the information required for the current request.

The system must NOT send the entire database to the AI for every request.

Context must be assembled from relevant records.

Examples:

Finance question:

- finance data
- relevant goals
- relevant projects

Career question:

- career data
- learning data
- relevant goals

Investment question:

- investment data
- finance constraints
- relevant goals

This minimizes:

- unnecessary exposure
- token usage
- cost
- complexity

---

# 12. AI Tools

Version 1 exposes exactly seven logical AI tools.

1. `get_dashboard_snapshot`
2. `get_finance_snapshot`
3. `get_investment_snapshot`
4. `get_goal_status`
5. `get_learning_status`
6. `simulate_decision`
7. `search_opportunities`

Tools must return structured data.

The AI must not directly access the database outside approved server-side tools.

---

# 13. Decision Simulator

The Decision Simulator evaluates hypothetical decisions.

Example:

"If I increase investing and start a master's degree, what changes?"

The simulator should consider relevant information such as:

- income
- financial commitments
- savings goals
- investment goals
- active projects
- deadlines
- priorities

Output should remain simple.

Preferred structure:

### Option A
Short result.

### Option B
Short result.

### Best Choice
Recommended option.

### Trade-off
Main compromise.

The simulator provides decision support only.

It does not make decisions for the user.

---

# 14. Opportunity Search

Version 1 includes user-initiated opportunity search.

Possible searches:

- courses
- certifications
- career opportunities
- education opportunities
- professional programs
- development opportunities

The system should compare an opportunity against:

- user's goals
- career direction
- current skills
- current workload
- current learning plan

Opportunity output:

- name
- reason
- fit score
- priority
- recommendation

Opportunity Search is NOT continuously automated in V1.

Automatic monitoring belongs to a later version.

---

# 15. Personal Memory

LIFE OS contains structured personal memory.

Memory may contain:

- preferences
- important decisions
- constraints
- long-term plans
- recurring principles
- useful personal context

Memory must remain separate from temporary AI conversation text.

Each memory record must have:

- category
- title
- content
- importance
- created date
- updated date

Sensitive secrets must never be stored as memory.

---

# 16. Audit Log

Important actions must create an audit record.

Audit examples:

- login
- record created
- record updated
- record deleted
- AI recommendation generated
- opportunity search requested
- decision simulation requested
- security-sensitive setting changed

Audit log entries should contain:

- user
- action
- entity
- entity ID
- timestamp
- safe metadata

Audit logs must never contain:

- passwords
- access tokens
- API keys
- full sensitive prompts
- private secrets

---

# 17. Security Principle

Security is a higher priority than convenience.

Mandatory principle:

**AI Suggests → User Reviews → User Approves → System Executes**

The AI must never independently perform sensitive actions.

---

# 18. Forbidden AI Actions

Version 1 AI is prohibited from independently:

- transferring money
- buying investments
- selling investments
- submitting brokerage orders
- sending emails
- deleting important records
- changing authentication settings
- changing security controls
- exposing secrets
- accessing unrelated personal data
- publishing information publicly

---

# 19. Authentication

Version 1 is a private single-user application.

Authentication uses Supabase Auth.

All protected application pages require authentication.

Unauthenticated users may only access:

- login
- authentication callback

No public registration workflow is required for V1.

---

# 20. Database Security

PostgreSQL is provided through Supabase.

Row Level Security must be enabled on every user-owned table.

Every user-owned record must contain:

`user_id`

Access policy:

Authenticated user may access only rows where:

`user_id = auth.uid()`

No user data table may remain without RLS.

---

# 21. Secrets

Secrets must never be committed to GitHub.

Forbidden inside repository:

- OpenAI API keys
- Supabase service role keys
- passwords
- private tokens
- brokerage credentials
- banking credentials

Secrets are stored only in environment variables or approved secret managers.

`.env.local` must be ignored by Git.

`.env.example` contains variable names only.

---

# 22. Client / Server Security

Sensitive logic must remain server-side.

Browser/client code must never receive:

- OpenAI API key
- Supabase service role key
- internal secret credentials

Client code may receive only public configuration explicitly designed for browser use.

---

# 23. Data Validation

All external input must be validated before use.

Validation applies to:

- forms
- URL parameters
- API requests
- AI tool arguments
- database mutations

Invalid input must be rejected safely.

---

# 24. AI Security

AI output is untrusted application input.

AI-generated values must never automatically become sensitive actions.

The application must validate AI tool calls.

The AI may read only data exposed through approved tools.

The AI cannot choose arbitrary database queries.

---

# 25. Version 1 Database Tables

Version 1 contains exactly 14 primary tables.

1. `profiles`
2. `income_sources`
3. `budget_items`
4. `monthly_snapshots`
5. `investment_assets`
6. `investment_transactions`
7. `goals`
8. `projects`
9. `tasks`
10. `learning_items`
11. `career_items`
12. `memory_items`
13. `ai_recommendations`
14. `audit_logs`

No new primary table may be added during V1 without a genuine architectural requirement.

---

# 26. Relationship Principles

Primary relationships:

Profile
→ owns all personal data

Goals
→ may link to Projects

Projects
→ may link to Goals

Tasks
→ may link to Projects
→ may link to Goals

Learning Items
→ may support Goals

Career Items
→ may support Goals

Investment Assets
→ contain Investment Transactions

AI Recommendations
→ may reference relevant entities

Audit Logs
→ record important actions

---

# 27. Technology Stack

Version 1 stack is fixed.

Frontend:

- Next.js
- App Router
- React
- TypeScript

Database:

- PostgreSQL
- Supabase

Authentication:

- Supabase Auth

AI:

- OpenAI Responses API

Validation:

- Zod

Deployment:

- Vercel

Source Control:

- GitHub

Automation / CI:

- GitHub Actions

---

# 28. UI Design Rules

Primary language:

Arabic

Direction:

RTL

Design style:

- clean
- calm
- modern
- minimal
- professional
- mobile-first

Avoid:

- crowded screens
- excessive gradients
- excessive animations
- decorative information
- large text blocks
- complicated navigation

---

# 29. Navigation

Version 1 navigation contains:

- الرئيسية
- الأهداف
- المشاريع
- المالية
- الاستثمارات
- المسار المهني
- التعلم
- المهام
- المساعد الذكي
- السجل
- الإعدادات

Navigation may collapse appropriately on mobile.

---

# 30. Responsive Design

The application must work correctly on:

- iPhone
- modern mobile browsers
- tablets
- desktop browsers

Mobile experience is a primary requirement.

No page may require desktop use.

---

# 31. Accessibility

Version 1 must include reasonable accessibility fundamentals:

- semantic HTML
- keyboard support
- visible focus
- readable contrast
- labels for interactive controls
- meaningful headings

---

# 32. Performance

Version 1 should prioritize:

- server rendering where appropriate
- minimal client JavaScript
- efficient database queries
- small UI components
- limited AI context
- no unnecessary requests

Complex optimization is not required before evidence of a real performance problem.

---

# 33. Finance Calculations

Financial calculations must be deterministic application logic.

The AI must not be trusted to calculate authoritative financial totals.

Examples calculated by application code:

- total income
- total allocations
- remaining amount
- savings total
- investment contribution
- monthly difference

AI may explain calculated results.

---

# 34. Investment Calculations

Investment calculations must also be deterministic.

Examples:

- quantity × reference price
- portfolio total
- allocation percentage
- estimated gain/loss
- contribution totals

AI may interpret the results.

AI must not replace deterministic calculation functions.

---

# 35. AI Recommendation Storage

AI recommendations may be stored.

Each saved recommendation should include:

- category
- short title
- short recommendation
- priority
- status
- created time

Recommendation status:

- new
- reviewed
- accepted
- dismissed

Saving a recommendation does not mean it was approved for execution.

---

# 36. Version 1 API Routes

Version 1 contains two application AI API routes.

1. `/api/ai`
2. `/api/opportunities`

`/api/ai`

Handles:

- Chief of Staff conversations
- summaries
- recommendations
- decision simulations

`/api/opportunities`

Handles:

- user-requested opportunity searches
- opportunity analysis

No public API is provided in V1.

---

# 37. Version 1 Pages

Version 1 application routes:

1. `/`
2. `/login`
3. `/dashboard`
4. `/goals`
5. `/projects`
6. `/finance`
7. `/investments`
8. `/career`
9. `/learning`
10. `/tasks`
11. `/assistant`
12. `/settings`
13. `/audit`
14. `/auth/callback`
15. `/api/ai`
16. `/api/opportunities`

---

# 38. Out of Scope for Version 1

The following are intentionally NOT included in V1:

- direct bank integration
- brokerage execution
- automatic stock trading
- automatic email sending
- Gmail integration
- Google Calendar integration
- Google Drive integration
- WhatsApp integration
- Apple Health integration
- wearable integration
- automatic background opportunity monitoring
- autonomous agents making decisions
- public user registration
- multi-user SaaS
- subscription billing
- public profiles
- social features
- native iOS application
- native Android application
- business management module
- real estate management module
- advanced portfolio trading tools
- voice assistant
- automated financial transfers

These may be considered only after V1 is closed.

---

# 39. V1 File Count

Version 1 contains:

**60 manually maintained project files**

plus:

**1 automatically generated package-lock.json**

Target repository size:

Approximately 61 files after dependency installation.

---

# 40. Official V1 File Manifest

The following file manifest is locked.

Files are created in this order.

## Phase 1 — Documentation

01. `docs/V1_SPEC.md`
02. `docs/ARCHITECTURE.md`
03. `docs/SECURITY.md`
04. `docs/DATABASE.md`
05. `docs/OPERATIONS.md`

## Phase 2 — Root Configuration

06. `package.json`
07. `tsconfig.json`
08. `next.config.ts`
09. `eslint.config.mjs`
10. `.gitignore`
11. `.env.example`
12. `README.md`

## Phase 3 — Database

13. `supabase/migrations/001_v1_schema.sql`
14. `supabase/migrations/002_v1_rls.sql`
15. `supabase/seed.sql`

## Phase 4 — Core Library

16. `lib/env.ts`
17. `lib/types.ts`
18. `lib/constants.ts`
19. `lib/validation.ts`
20. `lib/format.ts`
21. `lib/supabase/client.ts`
22. `lib/supabase/server.ts`
23. `lib/auth.ts`
24. `lib/data.ts`
25. `lib/audit.ts`

## Phase 5 — AI

26. `ai/chief-of-staff.ts`
27. `ai/context.ts`
28. `ai/tools.ts`
29. `ai/decision-simulator.ts`
30. `ai/opportunity-engine.ts`

## Phase 6 — Shared UI Components

31. `components/app-shell.tsx`
32. `components/sidebar.tsx`
33. `components/topbar.tsx`
34. `components/page-header.tsx`
35. `components/stat-card.tsx`
36. `components/priority-card.tsx`
37. `components/data-table.tsx`
38. `components/empty-state.tsx`

## Phase 7 — Application

39. `app/layout.tsx`
40. `app/globals.css`
41. `app/page.tsx`
42. `app/login/page.tsx`
43. `app/dashboard/page.tsx`
44. `app/goals/page.tsx`
45. `app/projects/page.tsx`
46. `app/finance/page.tsx`
47. `app/investments/page.tsx`
48. `app/career/page.tsx`
49. `app/learning/page.tsx`
50. `app/tasks/page.tsx`
51. `app/assistant/page.tsx`
52. `app/settings/page.tsx`
53. `app/audit/page.tsx`
54. `app/api/ai/route.ts`
55. `app/api/opportunities/route.ts`
56. `app/auth/callback/route.ts`

## Phase 8 — Security Boundary

57. `middleware.ts`

## Phase 9 — Tests

58. `tests/core.test.ts`
59. `tests/security.test.ts`

## Phase 10 — Continuous Integration

60. `.github/workflows/ci.yml`

---

# 41. Generated Files

The following may be generated automatically and are not part of the manually maintained 60-file manifest:

- `package-lock.json`
- `.next/*`
- generated TypeScript artifacts
- build artifacts
- deployment artifacts

Generated files do not change the locked V1 source-file count.

---

# 42. Build Order

Development must follow this order:

Specification
↓
Architecture
↓
Security
↓
Database
↓
Core Types
↓
Validation
↓
Authentication
↓
Data Access
↓
AI
↓
Shared UI
↓
Pages
↓
Middleware
↓
Tests
↓
CI
↓
Integration Test
↓
V1 Release

---

# 43. File Freeze Protocol

Every manually maintained file follows:

Plan
→ Implement
→ Review
→ Validate
→ Freeze

After a file is frozen, normal development moves to the next file.

The team should not casually return to completed files.

---

# 44. Freeze Exception

A frozen file may be changed only for:

1. confirmed bug
2. security vulnerability
3. failed integration
4. incorrect specification implementation
5. dependency incompatibility that prevents V1 operation

Cosmetic preference alone is not sufficient reason to reopen a frozen infrastructure file.

User-facing UI may receive final visual polishing during the V1 integration stage if required.

---

# 45. No Placeholder Rule

A file must not be marked complete if it contains:

- TODO
- fake implementation
- incomplete function
- dead code
- placeholder security logic
- unfinished validation
- temporary hardcoded credentials
- unexplained mock production behavior

Temporary UI seed data is allowed only where explicitly identified as development seed data.

---

# 46. Code Quality Rules

All TypeScript code must use strict typing.

Avoid:

- `any`
- duplicated logic
- unnecessary abstraction
- unnecessary libraries
- giant files
- hidden side effects

Prefer:

- simple functions
- clear naming
- explicit types
- server-side logic
- reusable small components

---

# 47. Dependency Rule

Every dependency must have a clear purpose.

Do not install a package when built-in functionality is sufficient.

Avoid dependency-heavy UI frameworks in V1 unless truly necessary.

The V1 interface should be built primarily with:

- React
- CSS
- native browser capabilities

---

# 48. Error Handling

Errors shown to the user must be:

- short
- clear
- non-technical

Internal errors may contain technical details only in server logs.

Never expose:

- stack traces
- API keys
- database credentials
- internal secrets

to the user interface.

---

# 49. Logging

Server logging must be minimal and safe.

Logs must not contain:

- passwords
- tokens
- API keys
- full financial datasets
- private memory contents

Operational logs may contain safe technical identifiers.

---

# 50. Data Deletion

The user must be able to delete user-created records.

Deletion must respect database relationships.

Important deletions should create an audit record where technically appropriate.

---

# 51. Backups

V1 relies on managed database backup capabilities available through the database provider configuration.

A backup and recovery procedure must be documented in:

`docs/OPERATIONS.md`

---

# 52. Testing Requirements

V1 testing must verify at minimum:

- financial calculations
- investment calculations
- validation rules
- authentication protection
- RLS assumptions
- AI action restrictions
- secret handling assumptions
- core data transformations

---

# 53. CI Requirements

GitHub Actions must automatically run:

1. dependency installation
2. lint
3. TypeScript validation
4. tests
5. production build

V1 cannot be released if CI fails.

---

# 54. V1 Release Criteria

Version 1 is complete only when:

- all 60 files exist
- database schema is applied
- RLS is enabled
- authentication works
- protected routes work
- Dashboard works
- Goals work
- Projects work
- Finance works
- Investments work
- Career works
- Learning works
- Tasks work
- AI Chief of Staff works
- Decision Simulator works
- Opportunity Search works
- Audit Log works
- mobile layout works
- no secrets exist in GitHub
- tests pass
- CI passes
- production build passes
- deployment works

---

# 55. Definition of "Works"

A feature is considered working only when it:

- loads without error
- reads correct data
- validates input
- respects authentication
- respects authorization
- behaves correctly on mobile
- handles empty state
- handles error state
- does not expose secrets

A visually complete page with fake logic is not considered working.

---

# 56. Initial Data Strategy

Real personal data should not be committed to GitHub.

Development seed data must be synthetic.

Real user data enters the system only through the private authenticated application or approved database setup.

---

# 57. Privacy Rule

The repository contains application code only.

It must never become a storage location for the user's life data.

Personal records belong in the protected database.

GitHub contains:

- code
- documentation
- schema
- tests
- safe synthetic seed data

GitHub does NOT contain:

- real salary details
- private financial records
- private investment records
- passwords
- API keys
- private documents
- sensitive personal notes

---

# 58. Product Philosophy

LIFE OS should behave like a quiet personal Chief of Staff.

It should not constantly demand attention.

It should surface information when useful.

The system should reduce cognitive load rather than create more work.

---

# 59. Default AI Behavior

The AI should:

- be concise
- prioritize
- explain only when needed
- avoid repeating known information
- avoid excessive warnings
- avoid excessive recommendations
- prefer one good recommendation over ten weak ones

When several priorities exist, show the best three.

When one action clearly matters most, show one.

---

# 60. Final V1 Principle

The objective of V1 is not to build every possible LIFE OS feature.

The objective is to build a small, secure and intelligent personal system that is genuinely useful every day.

The standard is:

**Simple to read.  
Safe to trust.  
Useful to act on.  
Intelligent underneath.**

---

# V1 SPECIFICATION STATUS

**LOCKED**

This document defines LIFE OS Version 1.

Changes to V1 scope after development begins should be avoided unless required by:

- security
- correctness
- failed integration
- critical architectural discovery

Everything else belongs to a future version.

---

**END OF LIFE OS V1 SPECIFICATION**