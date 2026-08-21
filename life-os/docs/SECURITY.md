# LIFE OS — Version 1 Security Specification

**Project:** LIFE OS  
**Version:** 1.0  
**Document:** Security  
**Status:** LOCKED SECURITY BASELINE  
**Security Model:** Private Single-User / Defense in Depth  
**Data Sensitivity:** High  
**Primary Principle:** Security Before Convenience

---

# 1. Security Objective

LIFE OS stores and processes sensitive personal information.

Potential data includes:

- salary
- financial allocations
- savings
- investments
- career information
- education information
- goals
- projects
- personal plans
- personal memory
- AI recommendations
- activity history

The system must therefore be designed as a private high-sensitivity application.

Security is not an optional feature.

It is part of the architecture.

---

# 2. Core Security Principle

The permanent LIFE OS security rule is:

**AI Suggests → User Reviews → User Approves → System Executes**

Artificial intelligence must never become the final authority for sensitive actions.

---

# 3. Security Priorities

Security priorities are ordered as follows:

1. protect authentication
2. protect personal data
3. prevent unauthorized access
4. isolate secrets
5. restrict AI capabilities
6. validate all input
7. protect financial information
8. preserve data integrity
9. maintain auditability
10. recover safely from failure

---

# 4. Threat Model

Version 1 must protect against reasonable threats including:

- stolen password
- unauthorized account access
- stolen browser session
- exposed API key
- exposed environment variables
- accidental GitHub secret commit
- broken authorization
- database policy mistakes
- cross-user data exposure
- malicious form input
- malformed API requests
- SQL injection attempts
- XSS attempts
- prompt injection
- malicious web content
- AI hallucinated actions
- AI-generated unsafe tool arguments
- accidental deletion
- accidental public deployment
- dependency vulnerabilities
- unsafe logs
- excessive AI data exposure

---

# 5. Security Architecture

LIFE OS uses multiple independent security layers.

```text
PRIVATE OWNER
      ↓
PRIMARY LOGIN
      ↓
MFA / AAL2
      ↓
SECURE SESSION
      ↓
NEXT.JS PROXY
      ↓
SERVER AUTHENTICATION
      ↓
INPUT VALIDATION
      ↓
CONTROLLED DATA ACCESS
      ↓
POSTGRESQL RLS
      ↓
USER-OWNED DATA
```

AI operates through an additional restricted boundary:

```text
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
SAFE RESPONSE
      ↓
USER DECISION
```

---

# 6. Single-User Security Model

LIFE OS V1 is private and designed for one owner.

There is:

- no public signup
- no social user system
- no shared accounts
- no guest account
- no public profile
- no anonymous user data access

The production owner account is created intentionally through approved Supabase administration.

---

# 7. Public Registration

Public registration must be disabled.

The application must not expose:

- sign-up page
- create-account button
- public registration API
- anonymous account creation

Only the approved owner account may access LIFE OS V1.

---

# 8. Authentication Method

Production V1 uses:

**Email + Password + TOTP Multi-Factor Authentication**

Primary factor:

- email
- strong password

Second factor:

- authenticator application
- TOTP

Examples of compatible authenticators include standard TOTP authenticator applications.

SMS MFA is not required for V1.

---

# 9. MFA Requirement

MFA is mandatory for production use.

Authenticated data access requires:

`aal2`

An `aal1` session represents primary authentication only.

An `aal2` session represents successful multi-factor authentication.

Sensitive LIFE OS data must not become available until the session reaches `aal2`.

---

# 10. MFA Bootstrap

Initial account setup follows:

```text
Owner account created
↓
Primary authentication
↓
No verified TOTP factor detected
↓
TOTP enrollment
↓
User scans authenticator QR
↓
Challenge
↓
Verification
↓
Session reaches AAL2
↓
LIFE OS access
```

The application must never display protected personal data before successful required authentication.

---

# 11. MFA Recovery

Because LIFE OS is single-user, MFA recovery must be treated as an administrative security procedure.

Recovery must not rely on:

- secret codes committed to GitHub
- hardcoded bypasses
- hidden backdoor routes
- developer passwords
- security-question bypasses

If MFA access is lost, recovery must use approved Supabase account recovery or administrative procedures.

