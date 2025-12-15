---
applyTo: '**'
---

# User Memory

## Session: README Update - December 13, 2025

### Task
Update README.md to reflect actual architecture and versions

### Project Context
- **Project Type**: Cardano Blockchain Webhook Notification System
- **Tech Stack**: .NET 9.0, React 18, TypeScript, PostgreSQL, Tailwind CSS
- **Repository**: gauciv/panoptes
- **Current Branch**: refactor/industrial-ui-consistency

### Findings

#### Version Information (Verified)
- [x] .NET SDK: 9.0.308
- [x] Node.js: v24.11.0
- [x] npm: 11.6.1
- [x] React: 18.2.0
- [x] Vite: 7.2.6
- [x] TypeScript: 5.2.2
- [x] Argus.Sync: 0.3.17-alpha
- [x] PostgreSQL: 17 (Docker)

#### Backend Structure (Verified)
- [x] Controllers: HealthController, SetupController, SubscriptionsController
- [x] Services: PanoptesReducer, WebhookDispatcher
- [x] Workers: ArgusWorker, WebhookRetryWorker
- [x] Entities: WebhookSubscription, DeliveryLog, DemeterConfig, SystemState, RateLimitConfig
- [x] Persistence: AppDbContext (PostgreSQL via Npgsql)
- [x] Authentication: AWS Cognito integration

#### Frontend Structure (Verified)
- [x] Pages: Dashboard, Landing, Analytics, Health, Profile, Settings, SubscriptionDetail
- [x] Components: 40+ components including SetupWizard, WebhookTester, LogViewer, etc.
- [x] Services: api.ts (axios-based)
- [x] Context: AuthContext (AWS Cognito)
- [x] Hooks: useScrollbarTheme, useStatsData, useSubscriptionFilters

#### Architecture Components (Verified)
- [x] API runs on localhost:5033
- [x] Frontend runs on localhost:5173
- [x] Vite proxy configured for API calls
- [x] PostgreSQL database (was SQLite, now PostgreSQL)
- [x] Docker support with docker-compose.yml
- [x] Terraform infrastructure for AWS deployment

### Progress
- Started: December 13, 2025
- Status: Completed
