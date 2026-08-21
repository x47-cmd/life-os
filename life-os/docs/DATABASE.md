LIFE OS — Version 1 Database Specification

Project: LIFE OS
Version: 1.0
Document: Database
Status: LOCKED DATABASE DESIGN
Database: PostgreSQL via Supabase
Primary User Model: Private Single User
Primary Currency: AED
Data Model: Relational / User-Owned / RLS Protected

⸻

1. Database Objective

The LIFE OS database is the authoritative structured source of truth for Version 1.

It stores:

* personal profile settings
* income
* budget allocations
* monthly financial snapshots
* investment assets
* investment transactions
* goals
* projects
* tasks
* learning and education
* career development
* structured personal memory
* AI recommendations
* audit events

The database must remain:

* simple
* relational
* secure
* deterministic
* understandable
* easy to migrate
* easy to back up

⸻

2. Core Database Principle

The permanent database rule is:

PostgreSQL stores facts.
Application code calculates facts.
AI interprets facts.

AI must never become the authoritative database.

⸻

3. Version 1 Table Count

LIFE OS V1 contains exactly:

14 primary tables

1. profiles
2. income_sources
3. budget_items
4. monthly_snapshots
5. investment_assets
6. investment_transactions
7. goals
8. projects
9. tasks
10. learning_items
11. career_items
12. memory_items
13. ai_recommendations
14. audit_logs

No additional primary application table is required for V1.

⸻

4. Database Schema

Application tables use:

public

Authentication users are managed by Supabase Auth in:

auth.users

Application code must not create its own password table.

⸻

5. Primary Key Strategy

Most application records use:

uuid

Primary key generation:

gen_random_uuid()

Exception:

profiles

uses the authenticated Supabase user ID directly as:

user_id

⸻

6. User Ownership

Every primary table contains:

user_id uuid

The value references:

auth.users(id)

User ownership is mandatory.

⸻

7. Ownership Deletion

If the Supabase Auth owner account is administratively deleted:

All LIFE OS user-owned records may be deleted through:

ON DELETE CASCADE

V1 does not expose account deletion through the normal application UI.

Account-wide deletion is an administrative operation.

⸻

8. Cross-User Relationship Protection

A child record must never reference a parent record owned by another user.

Relationships therefore preserve both:

user_id
+
entity_id

where appropriate.

Conceptual rule:

child.user_id = parent.user_id

Application validation and database relationships must both preserve this rule.

⸻

9. Status Implementation

V1 uses:

TEXT + CHECK constraints

for bounded statuses and categories.

PostgreSQL custom enums are intentionally avoided in V1.

Reasons:

* simpler migrations
* easier future changes
* easier rollback
* clear constraints
* less schema coupling

⸻

10. Money Storage

Authoritative monetary values use:

numeric(14,2)

They must not use:

real
float
double precision

for authoritative financial calculations.

⸻

11. Investment Precision

Investment quantities use:

numeric(20,8)

Investment prices and average costs use:

numeric(20,6)

This supports fractional quantities and precise prices.

⸻

12. Currency Storage

Currency is stored as a three-letter ISO-style code.

Example:

AED
USD
EUR

Database type:

text

Constraint concept:

^[A-Z]{3}$

Currency symbols are not stored in financial amount fields.

⸻

13. Time Storage

Use:

date

when only a calendar date matters.

Use:

timestamptz

for events and system timestamps.

Examples:

target_date → date

created_at → timestamptz

⸻

14. Timezone

The user profile stores a preferred timezone.

Default V1 timezone:

Asia/Dubai

Database event timestamps remain timezone-aware.

Display conversion occurs in application formatting logic.

⸻

15. Standard Timestamps

Most mutable tables contain:

created_at timestamptz
updated_at timestamptz

Both default to:

now()

updated_at is maintained automatically through a shared database trigger.

⸻

16. Updated Timestamp Function

Migration 001 creates one shared trigger function:

set_updated_at()

Purpose:

Automatically set:

updated_at = now()

before record updates.

This prevents inconsistent timestamp handling across application code.

⸻

17. Audit Timestamp

audit_logs is append-oriented.

It contains:

created_at

It does not require:

updated_at

Historical audit events must not normally be edited.

⸻

18. Table — profiles

Purpose:

Store non-secret owner preferences and application configuration.

Primary key:

user_id

Columns:

Column	Type	Rule
user_id	uuid	Primary key, references auth.users(id)
display_name	text	Optional
default_currency	text	Required, default AED
timezone	text	Required, default Asia/Dubai
locale	text	Required, default ar-AE
created_at	timestamptz	Required
updated_at	timestamptz	Required

Rules:

* one profile per authenticated user
* no password fields
* no tokens
* no API keys
* no TOTP secrets

⸻

19. profiles Constraints

Required constraints:

default_currency matches three uppercase letters
timezone is not blank
locale is not blank

user_id references:

auth.users(id)

with:

ON DELETE CASCADE

⸻

20. Table — income_sources

Purpose:

Store current and planned sources of income.

Examples:

* salary
* allowance
* bonus
* other recurring income

Columns:

Column	Type
id	uuid
user_id	uuid
name	text
amount	numeric(14,2)
frequency	text
is_active	boolean
next_expected_date	date nullable
notes	text nullable
created_at	timestamptz
updated_at	timestamptz

⸻

21. income_sources Frequency

Allowed values:

monthly
annual
one_time
other

Default:

monthly

⸻

22. income_sources Rules

Required:

name is not blank
amount >= 0

Default:

is_active = true

The application may calculate a monthly equivalent where useful.

The stored amount remains the amount associated with the selected frequency.

⸻

23. Table — budget_items

Purpose:

Store planned recurring or one-time allocations.

Examples:

* household expense
* debt payment
* personal spending
* travel saving
* emergency saving
* investment contribution
* education

Columns:

Column	Type
id	uuid
user_id	uuid
name	text
category	text
item_type	text
amount	numeric(14,2)
frequency	text
due_day	smallint nullable
is_active	boolean
notes	text nullable
created_at	timestamptz
updated_at	timestamptz

⸻

24. budget_items Categories

Allowed categories:

family
housing
debt
transport
personal
travel
emergency
investments
education
business
other

⸻

25. budget_items Types

Allowed values:

expense
saving
investment
debt

This allows deterministic grouping.

⸻

26. budget_items Frequency

Allowed values:

monthly
annual
one_time
other

Default:

monthly

⸻

27. budget_items Rules

Required:

name is not blank
amount >= 0

If due_day exists:

1 <= due_day <= 31

Default:

is_active = true

⸻

28. Table — monthly_snapshots

Purpose:

Preserve a monthly summary of the user’s financial position.

A snapshot is not a transaction ledger.

It represents a summarized monthly state.

Columns:

Column	Type
id	uuid
user_id	uuid
month	date
total_income	numeric(14,2)
total_budget	numeric(14,2)
total_savings	numeric(14,2)
total_investments	numeric(14,2)
available_amount	numeric(14,2)
emergency_fund_balance	numeric(14,2)
travel_savings_balance	numeric(14,2)
notes	text nullable
created_at	timestamptz
updated_at	timestamptz

⸻

29. monthly_snapshots Uniqueness

Only one snapshot exists per user per month.

Unique constraint:

(user_id, month)

⸻

30. monthly_snapshots Month Rule

month represents the first calendar day of the month.

Example:

2026-08-01

not:

2026-08-22

Database validation must enforce this convention.

⸻

31. monthly_snapshots Numeric Rules

The following values must be non-negative:

total_income
total_budget
total_savings
total_investments
emergency_fund_balance
travel_savings_balance

available_amount may be negative.

This allows the system to represent financial pressure accurately.

⸻

32. Snapshot Calculation

Conceptually:

available_amount
=
total_income
-
total_budget

The exact budget composition is calculated by deterministic application logic.

AI must not calculate the authoritative snapshot.

⸻

33. Table — investment_assets

Purpose:

Represent each tracked investment position.

Examples:

* stock
* ETF
* sukuk
* fund

Columns:

Column	Type
id	uuid
user_id	uuid
ticker	text
name	text
market	text
asset_type	text
currency	text
quantity	numeric(20,8)
average_cost	numeric(20,6)
reference_price	numeric(20,6) nullable
monthly_contribution_target	numeric(14,2) nullable
target_quantity	numeric(20,8) nullable
is_active	boolean
notes	text nullable
created_at	timestamptz
updated_at	timestamptz

⸻

34. investment_assets Types

Allowed values:

stock
etf
sukuk
fund
cash
other

⸻

35. investment_assets Rules

Required:

ticker is not blank
name is not blank
market is not blank
quantity >= 0
average_cost >= 0
reference_price >= 0 when present
monthly_contribution_target >= 0 when present
target_quantity >= 0 when present

Default:

currency = AED
is_active = true

⸻

36. investment_assets Uniqueness

A tracked instrument must be unique per market for the user.

Unique constraint:

(user_id, ticker, market)

Ticker normalization should use uppercase application values.

⸻

37. Investment Position Calculations

Application code calculates:

estimated_value
=
quantity × reference_price

Conceptually:

cost_basis
=
quantity × average_cost

And:

estimated_gain_loss
=
estimated_value - cost_basis

These calculated values do not need duplicate authoritative storage in the asset row.

⸻

38. Table — investment_transactions

Purpose:

Preserve investment activity history.

Columns:

Column	Type
id	uuid
user_id	uuid
asset_id	uuid
transaction_type	text
transaction_date	date
quantity	numeric(20,8) nullable
unit_price	numeric(20,6) nullable
total_amount	numeric(14,2)
fees	numeric(14,2)
notes	text nullable
created_at	timestamptz
updated_at	timestamptz

⸻

39. investment_transactions Types

Allowed values:

buy
sell
dividend
fee
adjustment

Supporting sell does not mean LIFE OS recommends selling.

It allows accurate historical recording if such an event occurs.

⸻

40. investment_transactions Rules

Required:

total_amount >= 0
fees >= 0

When provided:

quantity >= 0
unit_price >= 0

Default:

fees = 0

⸻

41. Investment Transaction Ownership

A transaction must belong to an investment asset owned by the same user.

Relationship concept:

(user_id, asset_id)
→
investment_assets(user_id, id)

Cross-user asset references are prohibited.

⸻

42. Investment Asset Deletion

An investment asset containing transactions must not be casually deleted.

Relationship behavior:

ON DELETE RESTRICT

The user must intentionally resolve transaction history before deleting the parent asset.

This protects financial history.

⸻

43. Table — goals

Purpose:

Store major personal and professional objectives.

Columns:

Column	Type
id	uuid
user_id	uuid
title	text
category	text
description	text nullable
target_value	numeric(18,4) nullable
current_value	numeric(18,4) nullable
unit	text nullable
progress_percent	smallint
target_date	date nullable
priority	text
status	text
next_action	text nullable
sort_order	integer
created_at	timestamptz
updated_at	timestamptz

⸻

44. Goal Categories

Allowed values:

finance
investments
career
learning
education
business
travel
fitness
personal
other

⸻

45. Goal Status

Allowed values:

planned
active
paused
completed
cancelled

⸻

46. Goal Priority

Allowed values:

low
medium
high

⸻

47. Goal Rules

Required:

title is not blank
0 <= progress_percent <= 100
sort_order >= 0

Defaults:

progress_percent = 0
priority = medium
status = planned
sort_order = 0

⸻

48. Goal Progress

progress_percent supports goals that cannot be represented only by numeric target values.

If both:

target_value
current_value

exist, application code may calculate or suggest progress.

Authoritative progress remains explicitly stored after validated update.

⸻

49. Table — projects

Purpose:

Store multi-step initiatives.

Columns:

Column	Type
id	uuid
user_id	uuid
goal_id	uuid nullable
title	text
description	text nullable
category	text
status	text
progress_percent	smallint
priority	text
start_date	date nullable
target_date	date nullable
next_action	text nullable
created_at	timestamptz
updated_at	timestamptz

⸻

50. Project Categories

Allowed values:

ai
career
education
finance
investments
business
travel
fitness
personal
other

⸻

51. Project Status

Allowed values:

planned
active
blocked
paused
completed
cancelled

⸻

52. Project Priority

Allowed values:

low
medium
high

⸻

53. Project Rules

Required:

title is not blank
0 <= progress_percent <= 100

Defaults:

progress_percent = 0
priority = medium
status = planned

⸻

54. Project → Goal Relationship

A project may belong to one primary goal.

Relationship:

(user_id, goal_id)
→
goals(user_id, id)

A project may exist without a goal.

⸻

55. Goal Deletion With Projects

A referenced goal must not be silently removed.

Relationship behavior:

ON DELETE RESTRICT

The application must first:

* unlink project
    or
* intentionally resolve the relationship

before deleting the goal.

⸻

56. Table — tasks

Purpose:

Store clear actionable next steps.

Columns:

Column	Type
id	uuid
user_id	uuid
goal_id	uuid nullable
project_id	uuid nullable
title	text
notes	text nullable
priority	text
status	text
due_date	date nullable
completed_at	timestamptz nullable
created_at	timestamptz
updated_at	timestamptz