No custom authentication bypass is permitted.

---

# 12. Password Policy

The production owner password must be:

- unique to LIFE OS
- long
- difficult to guess
- stored in a trusted password manager

The password must not be:

- reused from another service
- stored in GitHub
- stored in `.env`
- stored in documentation
- stored in database application tables
- sent to OpenAI
- written to logs

Password verification is handled by the authentication provider.

LIFE OS application code must never store plaintext passwords.

---

# 13. Authentication Tokens

Authentication tokens are secrets.

The application must not:

- print tokens
- log tokens
- store tokens in application tables
- send tokens to OpenAI
- expose tokens through error messages
- manually copy tokens into client constants

Supabase SSR authentication mechanisms must be used as designed.

---

# 14. Server Authentication

Server-side authorization must use verified authentication information.

Preferred server verification:

`supabase.auth.getClaims()`

When refreshed user information from the Auth service is required:

`supabase.auth.getUser()`

Server authorization must not rely solely on:

`getSession()`

as proof of identity.

---

# 15. Authentication Assurance

Protected server operations must verify that the user:

1. is authenticated
2. is the intended owner
3. has the required authentication assurance

Production protected data operations require:

`aal2`

where technically applicable.

---

# 16. RLS MFA Enforcement

User-data tables use Row Level Security.

A restrictive policy must enforce the required authentication level.

Conceptual policy:

```sql
create policy "Require MFA"
on table_name
as restrictive
to authenticated
using (
  (select auth.jwt()->>'aal') = 'aal2'
);
```

Equivalent secure policy structures are acceptable when needed for specific commands.

The MFA restriction complements ownership policies.

It does not replace them.

---

# 17. Ownership Policy

Every user-owned row contains:

```text
user_id
```

The authenticated user may access only data where:

```text
user_id = auth.uid()
```

Typical ownership logic:

```sql
using (
  user_id = (select auth.uid())
)
```

Insert/update checks must also enforce correct ownership.

---

# 18. Defense-in-Depth Authorization

A protected request must not depend on one security mechanism.

Authorization layers include:

1. authentication
2. MFA
3. server-side user verification
4. validation
5. controlled data-access functions
6. PostgreSQL RLS

Failure of one application-level check must not automatically expose database rows.

---

# 19. Row Level Security

RLS must be enabled on all user-owned primary tables.

V1 tables:

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

No user-data table may operate in production without reviewed RLS.

---

# 20. RLS Default Position

The security posture is:

**Deny unless explicitly allowed.**

Creating a table does not automatically make it accessible.

Required operations must receive explicit policy coverage.

---

# 21. RLS Operations

Policies must explicitly consider:

- SELECT
- INSERT
- UPDATE
- DELETE

Read permission must not imply mutation permission.

Mutation permission must not imply access to another user's rows.

---

# 22. Foreign-Key Ownership

Relationships between entities must never allow cross-user references.

Example:

A task belonging to User A must not reference a goal belonging to User B.

Even though V1 is single-user, database design must preserve ownership integrity.

This protects future compatibility and prevents security mistakes.

---

# 23. Service Role Key

The Supabase Service Role key bypasses RLS.

Therefore:

**Normal LIFE OS application runtime must not use the Service Role key.**

It must never appear in:

- browser code
- public environment variables
- React components
- GitHub
- API responses
- AI prompts

Administrative operations using elevated credentials must remain outside normal V1 user flows.

---

# 24. Supabase Publishable Key

The Supabase publishable browser key may be used where designed for browser access.

Its safety depends on correct RLS.

The existence of a publishable key must never be interpreted as authorization.

Authorization is enforced by:

- authenticated JWT
- MFA requirements
- RLS

---

# 25. Secrets

Secrets include:

- `OPENAI_API_KEY`
- private API keys
- service-role credentials
- passwords
- access tokens
- refresh tokens
- recovery credentials
- private deployment credentials

Secrets must never be committed.

---

# 26. Environment Variables

