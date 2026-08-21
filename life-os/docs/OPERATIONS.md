LIFE OS — Version 1 Operations Specification

Project: LIFE OS
Version: 1.0
Document: Operations
Status: LOCKED OPERATIONS BASELINE
Application Runtime: Node.js 24 LTS
Package Manager: npm
Hosting: Vercel
Database & Auth: Supabase
Source Control: GitHub
AI Provider: OpenAI
Primary Environment: Production Private Single User

⸻

1. Operations Objective

This document defines how LIFE OS V1 is:

* developed
* tested
* deployed
* configured
* monitored
* backed up
* restored
* maintained
* recovered after failure

The operational objective is:

Simple operation with safe recovery.

LIFE OS must remain manageable by one owner without enterprise infrastructure complexity.

⸻

2. Core Operations Principle

The operational rule is:

Source Controlled → Tested → Deployed → Verified → Recoverable

No production change is considered complete until it is verified.

⸻

3. Operational Priorities

Order of priority:

1. protect user data
2. protect authentication
3. preserve recoverability
4. maintain application correctness
5. maintain availability
6. maintain AI functionality
7. optimize convenience

Data protection takes priority over availability.

⸻

4. Runtime Standard

LIFE OS V1 uses:

Node.js 24 LTS

The project must not use an End-of-Life Node.js release.

⸻

5. Package Manager

V1 uses:

npm

Dependency files:

package.json
package-lock.json

The lock file is committed to GitHub.

⸻

6. Dependency Installation

Normal local dependency installation:

npm install

CI and reproducible validation use:

npm ci

npm ci must use the committed lock file without rewriting dependency resolution.

⸻

7. Application Commands

The V1 package.json must provide these operational commands:

npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm test

Purpose:

dev
→ local development
build
→ production build validation
start
→ run built application
lint
→ code quality validation
typecheck
→ TypeScript validation
test
→ automated V1 tests

⸻

8. Three Environments

LIFE OS recognizes three environments:

Development
Preview
Production

They must remain logically separated.

⸻

9. Development Environment

Purpose:

* coding
* testing
* schema verification
* UI development
* AI development

Development should use:

* synthetic data
* non-production credentials
* non-production database where practical

Real LIFE OS financial or personal data should not be required for normal development.

⸻

10. Preview Environment

Purpose:

Validate changes before production.

Preview deployments may be created from non-production branches.

Preview must not automatically receive production personal data.

Preview environment variables must be explicitly configured.

⸻

11. Production Environment

Production is:

the real private LIFE OS

Production contains:

* real owner account
* real personal data
* real AI configuration
* production database
* production authentication
* production deployment

Production access requires the security controls defined in:

docs/SECURITY.md

⸻

12. Environment Separation Rule

Never assume:

Development = Production

or:

Preview = Production

Each environment must have intentionally configured variables.

⸻

13. Source of Truth

GitHub repository:

life-os

is the source of truth for:

* application code
* documentation
* database migrations
* tests
* CI configuration

GitHub is NOT the source of truth for personal data.

⸻

14. Main Branch

Production source branch:

main

main represents the latest approved production-ready source.

⸻

15. Development Branches

When useful, development may use focused branches.

Examples:

feature/database
feature/core
feature/ai
feature/ui
fix/security
fix/integration

Branch complexity should remain minimal.

⸻

16. Commit Standard

Commits should describe one meaningful change.

Examples:

docs: add operations specification
db: add v1 schema
security: enforce rls
core: add validation
ai: add chief of staff
ui: add finance page
test: verify calculations
fix: correct authentication flow

⸻

17. Frozen File Rule

A file completed under the V1 Freeze Protocol is not casually modified.

Reopening is allowed only for:

* confirmed bug
* security issue
* failed integration
* dependency incompatibility
* incorrect V1 implementation

A reopened file must be revalidated before being frozen again.

⸻

18. Local Setup

A clean development environment follows:

Clone repository
↓
Install Node.js 24 LTS
↓
Run npm ci
↓
Create .env.local
↓
Configure development credentials
↓
Run npm run dev

⸻

19. Local Environment File

Real local values belong in:

.env.local

This file must never be committed.

⸻

20. Environment Template

Repository file:

.env.example

contains variable names only.

