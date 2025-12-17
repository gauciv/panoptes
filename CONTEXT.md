# Panoptes - Development Context

**Last Updated:** 2025-12-17T23:44:12+08:00  
**Current Branch:** main  
**Latest Commit:** `0a8cc18` - refactor: remove synced blocks number rendering truncation

---

## Project Overview

**Panoptes** is a production-ready webhook notification system for the Cardano blockchain built for the SAIB Competition. It monitors addresses, tracks native assets, and delivers real-time HTTP callbacks with enriched transaction data.

### Core Technology Stack

**Backend (.NET 9.0)**
- ASP.NET Core 9.0 Web API
- Argus.Sync 0.3.17-alpha (blockchain indexing)
- Entity Framework Core 9.0 (ORM)
- PostgreSQL 17 (database)
- Grpc.Net.Client 2.60.0
- JWT Bearer Authentication

**Frontend (React 18)**
- React 18.2.0 + TypeScript 5.2.2
- Vite 7.2.6 (build tool)
- Tailwind CSS 3.4.1 (styling)
- Framer Motion 11.0.0 (animations)
- React Router DOM 7.10.1 (routing)
- AWS Amplify 6.15.9 (authentication)
- Recharts 2.15.4 (data visualization)
- Axios 1.6.7 (HTTP client)

---

## Project Structure

```
panoptes/
├── Panoptes.Api/              # ASP.NET Core Web API
│   ├── Controllers/           # REST endpoints (3 controllers)
│   │   ├── HealthController.cs        # System health & metrics
│   │   ├── SetupController.cs         # Demeter configuration
│   │   └── SubscriptionsController.cs # Webhook CRUD
│   ├── Workers/               # Background services
│   │   ├── ArgusWorker.cs             # Blockchain sync
│   │   └── WebhookRetryWorker.cs      # Retry logic
│   ├── DTOs/                  # Data transfer objects
│   ├── Auth/                  # API key authentication
│   └── Program.cs             # App entry point
│
├── Panoptes.Core/             # Domain layer
│   ├── Entities/              # Database models (5 entities)
│   │   ├── WebhookSubscription.cs
│   │   ├── DeliveryLog.cs
│   │   ├── DemeterConfig.cs
│   │   ├── SystemState.cs
│   │   └── RateLimitConfig.cs
│   └── Interfaces/            # Contracts
│
├── Panoptes.Infrastructure/   # Data access & services
│   ├── Persistence/           # EF Core DbContext
│   ├── Services/              # Business logic
│   │   ├── PanoptesReducer.cs         # Transaction processor
│   │   └── WebhookDispatcher.cs       # HTTP delivery
│   ├── Providers/             # External integrations
│   │   └── PanoptesU5CProvider.cs     # UtxoRPC provider
│   ├── Configurations/        # App config models
│   └── Migrations/            # EF Core migrations (2 migrations)
│
├── Panoptes.Client/           # React frontend
│   ├── src/
│   │   ├── pages/             # Route components (7 pages)
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Landing.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── Health.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── Docs.tsx
│   │   │   └── SubscriptionDetail.tsx
│   │   ├── components/        # UI components (40+ components)
│   │   ├── services/          # API client
│   │   ├── context/           # React context (Auth)
│   │   ├── hooks/             # Custom hooks
│   │   ├── layouts/           # Page layouts
│   │   └── types/             # TypeScript definitions
│   └── node_modules/          # 297 packages
│
├── Panoptes.Tests/            # Unit tests
├── terraform/                 # AWS infrastructure
├── .github/                   # CI/CD workflows
├── docs/                      # Documentation
└── assets/                    # Images & icons
```

---

## Recent Changes (Last 20 Commits)