V1 expected environment variables include:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
OPENAI_API_KEY
```

Only variables intentionally designed for browser exposure may begin with:

`NEXT_PUBLIC_`

`OPENAI_API_KEY` is server-only.

---

# 27. `.env.local`

Real secrets may exist locally in:

`.env.local`

This file must be ignored by Git.

It must never be committed.

---

# 28. `.env.example`

`.env.example` contains variable names only.

Example:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
OPENAI_API_KEY=
```

No real value may appear.

---

# 29. GitHub Secret Boundary

GitHub stores source code.

GitHub does NOT store LIFE OS secrets or personal records.

Forbidden in commits:

- real API keys
- real access tokens
- `.env.local`
- passwords
- authentication screenshots containing secrets
- recovery codes
- real financial exports
- personal database backups
- private identity documents

---

# 30. Secret Exposure Response

If a secret is accidentally committed:

1. assume it is compromised
2. revoke or rotate it immediately
3. replace the production secret
4. remove it from active code
5. review commit history exposure
6. review logs for misuse
7. document the event safely

Deleting the visible line alone is not sufficient.

---

# 31. Production HTTPS

Production LIFE OS must use HTTPS only.

Plain HTTP must not be used for authenticated production access.

Deployment must rely on valid TLS.

---

# 32. Security Headers

Production responses should apply appropriate baseline browser security headers.

Required baseline:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- strict `Referrer-Policy`
- restrictive `Permissions-Policy`
- HSTS in production HTTPS

A Content Security Policy may be enforced only after compatibility testing with the production Next.js deployment.

A broken CSP must not be blindly deployed.

---

# 33. Clickjacking

LIFE OS must not be embedded inside external frames.

Frame protection must deny unauthorized framing.

This reduces clickjacking risk.

---

# 34. Browser Permissions

LIFE OS V1 does not require browser access to:

- camera
- microphone
- location
- USB
- Bluetooth

Permissions Policy should deny unnecessary capabilities where practical.

---

# 35. Client-Side Security

Client-side code is considered visible to users.

Therefore client code must never contain:

- secret API keys
- private database credentials
- hidden admin passwords
- authorization secrets
- sensitive server logic

Obfuscation is not security.

---

# 36. Server-Side Security

Sensitive operations belong on the server.

Examples:

- OpenAI requests
- authenticated data mutations
- financial calculations
- investment calculations
- audit creation
- opportunity analysis
- decision simulation

The browser may request these operations.

It must not control their authorization.

---

# 37. Input Validation

Every external input is untrusted.

Validate:

- form values
- URL parameters
- search parameters
- JSON request bodies
- identifiers
- dates
- numbers
- AI tool arguments
- AI-generated structured output
- external opportunity data

Zod is the application validation layer.

---

# 38. Validation Order

Sensitive operations follow:

```text
INPUT
↓
VALIDATE
↓
AUTHENTICATE
↓
AUTHORIZE
↓
EXECUTE
↓
AUDIT
↓
RETURN
```

Invalid input must fail before sensitive processing.

---

# 39. Numeric Validation

Financial and investment inputs require strict numeric validation.

The application must reject:

- NaN
- Infinity
- malformed numbers
- values outside allowed bounds
- unsupported decimal precision

Authoritative monetary calculations must not use AI arithmetic.

---

# 40. Identifier Validation

Entity IDs must be validated before database use.

A valid identifier does not imply ownership.

Ownership must still be enforced through:

- authenticated query
- RLS

---

# 41. SQL Injection Protection

Application code must never construct SQL from:

- raw user strings
- AI-generated SQL
- external web content

Normal application queries use controlled Supabase/PostgreSQL interfaces.

AI-generated SQL execution is prohibited.

---

# 42. AI-Generated SQL

The AI must never receive a tool such as:

```text
execute_sql
```

or:

```text
run_query
```

that accepts arbitrary model-generated SQL.

AI access is restricted to explicit application tools.

---

# 43. Cross-Site Scripting

React's safe rendering behavior should be preserved.

Do not use:

`dangerouslySetInnerHTML`

for:

- AI responses
- user text
- opportunity search content
- external website content

Untrusted HTML must not be rendered directly.

---

# 44. Markdown and Rich Text

V1 does not require arbitrary HTML rendering.

If Markdown rendering is introduced within existing V1 files, it must:

- disable raw HTML
- sanitize output
- prohibit executable content

Plain structured text is preferred.