Required V1 variables:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
OPENAI_API_KEY=

⸻

21. Production Environment Variables

Production values are configured through Vercel project environment settings.

They are not stored in GitHub.

⸻

22. Environment Scope

Vercel environment variables must use the correct scope:

Development
Preview
Production

Production secrets should not automatically be exposed to Preview.

⸻

23. Secret Variable Rule

Server-only secrets must not use:

NEXT_PUBLIC_

Example:

OPENAI_API_KEY

must remain server-only.

⸻

24. Public Configuration

Only browser-safe configuration may use:

NEXT_PUBLIC_

The Supabase publishable key is allowed because authorization remains enforced by authenticated claims and RLS.

⸻

25. Secret Change

After changing a deployment environment variable:

A new deployment must be created before assuming the application uses the updated value.

⸻

26. Vercel Project

Production hosting uses one LIFE OS Vercel project connected to:

GitHub → life-os

Production branch:

main

⸻

27. Deployment Flow

Normal deployment flow:

Code Change
↓
Local Validation
↓
Git Commit
↓
GitHub
↓
GitHub Actions
↓
CI Pass
↓
Merge / Push to main
↓
Vercel Production Deployment
↓
Production Verification

⸻

28. Preview Flow

For larger changes:

Feature Branch
↓
Push to GitHub
↓
CI
↓
Vercel Preview
↓
Verify
↓
Merge to main
↓
Production

⸻

29. Production Deployment Rule

Never intentionally deploy a known failing build.

Production requires:

lint = PASS
typecheck = PASS
tests = PASS
build = PASS

⸻

30. CI Pipeline

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

Any failure fails CI.

⸻

31. CI Environment

CI must not require real production personal data.

Tests use:

* synthetic values
* deterministic fixtures
* controlled environment configuration

⸻

32. CI Secrets

If CI eventually requires secrets, they belong in:

GitHub Actions Secrets

They must never be written directly into:

.github/workflows/ci.yml

⸻

33. Production Verification

After every production deployment verify:

Login works
MFA works
Dashboard loads
Protected routes remain protected
Database reads work
Basic mutation works
AI endpoint responds
No obvious console/server error exists

⸻

34. Smoke Test

Minimum production smoke test:

1. Open LIFE OS
2. Authenticate
3. Reach Dashboard
4. Open one data module
5. Verify current data
6. Open AI Assistant
7. Run one safe request
8. Confirm logout/session behavior

⸻

35. Deployment Completion

A deployment is not operationally complete when Vercel says:

Ready

It is complete when:

Deployment Ready
+
Smoke Test Passed

⸻

36. Database Deployment Principle

Database structure is managed through migrations.

V1 migration order:

001_v1_schema.sql
↓
002_v1_rls.sql
↓
seed.sql only in safe development context

⸻

37. Production Seed Rule

Production must not automatically run:

supabase/seed.sql

The seed contains synthetic development data.

⸻

38. Production Schema Changes

Production schema changes must originate from source-controlled migration files.

Do not casually edit production tables manually.

⸻

39. Migration Safety

Before applying a production database migration:

Verify migration
↓
Verify backup/recovery availability
↓
Review SQL
↓
Apply migration
↓
Verify schema
↓
Verify RLS
↓
Verify application

⸻

40. Migration Backup Rule

Before any future destructive or high-impact database migration:

Create or confirm a recent recoverable backup.

Do not perform destructive schema changes without a recovery path.

⸻

41. Migration Rollback Principle

Application rollback and database rollback are separate operations.

Rolling Vercel back to an older deployment does NOT automatically restore the database schema or data.

Compatibility must be considered before database changes.

⸻

42. Database Compatibility Rule

Future database migrations should prefer backward-compatible changes when possible.

Example:

Prefer:

add new nullable column

before immediately requiring new code behavior.

Avoid unnecessary destructive schema changes.

⸻

43. Backup Strategy

LIFE OS requires two independent recovery categories:

CODE RECOVERY
+
DATA RECOVERY

⸻

44. Code Recovery

Code recovery comes from:

GitHub
+
Git history
+
Vercel previous deployments

Application code does not need to be backed up inside the database.

⸻

45. Data Recovery

Personal LIFE OS data requires database backup.

