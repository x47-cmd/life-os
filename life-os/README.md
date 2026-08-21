LIFE OS

Personal AI Operating System

LIFE OS is a private, secure and AI-assisted personal command center for managing:

* finances
* investments
* goals
* projects
* career
* learning
* education
* tasks
* personal memory
* opportunities
* life decisions

The product is designed around one permanent principle:

Simple outside. Intelligent underneath.

⸻

Version

LIFE OS V1

Status:

IN DEVELOPMENT

Repository:

life-os

Visibility:

PRIVATE

Primary user:

Single private owner

⸻

Product Goal

LIFE OS should answer three questions clearly:

1. Where am I now?
2. What matters most?
3. What should I do next?

The application should reduce mental load rather than create more information.

⸻

Core User Experience

The main Dashboard should primarily show:

Current Status
Top 3 Priorities
Important Alerts
Next Actions
Finance Snapshot
Investment Snapshot
Active Goals
Active Projects
Career / Learning Progress
Latest AI Recommendation

The interface must remain:

* calm
* minimal
* readable
* mobile-friendly
* concise

⸻

Version 1 Modules

LIFE OS V1 contains:

Dashboard
Goals
Projects
Finance
Investments
Career
Learning & Education
Tasks
AI Chief of Staff
Decision Simulator
Opportunity Search
Personal Memory
Audit Log
Settings

⸻

AI Role

Artificial intelligence acts as:

Advisor
Analyzer
Prioritizer
Research Assistant
Decision Support

AI is NOT:

Final authority
Financial executor
Security authority
Database administrator
Autonomous decision maker

⸻

Permanent AI Rule

AI Suggests
↓
User Reviews
↓
User Approves
↓
System Executes

Sensitive real-world execution is intentionally excluded from V1.

⸻

Technology Stack

Application

Next.js 16
React 19
TypeScript
App Router

Database

Supabase
PostgreSQL

Authentication

Supabase Auth
Email + Password
TOTP MFA
AAL2

Artificial Intelligence

OpenAI Responses API

Validation

Zod

Testing

Vitest

Deployment

Vercel

Source Control

GitHub

CI

GitHub Actions

⸻

Runtime

Required runtime:

Node.js 24 LTS

Package manager:

npm

⸻

Architecture

LIFE OS follows a server-first architecture.

PRIVATE USER
      ↓
NEXT.JS APPLICATION
      ↓
AUTHENTICATED SERVER
      ↓
VALIDATION
      ↓
CONTROLLED DATA ACCESS
      ↓
SUPABASE POSTGRESQL + RLS
      ↓
PRIVATE STRUCTURED DATA

AI flow:

USER REQUEST
      ↓
VALIDATION
      ↓
AUTHENTICATION
      ↓
MINIMAL CONTEXT
      ↓
APPROVED AI TOOLS
      ↓
OPENAI
      ↓
SHORT RECOMMENDATION
      ↓
USER DECISION

⸻

Architecture Principles

LIFE OS V1 avoids unnecessary infrastructure.

Not used in V1:

Microservices
Kubernetes
Redis
GraphQL
Separate backend server
Python backend
Vector database
Redux
Multi-agent autonomous network
Large UI framework
Message queues

The system remains one maintainable Next.js application connected to managed services.

⸻

Repository Structure

life-os/
│
├── ai/
│   ├── chief-of-staff.ts
│   ├── context.ts
│   ├── tools.ts
│   ├── decision-simulator.ts
│   └── opportunity-engine.ts
│
├── app/
│   ├── api/
│   ├── assistant/
│   ├── audit/
│   ├── auth/
│   ├── career/
│   ├── dashboard/
│   ├── finance/
│   ├── goals/
│   ├── investments/
│   ├── learning/
│   ├── login/
│   ├── projects/
│   ├── settings/
│   ├── tasks/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── app-shell.tsx
│   ├── sidebar.tsx
│   ├── topbar.tsx
│   ├── page-header.tsx
│   ├── stat-card.tsx
│   ├── priority-card.tsx
│   ├── data-table.tsx
│   └── empty-state.tsx
│
├── docs/
│   ├── V1_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── SECURITY.md
│   ├── DATABASE.md
│   └── OPERATIONS.md
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   │
│   ├── env.ts
│   ├── types.ts
│   ├── constants.ts
│   ├── validation.ts
│   ├── format.ts
│   ├── auth.ts
│   ├── data.ts
│   └── audit.ts
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_v1_schema.sql
│   │   └── 002_v1_rls.sql
│   └── seed.sql
│
├── tests/
│   ├── core.test.ts
│   └── security.test.ts
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── .env.example
├── .gitignore
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── README.md
├── tsconfig.json
└── proxy.ts