---

# 45. Cross-Site Request Forgery

Sensitive mutations must require an authenticated server context.

Route handlers performing state changes should verify expected request origin where appropriate.

Requests must use intended methods.

State-changing actions must not occur through simple unauthenticated GET requests.

---

# 46. API Content Type

AI API endpoints accept the intended structured content type.

Unexpected request formats should be rejected.

Primary expected type:

`application/json`

---

# 47. Request Size

AI routes must reject unreasonably large request bodies.

The application must not accept unlimited prompt or payload sizes.

V1 input should remain intentionally concise.

---

# 48. Abuse Protection

V1 is a single-user private application.

The application must still avoid uncontrolled AI usage.

Controls include:

- authenticated access
- no public API
- bounded request size
- bounded tool calls
- bounded AI output
- no infinite loops
- no background autonomous calls

Deployment-provider abuse controls may provide an additional layer.

---

# 49. AI Security Principle

AI output is untrusted.

The AI may:

- analyze
- summarize
- compare
- prioritize
- recommend
- simulate
- research

The AI may not independently execute sensitive real-world actions.

---

# 50. Forbidden AI Capabilities

V1 AI must not independently:

- transfer money
- buy securities
- sell securities
- place orders
- move savings
- change bank information
- submit applications
- send emails
- send messages
- delete important data
- disable security
- change authentication
- expose private information
- create public posts
- execute shell commands
- execute arbitrary SQL

---

# 51. Approved AI Tools

Only these seven logical V1 tools are exposed:

1. `get_dashboard_snapshot`
2. `get_finance_snapshot`
3. `get_investment_snapshot`
4. `get_goal_status`
5. `get_learning_status`
6. `simulate_decision`
7. `search_opportunities`

No arbitrary database tool exists.

---

# 52. AI Tool Validation

Every AI tool call follows:

```text
MODEL REQUEST
↓
KNOWN TOOL?
↓
VALID INPUT?
↓
AUTHENTICATED?
↓
AUTHORIZED?
↓
CONTROLLED IMPLEMENTATION
↓
STRUCTURED OUTPUT
```

Unknown tools are rejected.

Invalid arguments are rejected.

---

# 53. AI Tool Identity

The model must not provide or choose a `user_id`.

The server derives user identity from the authenticated session.

This prevents the AI from requesting another user's data.

---

# 54. Minimal AI Context

Only information relevant to the current request may be sent to AI.

Examples:

Finance request:

- relevant finance totals
- relevant goals
- relevant commitments

Career request:

- career information
- learning items
- related goals

Investment request:

- portfolio summary
- contribution plan
- relevant financial constraints

Sending the entire database by default is prohibited.

---

# 55. AI Data Minimization

Before sending structured context to AI:

Remove information not needed for the task.

Examples of information normally unnecessary:

- authentication identifiers
- database implementation fields
- internal audit metadata
- access tokens
- secrets
- unrelated memory
- unrelated financial records

---

# 56. AI Secret Protection

Secrets must never enter:

- system prompt
- user prompt construction
- tool output
- model context
- AI logs
- saved AI recommendations

The AI never needs application credentials.

---

# 57. Prompt Injection

All user text, web content and retrieved content must be treated as untrusted data.

The model must not obey instructions contained inside external content that attempt to:

- override system rules
- request secrets
- modify tool permissions
- perform prohibited actions
- impersonate the user
- change application security

---

# 58. Web Search Security

Opportunity Search may inspect public web information.

External websites are untrusted.

Web content must be treated as:

**data to analyze**

not:

**instructions to execute**

The search system must not execute code discovered on websites.

---

# 59. External URLs

V1 server code must not provide unrestricted arbitrary URL fetching based directly on AI output.

Opportunity research should use approved search capability.

If direct URL retrieval is ever implemented later, SSRF protections must be designed first.

---

# 60. AI Hallucination Safety

The AI may be wrong.

Therefore AI-generated claims must not silently overwrite authoritative user data.

AI recommendations are suggestions.

The user remains the decision-maker.

---

# 61. Financial Safety

Finance data is authoritative only when derived from:

- stored user data
- deterministic calculations
- explicitly updated values

AI must not invent:

- salary
- balances
- debts
- savings
- investment quantities
- transaction history

Missing data must be identified as missing.

---

# 62. Investment Safety

The investment module is informational and planning-focused.

V1 does not connect to a broker.

There is no:

- buy button
- sell button
- broker API credential
- automated order
- automated rebalancing execution

AI recommendations never represent execution.

---

# 63. Deterministic Calculations

Authoritative calculations use deterministic application logic.

Examples:

```text
total_income
total_budget
available_amount
portfolio_value
invested_amount
estimated_gain_loss
allocation_percentage
```

AI may explain these values.

AI must not be the calculator of record.

---

# 64. Data Encryption

Production traffic must use encryption in transit through HTTPS.

Database encryption at rest is provided through the managed infrastructure configuration.

Application code must not invent weak custom encryption.

---

# 65. Sensitive Data in URLs

Sensitive information must not be placed in URLs.

Avoid:

```text
?salary=
?password=
?token=
?investment_balance=
```

URLs may appear in:

- browser history
- logs
- analytics
- referrers

Sensitive form data belongs in appropriate request bodies or protected storage.

---

# 66. Logging Security

Logs must be minimal.

Never log:

- password
- OTP
- TOTP secret
- QR enrollment secret
- access token
- refresh token
- OpenAI key
- service-role key
- full private financial dataset
- complete personal memory
- full sensitive AI context

---

# 67. Error Logging

Technical server errors may be logged safely.

Logs should contain only enough information to diagnose the failure.

Preferred information:

- safe error code
- route
- timestamp
- safe entity ID when needed
- operation name

---

# 68. User-Facing Errors

User-facing errors must not reveal implementation details.

Good:

```text
تعذر تحميل البيانات.
```

Good:

```text
انتهت الجلسة. سجل الدخول مرة أخرى.
```

Bad:

```text
Postgres policy violation on schema public...
```

Bad:

```text
OPENAI_API_KEY missing from...
```

---

# 69. Stack Traces

Production UI must never display stack traces.

Stack traces may exist in controlled developer/server diagnostics where appropriate.

---

# 70. Audit Log

Important security and application actions create audit records.

Examples:

- login
- authentication failure when appropriate
- MFA enrollment
- MFA verification
- security setting change
- financial record update
- investment record update
- goal mutation
- AI recommendation
- decision simulation
- opportunity search

---

# 71. Audit Safety

Audit logs must never become a second secret database.

Do not store:

- credentials
- tokens
- raw OTP values
- full prompts
- full AI context
- complete financial datasets

Audit information should be concise and safe.

---

# 72. Audit Mutability

The normal user interface treats the audit log as read-only.

Application workflows must not casually edit historical audit entries.

---

# 73. Personal Memory Security

Memory may contain sensitive context.

Memory must not contain:

- passwords
- recovery codes
- API keys
- access tokens
- authentication secrets
- bank login credentials
- broker passwords

Memory is for useful personal context, not credentials.

---

# 74. GitHub Repository

Repository:

`life-os`

Visibility:

**Private**

Primary branch:

`main`

The repository contains application code only.

---

# 75. GitHub Account Security

The GitHub account controlling LIFE OS should use:

- strong unique password
- MFA
- secure recovery configuration

Repository security is part of LIFE OS security.

---

# 76. Branch Protection

When supported and practical, `main` should be protected from accidental destructive changes.

At minimum:

- CI should run
- failed CI must be visible
- force pushes should be avoided
- destructive history rewriting should be avoided

---

# 77. GitHub Secrets

If GitHub Actions later requires secrets, use:

**GitHub Actions Secrets**

Do not place secrets inside:

`.github/workflows/ci.yml`

---

# 78. Secret Scanning

GitHub secret-detection protections should be enabled where available.

Automated detection complements manual review.

It does not replace careful secret management.

---

# 79. Dependency Security

Dependencies increase attack surface.

V1 must minimize package count.

Every dependency must have a clear purpose.

Avoid:

- abandoned packages
- unnecessary utility libraries
- large UI frameworks without need
- unknown packages copied from tutorials

---

# 80. Dependency Locking

`package-lock.json` is generated and committed.

Production/CI installation uses:

```text
npm ci
```