Recovery capability depends on the configured Supabase plan and backup features.

The system must never assume GitHub contains user data.

⸻

46. Managed Database Backup

Where the active Supabase plan provides managed backups:

Use Supabase managed backup capability as the primary provider-level database recovery method.

Backup availability must be verified before production reliance.

⸻

47. Logical Backup

A logical database backup may be created using supported Supabase/PostgreSQL tooling.

Preferred supported method:

supabase db dump

or approved equivalent PostgreSQL dump tooling.

⸻

48. Independent Backup Rule

LIFE OS should maintain an independent logical backup periodically when operationally practical.

Especially important when provider-plan recovery capability is limited.

⸻

49. Backup Frequency

V1 baseline:

Before high-impact database change
→ Backup required
Normal production use
→ Verify backup state weekly
Independent logical backup
→ At least monthly
If managed recovery is unavailable
→ Independent logical backup at least weekly

⸻

50. Backup Storage

A downloaded database backup contains sensitive information.

It must be stored only in:

* private encrypted storage
* trusted encrypted device storage
* secure private backup location

⸻

51. Forbidden Backup Locations

Do not store personal database backups in:

GitHub
public cloud folder
public link
email attachment archive
AI conversation
unprotected USB device
shared computer

⸻

52. Backup File Handling

Backup filenames may include safe operational dates.

Example:

life-os-db-2026-08-22.dump

Do not include sensitive financial details in filenames.

⸻

53. Backup Verification

A backup that has never been verified is not fully trusted.

Periodically confirm:

* file exists
* file is readable
* expected size is plausible
* recovery procedure is understood

⸻

54. Restore Principle

Database restoration is a high-impact operation.

Normal sequence:

Identify Failure
↓
Stop Unsafe Writes if Needed
↓
Determine Recovery Point
↓
Confirm Backup
↓
Restore
↓
Verify Database
↓
Verify Authentication
↓
Verify RLS
↓
Verify Application

⸻

55. Restore Downtime

Database restoration may temporarily make the project unavailable.

Do not repeatedly send writes during restoration.

⸻

56. Restore Verification

After a database restore verify:

Owner authentication
MFA
All 14 tables
Expected records
RLS
Goals
Finance
Investments
Projects
Tasks
Audit
Application connectivity

⸻

57. Application Rollback

If a production application deployment is defective but the database remains compatible:

Use Vercel deployment rollback to return traffic to a known-good deployment.

⸻

58. Rollback Rule

Before application rollback ask:

Did this release change database structure?

If:

No

application rollback is normally straightforward.

If:

Yes

database compatibility must be checked first.

⸻

59. Never Blindly Roll Back

Do not assume:

Old Code + New Database = Safe

Compatibility must be verified.

⸻

60. Failed Deployment

If the new deployment does not become healthy:

Do not modify production data
↓
Inspect build/runtime failure
↓
Use previous known-good deployment if needed
↓
Fix source code
↓
Run full validation
↓
Redeploy

⸻

61. AI Provider Failure

OpenAI failure must not stop LIFE OS core modules.

During AI outage:

Dashboard data = available
Finance = available
Investments = available
Goals = available
Projects = available
Learning = available
Tasks = available
AI features = temporary unavailable

⸻

62. AI Failure Message

User-facing AI failure should remain simple.

Example:

تعذر تشغيل المساعد الذكي الآن. بيانات LIFE OS محفوظة ولم تتأثر.

⸻

63. AI Retry Rule

No uncontrolled automatic retry loops.

A failed AI request may be retried deliberately.

⸻

64. AI Cost Operations

OpenAI usage should be reviewed periodically.

V1 avoids:

* background AI loops
* autonomous recurring agents
* unnecessary full-database context
* oversized outputs

⸻

65. AI Key Rotation

If the OpenAI API key is suspected compromised:

Revoke old key
↓
Create new key
↓
Update deployment secret
↓
Update local secret
↓
Redeploy
↓
Verify
↓
Review unexpected usage

⸻

66. Supabase Failure

If Supabase is unavailable:

LIFE OS must not invent current data.

Expected behavior:

Private data unavailable
AI dependent on current data restricted
Safe error shown
No authorization bypass

⸻

67. Authentication Failure

If authentication verification fails:

Deny protected access