⸻

57. Task Status

Allowed values:

pending
active
completed
cancelled

⸻

58. Task Priority

Allowed values:

low
medium
high

⸻

59. Task Rules

Required:

title is not blank

Defaults:

priority = medium
status = pending

A task may exist without a goal or project.

⸻

60. Task Relationships

Optional goal relationship:

(user_id, goal_id)
→
goals(user_id, id)

Optional project relationship:

(user_id, project_id)
→
projects(user_id, id)

Cross-user relationships are prohibited.

⸻

61. Task Parent Deletion

Goals or projects referenced by tasks use:

ON DELETE RESTRICT

The relationship must be explicitly resolved before parent deletion.

This prevents accidental loss of context.

⸻

62. Task Completion

When a task becomes:

completed

application logic should set:

completed_at

When moved away from completed status:

completed_at

may be cleared.

⸻

63. Table — learning_items

Purpose:

Manage education, courses and professional learning.

Columns:

Column	Type
id	uuid
user_id	uuid
goal_id	uuid nullable
title	text
provider	text nullable
item_type	text
status	text
priority	text
progress_percent	smallint
start_date	date nullable
target_date	date nullable
completed_date	date nullable
url	text nullable
cost	numeric(14,2) nullable
currency	text
notes	text nullable
created_at	timestamptz
updated_at	timestamptz

⸻

64. Learning Types

Allowed values:

course
certification
learning_path
masters
university_program
other

⸻

65. Learning Status

Allowed values:

planned
active
completed
paused
dropped

⸻

66. Learning Priority

Allowed values:

low
medium
high

⸻

67. Learning Rules

Required:

title is not blank
0 <= progress_percent <= 100
cost >= 0 when present

Defaults:

status = planned
priority = medium
progress_percent = 0
currency = AED

⸻

68. Learning → Goal Relationship

A learning item may support a goal.

Relationship:

(user_id, goal_id)
→
goals(user_id, id)

Deletion behavior:

ON DELETE RESTRICT

The application must explicitly unlink before deleting a referenced goal.

⸻

69. Table — career_items

Purpose:

Store structured career development information.

Instead of creating separate V1 tables for skills, roles and achievements, V1 uses one controlled career table.

Columns:

Column	Type
id	uuid
user_id	uuid
goal_id	uuid nullable
item_type	text
title	text
description	text nullable
status	text
priority	text
rating	smallint nullable
event_date	date nullable
target_date	date nullable
evidence_url	text nullable
notes	text nullable
created_at	timestamptz
updated_at	timestamptz

⸻

70. Career Item Types

Allowed values:

current_role
target_role
skill
achievement
milestone
gap

⸻

71. Career Status

Allowed values:

active
planned
completed
archived

⸻

72. Career Priority

Allowed values:

low
medium
high

⸻

73. Career Rating

Optional rating may represent a simple level or confidence score.

When present:

1 <= rating <= 5

It must not be presented as scientifically precise.

⸻

74. Career Rules

Required:

title is not blank

Defaults:

status = active
priority = medium

⸻

75. Career → Goal Relationship

A career item may support a goal.

Relationship:

(user_id, goal_id)
→
goals(user_id, id)

Deletion behavior:

ON DELETE RESTRICT

⸻

76. Table — memory_items

Purpose:

Store structured long-term context useful to LIFE OS.

Examples:

* preferences
* long-term rules
* important decisions
* constraints
* recurring personal principles
* long-term plans

Columns:

Column	Type
id	uuid
user_id	uuid
category	text
title	text
content	text
importance	text
is_active	boolean
created_at	timestamptz
updated_at	timestamptz

⸻

77. Memory Categories

Allowed values:

finance
investments
career
learning
education
projects
travel
fitness
personal
preference
constraint
decision
other

⸻

78. Memory Importance

Allowed values:

low
medium
high

Defaults:

importance = medium
is_active = true

⸻

79. Memory Rules

Required:

title is not blank
content is not blank

Memory must not contain credentials.

Forbidden examples:

* passwords
* API keys
* access tokens
* recovery codes
* TOTP secrets
* bank login credentials

⸻

80. Memory Architecture

V1 memory is structured relational data.

V1 does not use:

* vector embeddings
* vector database
* automatic transcript memory
* uncontrolled conversation storage

Relevant memory is selected using deterministic filters and application logic.

⸻

81. Table — ai_recommendations

Purpose:

Store useful AI recommendations that the user may review later.