⸻

V1 Source File Rule

Version 1 contains:

60 manually maintained source files

plus generated files such as:

package-lock.json
.next/*
build artifacts
generated TypeScript files

Generated files do not change the locked V1 source manifest.

⸻

Database

LIFE OS V1 contains exactly:

14 primary application tables

Tables:

profiles
income_sources
budget_items
monthly_snapshots
investment_assets
investment_transactions
goals
projects
tasks
learning_items
career_items
memory_items
ai_recommendations
audit_logs

⸻

Database Principle

PostgreSQL stores facts.
Application code calculates facts.
AI interprets facts.

AI is never the authoritative source for financial or investment calculations.

⸻

Security

LIFE OS contains sensitive personal information.

Security is therefore treated as a core system requirement.

Production security includes:

Private repository
Private authenticated application
Strong password
TOTP MFA
AAL2
Server-side authentication
Input validation
PostgreSQL RLS
User ownership
Secret isolation
Restricted AI tools
Audit logging
HTTPS
CI validation

⸻

Authentication

Production authentication:

Email
+
Password
+
TOTP MFA

Protected personal data requires the security assurance level defined by the V1 Security Specification.

Public registration is not part of V1.

⸻

Row Level Security

Every user-owned table must use PostgreSQL Row Level Security.

Conceptual rule:

Authenticated owner
may access only
rows owned by authenticated owner

The database remains a security boundary even if application code already filters by user.

⸻

Secrets

Never commit:

API keys
Passwords
Access tokens
Refresh tokens
Service Role keys
Recovery codes
TOTP secrets
Bank credentials
Broker credentials
Real environment files

⸻

Environment Variables

V1 requires:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
OPENAI_API_KEY=

Real local values belong in:

.env.local

Production values belong in:

Vercel Environment Variables

⸻

Important Secret Rule

OPENAI_API_KEY

is server-only.

It must never use:

NEXT_PUBLIC_

and must never be exposed to browser code.

⸻

Installation

Clone the private repository.

git clone <private-repository>

Enter the project:

cd life-os

Install dependencies:

npm ci

⸻

Local Environment

Create:

.env.local

using:

.env.example

as the template.

Example structure:

NEXT_PUBLIC_SUPABASE_URL=your-development-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-development-publishable-key
OPENAI_API_KEY=your-development-openai-key

Never commit .env.local.

⸻

Run Development

npm run dev

Open the local application in the browser using the address provided by Next.js.

⸻

Production Build

Validate production compilation:

npm run build

Run the compiled application:

npm run start

⸻

Code Quality

Run ESLint:

npm run lint

Run TypeScript validation:

npm run typecheck

Run tests:

npm test

⸻

Required Validation Before Release

All must pass:

npm run lint
npm run typecheck
npm test
npm run build

Production release is blocked if any fail.

⸻

Database Setup

Database implementation uses:

supabase/migrations/001_v1_schema.sql
supabase/migrations/002_v1_rls.sql

Apply schema first:

001_v1_schema.sql

Then security:

002_v1_rls.sql

⸻

Development Seed

Synthetic development data exists in:

supabase/seed.sql

Seed data must never contain real LIFE OS information.

Production must not depend on synthetic seed data.

⸻

Real Personal Data

Real LIFE OS information must never be committed to GitHub.

Real data belongs only inside the protected production database.

Examples:

Real salary
Real investment quantities
Real financial commitments
Private goals
Private career data
Private personal memory

⸻

Recommended Initial Data Order

After production security is verified:

Profile
↓
Goals
↓
Projects
↓
Finance
↓
Investments
↓
Career
↓
Learning
↓
Tasks
↓
Memory

Do not import every historic detail on day one.

⸻

AI Architecture

LIFE OS V1 exposes exactly seven logical AI tools:

get_dashboard_snapshot
get_finance_snapshot
get_investment_snapshot
get_goal_status
get_learning_status
simulate_decision
search_opportunities

The model cannot execute arbitrary SQL.

The model cannot choose arbitrary tools.

⸻

AI Chief of Staff

The central AI layer should help with:

Current situation
Priority selection
Goal conflicts
Next actions
Career development
Learning priorities
Financial pressure
Investment planning
Decision support
Development ideas

Default style:

Situation
Recommendation
Next Action

Responses should remain concise.

⸻

Top Priority Rule

LIFE OS should normally display no more than:

3

primary priorities at one time.

If one action clearly matters most, display one.

⸻

Decision Simulator

The Decision Simulator helps compare hypothetical choices.

Example:

Increase investments
+
Start master's degree
+
Plan travel

The simulator considers relevant structured LIFE OS data and produces limited scenarios.

Preferred output:

Option A
Option B
Best Choice
Main Trade-off
Next Action

The final decision always remains with the user.

⸻

Opportunity Search

Opportunity Search may research:

Courses
Certifications
Jobs
Educational programs
Professional programs
Development opportunities

V1 search is:

User initiated

not continuous autonomous monitoring.

⸻

Opportunity Boundary

LIFE OS V1 may research and recommend.

It must not automatically:

Apply for job
Register for course
Pay fees
Submit university application
Send external message

⸻

Finance

V1 finance focuses on planning.

It supports:

Income
Monthly allocations
Savings
Emergency fund
Travel savings
Investments
Monthly snapshots
Planned vs actual values

It is not a full accounting application.

⸻

Finance Formula

Conceptually:

Income
-
Planned Allocations
=
Available Amount

Authoritative calculations use deterministic TypeScript/PostgreSQL logic.

⸻

Investments

V1 investments support:

Assets
Transactions
Quantity
Average cost
Reference price
Monthly contribution target
Target quantity
Portfolio calculations
AI interpretation

⸻

Investment Boundary

V1 does not connect to brokerage execution.

There is no:

Buy execution
Sell execution
Automated trading
Automated transfer
Broker API credential

⸻

Goals

Goals may represent:

Finance
Investments
Career
Learning
Education
Business
Travel
Fitness
Personal
Other

Each goal focuses on:

Status
Progress
Target
Priority
Next Action

⸻

Projects

Projects represent larger multi-step initiatives.

Examples:

AI project
Master's degree
Business preparation
Professional development
Travel planning

V1 intentionally avoids complicated project-management features.

⸻

Tasks

Tasks represent concrete actions.

A task may connect to:

Goal
Project

Dashboard may surface urgent high-priority tasks.

⸻

Career

Career data supports:

Current role
Target roles
Skills
Achievements
Milestones
Development gaps

The objective is to help LIFE OS understand professional direction.

⸻

Learning

Learning data supports:

Courses
Certifications
Learning paths
Master's degree
University programs

AI should not recommend courses merely to create activity.

Learning recommendations must support actual goals.

⸻

Personal Memory

Long-term structured memory belongs in:

memory_items

Memory may contain:

Preferences
Important decisions
Constraints
Long-term plans
Recurring principles
Useful context

Memory must never contain credentials.

⸻

Conversation Storage

V1 does not permanently store every AI conversation.

Useful long-term information belongs in structured memory or saved recommendations.

This reduces:

* clutter
* privacy exposure
* uncontrolled database growth

⸻

Audit Log

Important application events may create safe audit records.

Examples:

Login
Goal created
Goal updated
Finance updated
Investment updated
AI recommendation
Decision simulation
Opportunity search
Security setting changed

Audit metadata must remain concise and secret-free.

⸻

UI Language

Primary application language:

Arabic

Primary direction:

RTL

⸻

UI Philosophy

The interface must favor:

Cards
Short lists
Simple tables
Clear progress
Clear status
Clear next action

Avoid:

Long paragraphs
Too many charts
Too many numbers
Crowded dashboards
Decorative complexity
Excessive notifications

⸻

Mobile

Mobile is a primary platform.

LIFE OS must work comfortably on:

iPhone
Tablet
Desktop

No critical feature may require desktop use.

⸻

Failure Isolation

If OpenAI is unavailable:

Finance still works
Investments still work
Goals still work
Projects still work
Career still works
Learning still works
Tasks still work

Only AI functionality should temporarily fail.

⸻

Safe Failure

If authoritative database data is unavailable:

LIFE OS must not allow AI to invent current values.

Expected behavior:

Data unavailable
↓
Show safe error
↓
Do not fabricate

⸻

Git Workflow

Primary branch:

main

Focused branches may be used when helpful.

Examples:

feature/database
feature/core
feature/ai
feature/ui
fix/security

⸻

Commit Style

Examples:

docs: add v1 specification
db: add v1 schema
db: enforce row level security
core: add validation
ai: add chief of staff
ui: add dashboard
test: verify calculations
fix: correct authentication flow

⸻

Continuous Integration

GitHub Actions runs:

Checkout
↓
Node.js 24
↓
npm ci
↓
npm run lint
↓
npm run typecheck
↓
npm test
↓
npm run build

Failure blocks release.

⸻

Deployment

Production deployment:

GitHub
↓
GitHub Actions
↓
Vercel
↓
LIFE OS

LIFE OS connects to:

Supabase
OpenAI

⸻

Production Verification

After deployment verify:

Login
MFA
Dashboard
Protected routes
Database access
Basic mutation
AI request
Logout

Deployment is considered complete only after the smoke test passes.

⸻

Backup Model

LIFE OS has two recovery categories.

Code

Recovered from:

GitHub
Git history
Vercel deployments

Personal Data

Recovered from:

Supabase backup
or
approved PostgreSQL logical backup

GitHub is never a personal-data backup.

⸻

File Freeze Protocol

Every manually maintained V1 file follows:

Plan
↓
Implement
↓
Review
↓
Validate
↓
Freeze

A frozen file is not casually reopened.

⸻

Freeze Exceptions

A frozen file may reopen only for:

Confirmed bug
Security vulnerability
Failed integration
Incorrect implementation
Dependency incompatibility

Security fixes always take priority over freeze convenience.

⸻

No Placeholder Rule

Frozen V1 implementation files may not contain:

TODO: secure later
TODO: implement later
fake authorization
temporary credentials
unfinished validation
fake production logic

Development seed data may be synthetic.

Production logic may not be fake.

⸻

V1 Out of Scope

Not included in V1:

Direct bank integration
Broker execution
Automatic stock trading
Gmail integration
Google Calendar integration
Google Drive integration
WhatsApp integration
Apple Health integration
Wearables
Automatic opportunity monitoring
Autonomous financial agents
Public registration
Multi-user SaaS
Subscriptions
Social features
Native iOS app
Native Android app
Real-estate management
Business management
Voice assistant
Automated financial transfers

These belong to future versions only after V1 is stable.

⸻

Documentation

Locked V1 documentation:

docs/V1_SPEC.md
docs/ARCHITECTURE.md
docs/SECURITY.md
docs/DATABASE.md
docs/OPERATIONS.md

Implementation must conform to these documents.

⸻

V1 Release Requirements

LIFE OS V1 is complete only when:

All 60 source files exist
Database schema applied
RLS enabled
MFA works
AAL2 enforcement works
Authentication works
Dashboard works
Goals work
Projects work
Finance works
Investments work
Career works
Learning works
Tasks work
AI Chief of Staff works
Decision Simulator works
Opportunity Search works
Audit Log works
Mobile layout works
No secrets exist in GitHub
Tests pass
CI passes
Production build passes
Deployment works
Production smoke test passes

⸻

Definition of Working

A feature is working only if it:

Loads correctly
Uses correct data
Validates input
Requires correct authentication
Respects authorization
Works on mobile
Handles empty state
Handles error state
Does not expose secrets

A beautiful page with fake backend logic is not complete.

⸻

Security Reminder

Never fix a problem by weakening another protection.

Never:

Disable RLS to fix database access
Disable MFA to fix login
Expose Service Role key to fix permissions
Move OpenAI key to browser to fix API access
Commit secrets to simplify deployment

Fix the actual cause.

⸻

LIFE OS Philosophy

LIFE OS is not designed to show everything.

It is designed to show:

What matters now.

The permanent product standard is:

Simple to read.
Safe to trust.
Useful to act on.
Intelligent underneath.

⸻

Version 1 Status

BUILD IN PROGRESS

Development follows the locked 60-file V1 manifest.

⸻

LIFE OS — Personal AI Operating System