Do not weaken MFA or RLS to restore convenience.

⸻

68. Vercel Failure

If Vercel production infrastructure is temporarily unavailable:

Do not change database security.

Wait for hosting recovery or use provider-supported deployment recovery procedures.

Availability failure does not justify bypassing authentication.

⸻

69. GitHub Failure

If GitHub is temporarily unavailable:

Existing deployed LIFE OS may continue operating.

Do not attempt unsafe source replacement.

Resume normal development when source control is available.

⸻

70. Credential Exposure

Any accidentally exposed credential is treated as compromised.

Procedure:

Revoke
↓
Rotate
↓
Update Environment
↓
Redeploy
↓
Review Logs
↓
Verify Repository

⸻

71. Secret in Git History

Removing a secret from the latest file is not sufficient.

If a real secret entered Git history:

* rotate the secret immediately
* inspect repository exposure
* clean history if necessary
* verify deployment configuration

The rotated secret is the primary protection.

⸻

72. Production Database Editing

Direct manual edits to real records through Supabase Dashboard should be exceptional.

Normal data changes occur through LIFE OS.

Administrative repair is allowed when:

* application cannot perform required recovery
* data correction is necessary
* action is understood
* backup exists when appropriate

⸻

73. Manual Production Repair

Before direct production repair:

Identify exact record
↓
Understand impact
↓
Backup if high impact
↓
Make minimum change
↓
Verify
↓
Record safe operational note

⸻

74. No Experimentation in Production

Production is not the place for:

* experimental SQL
* unknown scripts
* copied internet commands
* test accounts
* fake finance data
* experimental AI permissions

Experiment elsewhere first.

⸻

75. Monitoring Scope

V1 uses simple monitoring.

Required operational visibility:

* GitHub Actions status
* Vercel deployment status
* Vercel runtime errors
* Supabase project status
* database health
* LIFE OS Audit Log
* OpenAI usage/failures

No large monitoring platform is required.

⸻

76. Error Review

When an error occurs:

Identify whether it belongs to:

Application
Authentication
Database
AI
Deployment
Network

Fix the correct layer.

⸻

77. Audit Review

The LIFE OS Audit page should be reviewed when:

* unexpected data changed
* security concern occurs
* important action is unclear
* incident investigation is required

⸻

78. Weekly Operations Check

Normal weekly operational review should remain short.

Check:

Application opens
Authentication works
Recent backup state is acceptable
No failing deployment
No critical security alert
AI usage looks normal

Target:

a few minutes, not an administrative burden

⸻

79. Monthly Operations Check

Once per month review:

Dependencies
Backup state
Supabase status
Vercel status
OpenAI usage
GitHub security
Production errors
Database growth

⸻

80. Dependency Update Rule

Do not upgrade dependencies just because a newer version exists.

Update when:

* security fix exists
* compatibility requires it
* important bug fix exists
* meaningful supported improvement exists

⸻

81. Dependency Update Procedure

Review Update
↓
Create Branch
↓
Update Dependency
↓
npm ci
↓
Lint
↓
Typecheck
↓
Tests
↓
Build
↓
Preview
↓
Merge
↓
Production Verify

⸻

82. Major Dependency Upgrade

Major framework upgrades are not routine maintenance.

Examples:

Next.js major
React major
Supabase auth architecture change
OpenAI API architecture change

These require explicit review.

⸻

83. Security Updates

A confirmed important security update has priority over the normal V1 Freeze Protocol.

Security can reopen a frozen file.

⸻

84. Node.js Updates

V1 remains on:

Node.js 24 LTS

within its supported major release.

Security/maintenance updates within the supported Node 24 line are allowed.

⸻

85. Node Major Change

Do not move LIFE OS to another Node major version during V1 unless:

* Node 24 becomes unsupported
* critical compatibility requires it
* security requires it

Such a change requires full CI and production validation.

⸻

86. Database Growth

V1 data volume is expected to remain small.

Do not prematurely optimize storage.

Monitor only if:

* query performance noticeably degrades
* audit history grows substantially
* database provider reports resource pressure

⸻

87. Audit Retention

V1 keeps audit history unless a genuine operational reason requires a retention policy.

Audit logs are expected to remain small for a single-user application.

⸻

88. AI Recommendation Retention