This provides reproducible dependency resolution.

---

# 81. Dependency Updates

Dependencies should not be blindly upgraded.

Update process:

1. inspect update
2. review security notes
3. install
4. run lint
5. run type check
6. run tests
7. run production build
8. deploy only if valid

---

# 82. Vulnerability Handling

Known exploitable high-impact dependency vulnerabilities must be addressed before production release.

A security fix may reopen a frozen implementation file under the V1 freeze exception.

---

# 83. CI Security

CI must never print environment secrets.

Pull Request or push validation should include:

- clean dependency installation
- lint
- TypeScript validation
- tests
- production build

Security-sensitive test failures block release.

---

# 84. Build Security

Production build must not contain server-only secrets in client bundles.

Client/server module boundaries must be respected.

Server-only environment variables must never be imported into browser code.

---

# 85. Deployment Security

Production LIFE OS must be intentionally deployed.

Deployment must not accidentally become a public information site.

Authentication remains required regardless of whether the deployment URL is discoverable.

A secret URL is not an authentication mechanism.

---

# 86. Vercel Environment Variables

Production secrets belong in protected deployment environment configuration.

Environment separation should distinguish:

- local
- preview
- production

Production secrets must not be exposed to untrusted preview environments unnecessarily.

---

# 87. Preview Deployment

Preview deployments must not contain production personal data unless explicitly secured and necessary.

Development should use synthetic data where possible.

---

# 88. Database Environments

Development testing should avoid unnecessary use of production personal data.

Schema and RLS behavior must be reproducible from version-controlled migrations.

---

# 89. Database Migration Security

Schema security is defined through migrations.

Manual production changes that bypass repository migration history should be avoided.

RLS changes require the same care as application security changes.

---

# 90. Database Constraints

Security is strengthened by data integrity.

Database constraints should enforce:

- required fields
- valid status values
- valid ownership
- valid relationships
- reasonable numerical rules

Application validation alone is not sufficient.

---

# 91. Delete Security

Deletion is a sensitive action.

Important deletions should require explicit user intent.

The AI cannot independently delete records.

Database cascade rules must be deliberately defined.

---

# 92. Mass Deletion

V1 must not expose an unguarded:

```text
Delete Everything
```

operation.

Any future account-wide destruction flow requires separate security design.

---

# 93. Backup Security

Database backups contain sensitive information.

Backups must not be:

- committed to GitHub
- uploaded to public storage
- sent to AI
- stored casually on shared devices

Backup procedures are documented in:

`docs/OPERATIONS.md`

---

# 94. Recovery Principle

Recovery must prioritize:

1. preserving account security
2. restoring authoritative data
3. avoiding secret exposure
4. validating integrity after restore

---

# 95. Device Security

Because LIFE OS is a personal system, the security of the user's device matters.

Recommended:

- device passcode
- biometric device lock
- current OS updates
- automatic screen lock
- secure password manager
- MFA protection

LIFE OS must not attempt to replace device security.

---

# 96. Shared Device Rule

Do not intentionally remain logged into LIFE OS on an untrusted shared device.

Logout must invalidate the local authenticated experience according to Supabase session behavior.

---

# 97. Session Handling

Sessions must be handled through supported Supabase SSR authentication.

The application must not create a custom homemade authentication-token system.

---

# 98. Session Expiration

Expired or invalid sessions must fail closed.

Behavior:

```text
Session invalid
↓
Protected request denied
↓
Redirect to login
```

The application must not continue showing newly requested private data after authentication is invalid.

---

# 99. Stale Browser State

Client-side cached visual state must never override server authorization.

If server authentication fails, stale client information must not be treated as authorized current data.

---

# 100. Cache Security

Personal authenticated content must not leak through shared caching.

Do not publicly cache:

- Dashboard
- finance
- investments
- goals
- memory
- audit
- AI responses

Private data is user-specific.

---

# 101. AI Response Storage

Saved AI recommendations must contain only the useful recommendation.

Do not automatically store:

- full hidden prompts
- complete context
- raw provider payload
- secrets
- unrelated personal data

---

# 102. AI Conversation Scope

V1 assistant interaction is task-oriented.

The application should not build an uncontrolled permanent transcript containing every private detail.