Columns:

Column	Type
id	uuid
user_id	uuid
category	text
title	text
recommendation	text
priority	text
status	text
related_entity_type	text nullable
related_entity_id	uuid nullable
reviewed_at	timestamptz nullable
created_at	timestamptz
updated_at	timestamptz

⸻

82. AI Recommendation Categories

Allowed values:

general
finance
investments
goals
projects
career
learning
education
travel
fitness
opportunity
decision

⸻

83. AI Recommendation Priority

Allowed values:

low
medium
high

⸻

84. AI Recommendation Status

Allowed values:

new
reviewed
accepted
dismissed

Default:

new

⸻

85. AI Recommendation Rules

Required:

title is not blank
recommendation is not blank

AI recommendation content must remain concise.

Do not store:

* entire AI provider payload
* hidden system prompts
* entire personal context
* access credentials
* complete web pages

⸻

86. AI Recommendation Relationships

related_entity_type and related_entity_id provide a lightweight optional reference.

V1 intentionally does not create polymorphic foreign keys.

Supported entity types may include:

goal
project
learning
career
investment
task

Application code validates these references.

⸻

87. Table — audit_logs

Purpose:

Store concise append-only records of important actions.

Columns:

Column	Type
id	uuid
user_id	uuid
action	text
entity_type	text nullable
entity_id	uuid nullable
metadata	jsonb
created_at	timestamptz

⸻

88. Audit Rules

Required:

action is not blank

Default:

metadata = {}

Audit rows do not contain:

updated_at

⸻

89. Audit Metadata

Metadata must be:

* small
* structured
* safe
* non-secret

Good example:

{
  "status": "completed"
}

Bad example:

{
  "password": "...",
  "access_token": "...",
  "full_financial_database": "..."
}

⸻

90. Audit Mutation Policy

Normal application behavior:

INSERT
SELECT

Audit logs should not expose routine:

UPDATE
DELETE

through the application UI.

This preserves historical integrity.

⸻

91. Standard Parent Ownership Keys

For entities referenced by child tables, migration 001 provides unique ownership pairs where required.

Conceptual examples:

goals(user_id, id)
projects(user_id, id)
investment_assets(user_id, id)

These allow composite ownership-preserving foreign keys.

⸻

92. Relationship Map