Unnecessary AI responses should not be stored.

Only useful saved recommendations remain in the database.

This reduces:

* storage
* clutter
* privacy exposure

⸻

89. Personal Data Review

Real LIFE OS data should be entered gradually.

Recommended sequence:

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

This allows verification before adding more sensitive information.

⸻

90. Initial Production Launch

Production launch must start with minimum required information.

Do not import every historic personal detail on day one.

The system should prove reliability first.

⸻

91. Go-Live Sequence

Create Production Supabase Project
↓
Configure Auth
↓
Apply Schema Migration
↓
Apply RLS Migration
↓
Verify MFA/AAL2
↓
Configure Vercel
↓
Configure Environment Variables
↓
Deploy
↓
Run Security Tests
↓
Run Smoke Test
↓
Enter Initial Real Data
↓
Verify Backup
↓
V1 Live

⸻

92. Production Data Rule

Real personal data enters only after:

Authentication = PASS
MFA = PASS
RLS = PASS
Production Build = PASS

⸻

93. Recovery Levels

Operational incidents are classified simply.

Level 1 — Minor

Example:

* one page rendering problem
* temporary AI failure

Action:

Fix normally.

Level 2 — Significant

Example:

* production deployment broken
* authentication problem
* major application bug

Action:

Stop affected use, rollback/fix.

Level 3 — Critical

Example:

* credential exposure
* unauthorized access
* corrupted financial data
* broken RLS
* lost database records

Action:

Secure first, recover second.

⸻

94. Critical Incident Rule

During a critical incident:

Do not prioritize keeping the site online over protecting data.

It is acceptable for LIFE OS to be temporarily unavailable.

⸻

95. Security Incident Procedure

Identify
↓
Contain
↓
Revoke Access if Needed
↓
Rotate Credentials
↓
Preserve Evidence
↓
Assess Data
↓
Fix Root Cause
↓
Test
↓
Restore
↓
Verify

⸻

96. Data Corruption Procedure

If incorrect data appears:

Do not immediately overwrite large areas.

First determine:

Is this UI display error?
Is this calculation error?
Is database value actually wrong?
How many records are affected?
When did it begin?

Then choose the smallest safe correction.

⸻

97. Financial Data Error

Financial correctness is high priority.

If calculated totals appear wrong:

Stop relying on displayed total
↓
Verify stored inputs
↓
Verify deterministic calculation
↓
Run tests
↓
Correct logic/data
↓
Recalculate
↓
Verify

AI explanation must not override deterministic correction.

⸻

98. Investment Data Error

If an investment position appears wrong:

Verify:

quantity
average cost
reference price
transactions
calculation

Do not let AI invent replacement values.

⸻

99. MFA Loss

If the owner loses authenticator access:

Use approved Supabase recovery/administrative procedure.

Do not create:

* hidden bypass
* temporary no-MFA production route
* hardcoded recovery password

⸻

100. Lost Device

If a device containing an authenticated LIFE OS session is lost:

Secure device account if possible
↓
Revoke active sessions
↓
Review account
↓
Review audit
↓
Change password if appropriate
↓
Verify MFA

⸻

101. Repository Compromise

If GitHub account/repository integrity is compromised:

Secure GitHub
↓
Review commits
↓
Review workflow files
↓
Review deployment integration
↓
Rotate possibly exposed secrets
↓
Restore trusted source state
↓
Redeploy

⸻

102. Deployment Compromise

If unexpected Vercel configuration or deployment appears:

Secure Vercel account
↓
Review deployment history
↓
Review domains
↓
Review environment variables
↓
Rotate affected secrets
↓
Promote known-good deployment

⸻

103. Supabase Compromise

If Supabase administrative access may be compromised:

Secure Supabase
↓
Review Auth users
↓
Review RLS
↓
Review database changes
↓
Review API configuration
↓
Rotate affected secrets
↓
Verify data

⸻

104. Recovery Order

After a major incident restore in this order:

Authentication
↓
Database Security
↓
Database Integrity
↓
Application
↓
AI
↓
Convenience Features

⸻

105. Application Recovery Without AI

LIFE OS must be capable of operating as a structured personal management system even when AI is disabled.

This is an intentional recovery capability.

⸻

106. No Automatic Destructive Recovery