1. **0a8cc18** - refactor: remove synced blocks number rendering truncation
2. **a11fd9a** - fix: add authorization on health panel to hide global stats
3. **b525b2c** - fix: invalid subscription creation
4. **8514276** - fix: resolve invalid authentication middleware
5. **c0d1998** - fix: resolve sidenav network label being stuck
6. **7448ab5** - feat: add robust validation on demeter api key in network configuration
7. **e9786ba** - fix: resolve distribution type responsiveness issue and invalid data type
8. **2a884d2** - fix: resolve invalid log timestamp on subscription details
9. **fac6fd2** - fix: resolve 'unknown operator' bug on federated login
10. **81f42ac** - docs: remove obsolete section on README
11. **1e5be07** - docs: add new architecture asset to README
12. **4f25d0f** - fix: resolve profile navigation bug
13. **c71658c** - docs: add architecture diagram; adaptive and hierarchal versions (#175)
14. **42e30ad** - feat: add /docs basic content
15. **c2e9ef0** - feat: add a dedicated modal for network configuration on settings
16. **da49a9c** - feat: modify setupwizard z-index to prevent index race
17. **9acb6d4** - chore: cleanup unused variables
18. **675818b** - fix: resolve setup wizard modal not showing up after onboarding conclusion
19. **65aab7e** - refactor: modify new subscription button to show default look when onboarding is active
20. **0c5c233** - feat(ux): inform user via sidenav if the network has not been configured

---

## Key Features

### Core Capabilities
- ✅ Real-time blockchain sync via Argus.Sync + UtxoRPC (Demeter)
- 🎯 Flexible filtering (addresses, policy IDs)
- 🔔 HTTP webhooks with enriched payloads
- 🔄 Automatic retries (exponential backoff)
- 🚦 Rate limiting (60/min, 1000/hour configurable)
- 📊 Rich transaction data with Bech32 addresses
- 💾 Full delivery audit trail
- 🔐 API key authentication
- 🎨 Modern React dashboard with Tailwind CSS

### Webhook Payload Features
- **Honest Data Quality Flags**: `InputAmountsHydrated`, `IsChange`, `DataLossWarning`
- **TotalReceived**: Per-address ADA received (output only)
- **Asset Names**: Both hex and UTF-8 representations
- **Block Metadata**: Slot, hash, height, timestamp
- **Transaction Details**: Inputs, outputs, fees, assets

---

## Database Schema

### Tables
1. **WebhookSubscriptions** - Webhook configurations
2. **DeliveryLogs** - Webhook delivery attempts
3. **DemeterConfigs** - Demeter API credentials (encrypted)
4. **SystemStates** - Sync state tracking
5. **RateLimitConfigs** - Rate limit settings

### Migrations
- `20251213140724_SyncCodeWithDB` - Initial schema
- `20251216032605_AddUserIdToSubscriptions` - Add user tracking

---

## Configuration

### Backend (appsettings.json)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=panoptes;Username=postgres;Password=postgres"
  },
  "Panoptes": {
    "MaxWebhooksPerMinute": 60,
    "MaxWebhooksPerHour": 1000,
    "EnableBatching": false,
    "BatchWindowSeconds": 10
  }
}
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:5033
```

---

## Development Workflow

### Prerequisites
- .NET 9.0 SDK (9.0.308+)
- Node.js 18+ (v24.11.0 recommended)
- Docker (PostgreSQL)
- Demeter.run API Key

### Running Locally

**Terminal 1 - Backend:**
```bash
docker compose up -d  # Start PostgreSQL
dotnet run --project Panoptes.Api
# API: http://localhost:5033
```

**Terminal 2 - Frontend:**
```bash
cd Panoptes.Client
npm run dev
# Dashboard: http://localhost:5173
```

### First-Time Setup
1. Open http://localhost:5173
2. Complete Setup Wizard with Demeter API key
3. ArgusWorker starts automatically

---

## API Endpoints

### Health Controller
- `GET /api/health` - System health check
- `GET /api/health/metrics` - Performance metrics
- `GET /api/health/sync-status` - Blockchain sync status

### Setup Controller
- `POST /api/setup/configure` - Configure Demeter credentials
- `GET /api/setup/status` - Check setup status
- `PUT /api/setup/update` - Update configuration

### Subscriptions Controller
- `GET /api/subscriptions` - List subscriptions
- `POST /api/subscriptions` - Create subscription
- `GET /api/subscriptions/{id}` - Get subscription details
- `PUT /api/subscriptions/{id}` - Update subscription
- `DELETE /api/subscriptions/{id}` - Delete subscription
- `GET /api/subscriptions/{id}/logs` - Get delivery logs

---

## Testing

### Unit Tests (Panoptes.Tests)
- `CatchUpModeTests.cs` - Sync mode testing
- `RateLimitTests.cs` - Rate limiting logic
- `WalletAddressFilteringTests.cs` - Address filtering
- `WebhookDispatcherTests.cs` - Webhook delivery
- `Bech32EncodingTests.cs` - Address encoding

### Running Tests
```bash
dotnet test
```

---

## Deployment

### Docker Compose (Production)
```bash
docker compose -f docker-compose.prod.yml up -d
```

### Terraform (AWS)
- S3 + CloudFront (frontend)
- Cognito (authentication)
- Route53 (domain)

```bash
cd terraform
terraform init
terraform apply
```

---

## Known Issues & Debugging

### Suspicious Zero-Value Outputs
If `DataLossWarning` appears in webhook metadata, check API logs for:
```
⚠️ SUSPICIOUS ZERO VALUE DETECTED - Parsing may have failed!
```
This indicates CBOR parsing issues.

### Common Problems
1. **ArgusWorker not starting**: Check Demeter API key configuration
2. **Webhook delivery failures**: Verify target URL is accessible
3. **Rate limit exceeded**: Adjust `MaxWebhooksPerMinute` in config
4. **Database connection errors**: Ensure PostgreSQL is running

---

## Security

### Best Practices
- ✅ API keys encrypted at rest (ASP.NET Core Data Protection)
- ✅ HTTPS-only webhook endpoints
- ✅ JWT authentication for API
- ✅ Environment variables for secrets
- ❌ Never commit `appsettings.Local.json` with keys
- ❌ Never share database files between environments

### Credential Management
- Use Setup Wizard for initial configuration
- Update via Settings page (auto re-encryption)
- Rotate keys regularly

---

## Performance Metrics

- **Sync Speed**: ~1000 blocks/minute (Preprod)
- **Webhook Latency**: <100ms processing + network time
- **Database**: PostgreSQL 17 (production-ready)
- **Scalability**: Horizontal via Docker/Kubernetes

---

## Documentation

- `README.md` - Main documentation
- `ARCHITECTURE.md` - System architecture
- `WEBHOOK_VERIFICATION.md` - Webhook security
- `CONTRIBUTING.md` - Contribution guidelines
- `SECURITY.md` - Security policy
- `CHANGELOG.md` - Version history

---

## External Dependencies

### NuGet Packages (Backend)
- Argus.Sync 0.3.17-alpha
- Microsoft.EntityFrameworkCore 9.0.0
- Npgsql.EntityFrameworkCore.PostgreSQL 9.0.0
- Microsoft.AspNetCore.Authentication.JwtBearer 9.0.0
- Grpc.Net.Client 2.60.0

### NPM Packages (Frontend - Top 10)
- react 18.2.0
- react-dom 18.2.0
- react-router-dom 7.10.1
- aws-amplify 6.15.9
- axios 1.6.7
- framer-motion 11.0.0
- recharts 2.15.4
- tailwindcss 3.4.1
- vite 7.2.6
- typescript 5.2.2

---

## Change Log

### Session: 2025-12-18T00:00:08+08:00
- **Action**: Removed verbose Demeter API key prompt from backend startup
- **Purpose**: Reduce terminal noise when backend starts without credentials
- **Files Modified**: 
  - `Panoptes.Api/Workers/ArgusWorker.cs` - Removed multi-line credential prompt in ExecuteAsync
- **Impact**: ArgusWorker now silently polls for credentials every 5 seconds instead of logging verbose instructions
- **Next Steps**: Test backend startup to verify clean terminal output

### Session: 2025-12-17T23:44:12+08:00
- **Action**: Created CONTEXT.md
- **Purpose**: Establish comprehensive project context tracking
- **Files Created**: `/CONTEXT.md`
- **Next Steps**: Update this file after each significant change

---

## Notes

- Built for SAIB Competition by TxPipe
- Powered by Argus.Sync and UtxoRPC (Demeter)
- MIT License
- Production-ready for Cardano blockchain monitoring