erDiagram
    AUTH_USERS ||--|| PROFILES : owns
    AUTH_USERS ||--o{ INCOME_SOURCES : owns
    AUTH_USERS ||--o{ BUDGET_ITEMS : owns
    AUTH_USERS ||--o{ MONTHLY_SNAPSHOTS : owns
    AUTH_USERS ||--o{ INVESTMENT_ASSETS : owns
    AUTH_USERS ||--o{ GOALS : owns
    AUTH_USERS ||--o{ PROJECTS : owns
    AUTH_USERS ||--o{ TASKS : owns
    AUTH_USERS ||--o{ LEARNING_ITEMS : owns
    AUTH_USERS ||--o{ CAREER_ITEMS : owns
    AUTH_USERS ||--o{ MEMORY_ITEMS : owns
    AUTH_USERS ||--o{ AI_RECOMMENDATIONS : owns
    AUTH_USERS ||--o{ AUDIT_LOGS : owns
    INVESTMENT_ASSETS ||--o{ INVESTMENT_TRANSACTIONS : contains
    GOALS ||--o{ PROJECTS : supports
    GOALS ||--o{ TASKS : supports
    GOALS ||--o{ LEARNING_ITEMS : supports
    GOALS ||--o{ CAREER_ITEMS : supports
    PROJECTS ||--o{ TASKS : contains

⸻

93. Foreign Key Deletion Rules

Default user ownership relationship:

auth.users
→
user-owned table
ON DELETE CASCADE

Parent business relationships generally use:

ON DELETE RESTRICT

for:

* goal → project
* goal → task
* goal → learning item
* goal → career item
* project → task
* investment asset → transaction

This prevents silent history loss.

⸻

94. Why RESTRICT

LIFE OS prioritizes deliberate deletion.

Example:

If a goal still has:

* projects
* tasks
* learning items

the goal should not disappear silently.

The application should first:

1. show related records
2. unlink or resolve them
3. then allow deletion

⸻

95. Index Strategy

V1 adds only useful indexes.

Every user-owned table requires an index beginning with:

user_id

where not already provided effectively by a primary/unique constraint.

⸻

96. Common Query Indexes

Important query patterns include:

user + status
user + target date
user + created date
user + month
user + category

Indexes should support real V1 queries without excessive duplication.

⸻

97. Required Index Concepts

Examples include:

income_sources(user_id, is_active)
budget_items(user_id, is_active)
monthly_snapshots(user_id, month)
investment_assets(user_id, is_active)
investment_transactions(user_id, asset_id, transaction_date)
goals(user_id, status, priority)
projects(user_id, status, priority)
tasks(user_id, status, due_date)
learning_items(user_id, status, priority)
career_items(user_id, item_type, status)
memory_items(user_id, is_active, importance)
ai_recommendations(user_id, status, created_at)
audit_logs(user_id, created_at)

Exact SQL is implemented in migration 001.

⸻

98. Index Restraint

V1 must not create an index for every column.

Reasons:

* write overhead
* unnecessary complexity
* little benefit for a single-user dataset

Indexes must correspond to expected query patterns.

⸻

99. Dashboard Query Model

Dashboard uses consolidated data access.

It should not request individual rows unnecessarily.

The database layer provides the information required to calculate:

DashboardSnapshot

containing:

* month
* top priorities
* finance summary
* investment summary
* active goals
* active projects
* learning status
* urgent tasks
* latest AI recommendation

⸻

100. Top Priority Selection

Top priorities are derived from structured records such as:

* high-priority active goals
* high-priority active projects
* urgent tasks
* important AI recommendations

The application selects a maximum of:

3

for Dashboard display.

⸻

101. Finance Query Model

Finance data access reads:

income_sources
budget_items
monthly_snapshots

Application code calculates current planning values.

AI receives only summarized relevant results.

⸻

102. Investment Query Model

Investment data access reads:

investment_assets
investment_transactions

Application code calculates:

* estimated position value
* invested value
* gain/loss
* allocation
* progress toward targets

⸻

103. Goals Query Model

Primary filtering:

status
priority
target_date
category

Dashboard normally prioritizes:

active

goals.

⸻

104. Projects Query Model

Primary filtering:

status
priority
target_date
goal_id

Blocked projects are important AI context because they may require action.

⸻

105. Tasks Query Model

Primary filtering:

status
due_date
priority
project_id
goal_id

Dashboard urgent tasks should favor:

* overdue
* due soon
* high priority

⸻

106. Learning Query Model

Primary filtering:

status
priority
target_date
item_type
goal_id

AI should avoid recommending new learning when active learning workload is already excessive.

⸻

107. Career Query Model

Primary filtering:

item_type
status
priority
goal_id

This provides structured input for career recommendations.

⸻

108. Memory Query Model

Memory retrieval uses:

category
importance
is_active

Potential secondary ordering:

updated_at

V1 does not require semantic vector search.

⸻

109. AI Recommendation Query Model

Dashboard normally reads:

new

or relevant recent recommendations.

The user may mark recommendations as:

reviewed
accepted
dismissed

⸻

110. Audit Query Model

Audit page sorts primarily by:

created_at DESC

It should support bounded pagination.

The application must not load unlimited audit history in one request.

⸻

111. Pagination

Large history-style lists should use bounded results.

Examples:

* audit logs
* investment transactions
* AI recommendations

V1 does not require complex cursor infrastructure for every page.

Queries must still use safe limits.

⸻

112. Database Write Rule

All writes require:

1. validated input
2. authenticated user
3. correct user_id
4. RLS authorization
5. database constraints
6. safe error handling
7. audit where appropriate

⸻

113. user_id Assignment

The browser must not be trusted to choose authoritative ownership.

Server application code derives:

user_id

from the authenticated user.

For AI tools, the model never chooses user_id.

⸻

114. Database Read Rule

Every read containing private data requires authenticated context.

RLS remains active even when application code already filters by:

user_id

The application filter is convenience and clarity.

RLS is the security boundary.

⸻

115. RLS Migration

RLS implementation belongs in:

supabase/migrations/002_v1_rls.sql

Migration 001 defines structure.

Migration 002 defines access.

This separation is mandatory for V1 review.

⸻

116. MFA Database Enforcement

Production RLS must combine:

ownership
+
required authentication assurance

Protected personal rows require the appropriate authenticated aal2 state defined by the Security Specification.

⸻

117. Database Function Security

Database helper functions must use the least privilege possible.

Avoid unnecessary:

SECURITY DEFINER

functions.

The shared timestamp function does not require elevated privilege.

No database function may bypass RLS merely for convenience.

⸻

118. No Arbitrary SQL

LIFE OS application code does not provide:

* SQL console
* AI SQL executor
* query playground
* raw SQL API

Database migrations are controlled source files.

⸻

119. Seed Data

File:

supabase/seed.sql

contains synthetic data only.

Seed data exists for:

* development
* UI verification
* testing

⸻

120. Forbidden Seed Data

Never include real:

* salary
* investment portfolio
* debts
* personal names when sensitive
* private travel plans
* authentication information
* CV contents
* personal memory
* API keys

Seed data must be fictional.

⸻

121. Production Data Entry

Real LIFE OS information enters through:

* authenticated application forms
* explicitly approved setup processes

not through GitHub commits.

⸻

122. Data Validation Layers

Database integrity uses multiple layers.

UI
↓
Zod
↓
Server
↓
Database constraints
↓
RLS

A failure in UI validation must not allow invalid database state.

⸻

123. Null Strategy

Fields are nullable only when absence is meaningful.

Examples:

target_date
notes
reference_price
goal_id
project_id

Core identifying values such as:

user_id
title
status

must not be nullable where required by the entity.

⸻

124. Empty Strings

Application validation should reject meaningless empty strings for required textual values.

Database checks should protect important names and titles from blank-only values where practical.

⸻

125. Text Length

V1 should apply reasonable application-level length limits.

Examples:

* titles remain short
* notes remain bounded
* AI recommendations remain concise

The database may use PostgreSQL text rather than arbitrary varchar limits.

Zod provides user-facing length validation.

⸻

126. Financial History

Monthly snapshots preserve summarized financial history.

Updating current salary or current budget must not rewrite previous monthly snapshots automatically.

History represents the state captured for that month.

⸻

127. Investment History

Investment transactions preserve event history.

Changing an asset’s current:

reference_price

must not modify previous transaction prices.

⸻

128. Average Cost

average_cost is stored on the current asset position for efficient display.

Transaction history remains available as supporting data.

Application logic is responsible for updating current position calculations consistently.

⸻

129. Reference Price

reference_price is a manually maintained or explicitly researched reference in V1.

It is not guaranteed to be live market data.

The UI must not label it as real-time unless a future verified integration provides real-time pricing.

⸻

130. Snapshot Immutability Principle

Monthly snapshots may be corrected by the authenticated user when genuine data-entry errors exist.

They must not be automatically rewritten every time current plans change.

⸻

131. Audit Immutability Principle

Audit events are stronger historical records than ordinary snapshots.

Routine UI editing of audit history is prohibited.

⸻

132. AI Recommendation Persistence

Not every AI response must be saved.

A response should be stored as an ai_recommendation only when it has continuing value.

This prevents unnecessary database growth and privacy exposure.

⸻

133. AI Conversation Storage

V1 does not require a dedicated chat-history table.

The assistant may process current requests without permanently storing every conversation.

Long-term useful information belongs in:

memory_items

or:

ai_recommendations

when explicitly appropriate.

⸻

134. Why No Chat Table

A permanent raw transcript would:

* increase privacy exposure
* duplicate information
* grow quickly
* reduce structured clarity

V1 prefers useful structured memory over uncontrolled transcript storage.

⸻

135. Why No Vector Table

V1 personal memory volume is small enough for structured retrieval.

Adding embeddings would increase:

* complexity
* AI cost
* privacy surface
* maintenance

A vector architecture may be introduced later only if real usage proves the need.

⸻

136. Why One Career Table

Separate V1 tables for:

* skills
* achievements
* roles
* gaps
* milestones

would create unnecessary fragmentation.

A controlled:

career_items

table supports V1 without losing structure.

⸻

137. Why One Learning Table

Courses, certifications and university programs share sufficient common lifecycle fields.

A single:

learning_items

table keeps V1 simple.

⸻

138. Why Monthly Snapshots

LIFE OS needs to answer:

* how this month compares
* whether savings are improving
* how monthly allocation changes

without becoming full accounting software.

Monthly snapshots provide that middle ground.

⸻

139. Why No Expense Ledger

V1 is not a daily transaction accounting system.

It tracks:

* income
* allocations
* planning
* monthly state

It intentionally avoids importing every coffee or card transaction.

Bank transaction ingestion may be considered in a future version.

⸻

140. Why No Net-Worth Table

V1 can derive useful current information from:

* financial snapshots
* investment information
* manually tracked balances

A dedicated complex asset/liability system is not required yet.

Future real estate or business assets may justify a broader net-worth model.

⸻

141. Deletion Workflow

Before deleting a parent record with dependencies:

Request Delete
↓
Find Dependencies
↓
Show Simple Explanation
↓
User Resolves Relationships
↓
Validate
↓
Delete
↓
Audit

No silent cascading of normal goal/project relationships.

⸻

142. Data Export

General data-export implementation is not required for V1.

Database design should nevertheless remain structured enough to support a future export capability.

⸻

143. Backup

Managed database backup and recovery procedures are documented in:

docs/OPERATIONS.md

GitHub is not a personal-data backup.

⸻

144. Migration Files

V1 database implementation consists of exactly:

supabase/migrations/001_v1_schema.sql
supabase/migrations/002_v1_rls.sql
supabase/seed.sql

⸻

145. Migration 001 Responsibility

001_v1_schema.sql contains:

* table creation
* constraints
* foreign keys
* indexes
* timestamp function
* timestamp triggers
* structural ownership relationships

It does not define the final RLS access policies.

⸻

146. Migration 002 Responsibility

002_v1_rls.sql contains:

* RLS enablement
* ownership policies
* MFA/AAL enforcement
* operation-specific access rules
* audit-log mutation restrictions

⸻

147. Seed Responsibility

seed.sql contains:

* safe fictional development records
* no production dependency
* no credentials
* no real LIFE OS personal data

⸻

148. Migration Idempotency

Migrations are versioned, not repeatedly rewritten after production application.

A migration already applied to production should not be casually modified.

Future schema change requires a new future migration.

During V1 initial construction, migrations remain frozen once validated.

⸻

149. Production Schema Source of Truth

The GitHub migration history must describe the production database.

Manual schema changes not represented by migrations are prohibited except emergency recovery.

Emergency changes must later be reconciled with source-controlled migrations.

⸻

150. Database Testing

Before V1 release, verify:

* all 14 tables exist
* all required constraints exist
* timestamps work
* cross-user references fail
* invalid statuses fail
* invalid amounts fail
* duplicate monthly snapshots fail
* duplicate investment instruments fail
* protected deletion behaves correctly
* RLS works
* MFA enforcement works

⸻

151. Calculation Testing

Application tests must verify at minimum:

Finance:

total income
total budget
available amount
savings totals
investment allocation

Investments:

position value
cost basis
gain/loss
allocation

AI is not part of authoritative calculation tests.

⸻

152. Data Integrity Principle

The database must reject impossible or unsafe states when it can do so reliably.

Do not rely exclusively on the UI.

⸻

153. Performance Expectation

V1 is a private single-user system.

Expected data volume is modest.

The database should prioritize:

* correctness
* security
* clarity

before extreme scaling optimization.

⸻

154. Future Scaling

The schema still uses:

* UUID ownership
* relational integrity
* indexes
* normalized entities

so future expansion remains possible.

V1 must not implement multi-user SaaS complexity prematurely.

⸻

155. Database Security Boundary

The final database security model is:

AUTHENTICATED OWNER
↓
AAL2
↓
SERVER VALIDATION
↓
USER-SCOPED QUERY
↓
POSTGRESQL RLS
↓
CONSTRAINTS
↓
PRIVATE ROWS

⸻

156. Database Philosophy

LIFE OS data must be:

Structured enough for intelligence.
Simple enough to understand.
Strict enough to trust.
Private enough to protect.

⸻

157. Database Freeze Rule

After this document is committed:

The V1 logical database design is frozen.

Changes require one of:

1. confirmed implementation impossibility
2. security flaw
3. data-integrity flaw
4. failed integration
5. critical requirement already defined by V1 but impossible to represent

Convenience alone is not sufficient.

⸻

158. Final V1 Data Model

USER
│
├── PROFILE
│
├── FINANCE
│   ├── Income Sources
│   ├── Budget Items
│   └── Monthly Snapshots
│
├── INVESTMENTS
│   ├── Assets
│   └── Transactions
│
├── GOALS
│   ├── Projects
│   ├── Tasks
│   ├── Learning
│   └── Career
│
├── MEMORY
│
├── AI RECOMMENDATIONS
│
└── AUDIT LOG

⸻

DATABASE STATUS

LOCKED FOR VERSION 1

This document defines the complete logical database design for LIFE OS V1.

Implementation files must follow this design unless a documented freeze exception is triggered.

⸻

END OF LIFE OS V1 DATABASE SPECIFICATION