LIFE OS must not automatically:

* restore database
* delete records
* rotate production credentials
* roll back migrations

without explicit operator action.

⸻

107. Cost Operations

V1 should remain cost-conscious.

Monitor:

* Supabase plan usage
* Vercel usage
* OpenAI API usage

Avoid adding paid infrastructure without a clear need.

⸻

108. Backup Cost Decision

Advanced Point-in-Time Recovery is optional, not mandatory for V1.

Use it only if the value of tighter recovery justifies its cost.

The minimum requirement is:

a tested recovery path appropriate to the active Supabase plan.

⸻

109. Provider Plan Changes

Operational documents should not depend on provider pricing remaining unchanged.

If plan features change:

Preserve the required capability:

Private hosting
Secure database
Recoverable data
Authenticated access

Choose the provider option that continues to satisfy these requirements.

⸻

110. Domain

A custom domain is optional in V1.

The system may safely operate on an assigned Vercel domain if all authentication/security requirements are met.

A custom domain does not provide authentication.

⸻

111. Production URL

Production URL is treated as potentially discoverable.

Security must not depend on nobody knowing the URL.

⸻

112. Search Indexing

LIFE OS is a private authenticated application.

No public content should intentionally expose personal information to search engines.

Authentication remains the real protection.

⸻

113. Browser Support

V1 production testing prioritizes:

* current Safari on iPhone
* current Chrome
* modern desktop browser

Mobile usability is mandatory.

⸻

114. iPhone Verification

Before V1 release verify on iPhone:

Login
MFA
Navigation
Dashboard
Forms
Tables
AI Assistant
Logout

No critical workflow may require desktop use.

⸻

115. Production Logging

Production logs should be retained only as needed for operation and debugging.

Never intentionally log:

* full finance data
* full investment portfolio
* memory contents
* credentials
* full AI context

⸻

116. Debug Mode

Do not enable verbose sensitive debug output in production.

Development debugging behavior must not silently become production behavior.

⸻

117. Error Resolution Rule

Do not solve one operational failure by weakening security.

Forbidden examples:

Disable RLS because query failed
Disable MFA because login failed
Expose service role key because write failed
Move OpenAI key to browser because API failed

Fix the root cause.

⸻

118. Change Discipline

Normal production change order:

Understand
↓
Change
↓
Test
↓
Review
↓
Deploy
↓
Verify

Avoid:

Guess
↓
Change Production
↓
Hope

⸻

119. Emergency Change

Emergency production changes are allowed only when required to restore:

* security
* data integrity
* critical functionality

Afterward:

* document the change
* reconcile source control
* run validation
* restore normal deployment process

⸻

120. V1 Operations Completion

Operations are considered ready when:

* Node.js runtime is fixed
* npm workflow works
* GitHub is connected
* CI works
* Vercel deployment works
* Production variables exist
* Supabase works
* Authentication works
* MFA works
* RLS works
* backup path is verified
* restore procedure is understood
* application rollback is understood
* AI failure does not break core system
* incident procedure is understood

⸻

121. Final Operational Model

GITHUB
  ↓
CI
  ↓
VERCEL
  ↓
LIFE OS
  ↓
SUPABASE
LIFE OS
  ↓
OPENAI
RECOVERY:
GitHub / Vercel
→ Application
Supabase Backup
→ Personal Data

⸻

122. Daily User Experience

Operations must remain mostly invisible to the user.

The normal LIFE OS experience is simply:

Open
↓
Authenticate
↓
See Priorities
↓
Use LIFE OS
↓
Close

Infrastructure should not create unnecessary daily administration.

⸻

123. Operations Philosophy

LIFE OS should be:

Easy to run.
Hard to expose.
Easy to recover.
Hard to corrupt.

⸻

124. Final Operations Rule

The goal is not maximum infrastructure.

The goal is:

minimum infrastructure that can be trusted.

⸻

OPERATIONS STATUS

LOCKED FOR VERSION 1

This document defines the LIFE OS V1 operational baseline.

Changes may occur only when required by:

* security
* provider incompatibility
* failed recovery testing
* production correctness
* critical operational discovery

Routine preference is not sufficient.

⸻

END OF LIFE OS V1 OPERATIONS SPECIFICATION