Structured memory remains the preferred long-term knowledge source.

---

# 103. Opportunity Search Data

Opportunity search results may include untrusted public information.

Search results must never directly mutate:

- goals
- learning
- career
- finance

The user decides whether an opportunity becomes part of LIFE OS.

---

# 104. AI Recommendation Approval

A recommendation may have statuses:

- new
- reviewed
- accepted
- dismissed

`accepted` means:

**the user agrees with the recommendation**

It does not mean:

**an external real-world action has executed**

---

# 105. Security-Sensitive Settings

Changes related to:

- authentication
- MFA
- security
- protected account configuration

require explicit user action.

AI may explain.

AI may not silently change them.

---

# 106. File Uploads

General file upload is out of scope for V1.

The application must not expose an unfinished file-upload surface.

This avoids unnecessary:

- malware risk
- storage risk
- content-type risk
- privacy complexity

---

# 107. Public Sharing

V1 does not contain public sharing.

No button should publicly share:

- Dashboard
- finance
- investments
- goals
- AI recommendation
- career profile
- memory

Future sharing features require separate security review.

---

# 108. Analytics

Third-party behavioral analytics are not required in V1.

Personal LIFE OS data must not be sent to advertising analytics systems.

Minimal operational platform metrics may be used when they do not contain sensitive personal content.

---

# 109. Advertising

LIFE OS V1 contains no advertising.

Personal financial or behavioral data must not be prepared for advertiser use.

---

# 110. Data Minimization

Do not collect information only because it might be useful someday.

Store information when it supports a defined LIFE OS function.

Less unnecessary data means lower security risk.

---

# 111. Privacy by Default

Default behavior must favor privacy.

Examples:

- private repository
- authenticated application
- no public profile
- no sharing
- no public API
- no public registration
- minimal AI context
- synthetic seed data

---

# 112. Security Failure Principle

When uncertain:

**Fail Closed**

Examples:

Unknown authentication state:

deny access.

Invalid AI tool call:

reject.

Failed RLS expectation:

do not expose data.

Missing authoritative finance data:

do not invent value.

---

# 113. OpenAI Failure

If the AI provider fails:

Core LIFE OS remains usable.

The application must not weaken security to restore AI functionality.

No AI availability problem justifies exposing secrets or bypassing authorization.

---

# 114. Supabase Failure

If the database/authentication provider fails:

- private data request fails safely
- AI must not invent current data
- application displays a short error
- no authorization bypass occurs

---

# 115. Authentication Provider Failure

If authentication cannot be verified:

Protected access is denied.

Availability is secondary to confidentiality.

---

# 116. Security Testing

V1 security tests must cover at minimum:

- unauthenticated access rejection
- protected-route behavior
- validation rejection
- prohibited AI actions
- unsafe tool arguments
- secret exposure assumptions
- ownership assumptions
- calculation input validation

Database RLS must also be tested before production.

---

# 117. RLS Verification

Before production release, verify:

- RLS enabled
- ownership policies active
- unauthenticated reads fail
- unauthenticated writes fail
- incorrect-owner reads fail
- incorrect-owner writes fail
- valid owner access succeeds
- required MFA restriction succeeds

Do not assume policy correctness from SQL appearance alone.

---

# 118. MFA Verification

Before production release, verify:

```text
AAL1
→ protected personal data denied

AAL2
→ authorized owner data allowed
```

This is a required production security test.

---

# 119. Secret Verification

Before release:

Search repository for:

- API key patterns
- `.env`
- passwords
- bearer tokens
- private credentials

Production release is blocked if a real secret is found.

---

# 120. Client Bundle Verification

Before release, verify browser-delivered JavaScript does not contain:

- `OPENAI_API_KEY`
- service-role credential
- passwords
- private server configuration

---

# 121. Production Security Checklist

Before LIFE OS V1 production release:

- [ ] Repository is private
- [ ] Public Supabase signup is disabled
- [ ] Owner account exists
- [ ] Strong unique password is configured
- [ ] TOTP MFA is enrolled
- [ ] AAL2 enforcement is tested
- [ ] RLS is enabled on all user tables
- [ ] Ownership policies are tested
- [ ] Service Role key is absent from application runtime
- [ ] No real secrets exist in GitHub
- [ ] `.env.local` is ignored
- [ ] Production uses HTTPS
- [ ] Security headers are configured
- [ ] AI tools are restricted
- [ ] AI cannot execute financial actions
- [ ] AI context is minimized
- [ ] Error messages are safe
- [ ] Logs contain no secrets
- [ ] Audit logging works
- [ ] Tests pass
- [ ] CI passes
- [ ] Production build passes

---

# 122. Incident Response

If suspicious access or exposure occurs:

1. stop sensitive use if necessary
2. revoke compromised sessions
3. rotate exposed credentials
4. reset compromised password
5. review MFA
6. inspect audit information
7. inspect deployment logs safely
8. inspect database activity
9. patch the cause
10. test the fix
11. redeploy
12. document the incident safely

---

# 123. Lost Device Response

If an authenticated device is lost:

1. revoke relevant sessions
2. change password if appropriate
3. verify MFA factors
4. review recent audit events
5. rotate secrets only if there is evidence they were exposed

---

# 124. Compromised GitHub Account

If GitHub access is compromised:

1. secure GitHub account
2. revoke unknown sessions/tokens
3. inspect repository changes
4. inspect Actions configuration
5. verify deployment integrity
6. rotate any possibly exposed deployment secret
7. rebuild from trusted source

---

# 125. Compromised Supabase Account

If Supabase administrative access is compromised:

1. secure provider account
2. revoke unknown sessions
3. inspect Auth users
4. inspect database policies
5. inspect recent database changes
6. rotate affected project secrets
7. validate RLS
8. redeploy trusted configuration

---

# 126. Compromised OpenAI Key

If OpenAI API key exposure is suspected:

1. revoke the key
2. create a replacement
3. update local/deployment secret
4. verify GitHub does not contain the key
5. review unexpected usage
6. redeploy

---

# 127. Security Freeze Exception

Any frozen LIFE OS file may be reopened when required to fix:

- confirmed vulnerability
- authentication flaw
- authorization flaw
- secret exposure
- unsafe AI capability
- broken RLS
- critical dependency vulnerability
- data-integrity security issue

Security fixes take priority over the normal freeze rule.

---

# 128. Security Change Rule

A security change must not quietly weaken another control.

Example:

Do not disable RLS to fix a query.

Do not bypass MFA to fix login.

Do not expose a Service Role key to fix permissions.

Do not move OpenAI calls to the browser to fix a server issue.

Fix the root cause.

---

# 129. No Security Placeholders

The following are prohibited in a frozen V1 implementation:

```text
TODO: add auth later
TODO: secure this later
temporary admin bypass
allow all RLS policy
hardcoded password
hardcoded API key
fake authorization
disabled validation
```

Security implementation must be real before freeze.

---

# 130. Security Philosophy

LIFE OS contains enough personal context that it must behave more like a private personal system than a normal public website.

The permanent security philosophy is:

**Minimum Access  
Minimum Data  
Minimum AI Authority  
Maximum User Control**

---

# 131. Final Trust Boundary

The user may trust LIFE OS to:

- store structured personal data
- calculate deterministic values
- organize information
- provide recommendations
- support decisions

The user must never be required to trust AI with unrestricted power.

---

# 132. Final Security Model

```text
OWNER
↓
PASSWORD
↓
TOTP MFA
↓
AAL2
↓
SERVER AUTH
↓
VALIDATION
↓
RLS
↓
STRUCTURED PRIVATE DATA
↓
CONTROLLED AI CONTEXT
↓
RESTRICTED AI TOOLS
↓
RECOMMENDATION
↓
OWNER APPROVAL
```

---

# 133. Security Standard

The LIFE OS standard is:

**Private by default.  
Authenticated by default.  
MFA protected.  
RLS protected.  
Secrets isolated.  
AI restricted.  
User controlled.**

---

# SECURITY STATUS

**LOCKED FOR VERSION 1**

This document defines the mandatory LIFE OS V1 security baseline.

Security requirements may become stronger during V1 if a genuine vulnerability is discovered.

They must not become weaker for convenience.

---

**END OF LIFE OS V1 SECURITY SPECIFICATION**