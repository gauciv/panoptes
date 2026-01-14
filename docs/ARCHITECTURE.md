# Panoptes System Architecture

## Overview
Panoptes is a production-ready webhook notification system for the Cardano blockchain. This document describes the system architecture, components, and data flow.

---

[![](https://mermaid.ink/img/pako:eNqdWN1u47gVfhVCgy12USXxTxzHxmAAWZITt47tteRNZzdFQVu0LUQWvSSdsXc8fYKiLXrX3vS2d73tVR-mL9A-Qg9_JMs_SWbWQBLz8PDj4fn5eJiP1oRGxGpaM4aXcxS2HlIEH74aa4G_FoSlOPnhwfrf3__w53yMAsKe4gnhD9Zv9RL5iWJGJiKmaQ4kP55_54f-ECDejt95ZEEA4pytUjQSazocuG8vxu_ejtnFuxkMMmAlcDGLcEpRK6GTx8kcxynysMB7e7r9m14n7Gt05z5ALp2lsaA5at9ZiTmqnJfUaMQJQ1JCUhFPsDR2H84Zek7PwB3vn6MOGFkyGl3cgTAlQslChlOOtQP27CRp9JAeeLbNaCpgQnn2j__Ix6iLN4R9hltbw_59kLlVHavF6Af4m9vozhldkIs2LJ_S9UWAp5jFe8hD33FDjTAkYDmYzedjCsfeHZQy0US1cr2qz7hZkmDC4qVAv0TfxYLs4e2-5ecc4BnhsIX6u6csP12n53V6NzDfxWkUp7MjDc8JbmE6N-xIwek53fdhxw1Ay4HU3EBcjze69Z1uKIFuCU7E_Gg-8MMQDJEgARECLNnHUCF84ZguXSxpCkklzzrqFMZHW913vock0xutlvfxT6dOFYxartFajblyOCSAe0q1278JnVbXl14iSfxE2KZLZzzE44QcKYd-oGvxnoznlD6GhIuDdMuPeiptW3jyqLP2P3_763__9adM8CWE4Aw6plyDwXnPD8FZjEjpYdKVqjrplFLjvPRarrlQQowmCWEyCkM4alH0TE78zg2HXW3PxVwlR26GzpUdxKmsGQ2KAFyGNF-vAvzS8lFrb3Eh0nwHUpQ-A_Zadt5T9qidIsM1Y3QFETPC44Ia3owCEyA2W3Gtl9tTIONgk06U7PflUqmExnKGXyzi9Ahz6IfD9xrTJN6QCLY5gB7AyTgiMoNRucSV7A6vUQ0x0I7Jl5VklpGwrUqwkxmqjfNGbsakAyD8pSB8SKLVpGBbkdwHjAIOB5JQU04UMRiiOywm80w4xIKgbryIxUlW6wQDJ3Rvs12NU7yYLyVIYd_bMBygQT8I9ejOcc-CW6dSu1Jj8BIS8YLQlfj8GpZ30xhzoq6ev_wbDSALYqCBdEI--_bxWm6_F_q_MbeHs1x6Y5mcZC1y0_22ruyGuXt7yxn_MZHee4qjg11OxM-HG1rEKn6ZxbnsVCkFe64slk1uUQ8viI1Gw66N_CcgZ3mbqYl2nAANchvJsKmo8VM8G2RNTE6zuzIVWKwAYIA3CcWRzgGZ4y4Um7DBsdLBmyNUcGO7c7PXHIEfp_EO2U-jJY0lBlAk-jXZKOnXfjphG8jU6JtjZ4RO6GvIYAOBXUjjSA7YxVwECVVGcXELN6s-AVQzGlAeHzVFz1SazMobYNkfvtaVQ7mYMRJ820Xl-iGVX1YraugBRUCrIlMFGEQmwTcvNEluEkOUTES5bpX-aaQoE39Gtvo9b9Dv9Eyyvqcrlq1GmXf3Ci5AQ_LjCqB0HIN4lkJ0IZW_IyyeHvaNBcu_-kpVF2on9IM8ZKqN4XrWNJfo7Ozd9qCn3WZtstY0A6Wp22LBCF5sNTlrHfVVaRg-0n0q32aEptXMQCkqhkKGrwho7njI7JuPlX5OPtvchSf1XDBO0h2dbVWZaKVsf6B-pfXtShJ7G8cJiYp6Ow1_rZumGF4Y8qai06kKQLUElVVe2KgGP2X1a35svP5t-uLc_mCr29xsL_iq5mTzKrlovdnKwjIR0q8JpfCr-xCFFJqbZwDUuwJaBKCyAoKJDVQq6BRbjP2JXedwIDctQRGsALLz43ZHwVprh6iPh5M4kkH5BQrwEzlWNxvp-A1HHuovCVOJzY-UTdAzoVoDD4bo4p6BF7eKfV_T2cX7eR1Nhq_uJumtaJjcHp2dg1og4MKJUAdilrGTVpG7v6KiN39FSe39is5heUrbkSb1_SPuVEZLFSvF03sHLFavOyeTR91T8KLPDxIze1QdiuVL6lCWP54OJ3TOHUqzV9LpffXD5miNfskcGWleLYdy_UAp8GkgNolsodR4kmDOPTJFJPtHxDROkuabdrvRKJVsDs3xI2m-qVQr7apvhmcf4kjMm9Xl2p7QhLLmm-l0egA3zV7fGq5WaVy67RfhKi_Bjc2jSKO5jUrNK_98tCjrfjRctXV57bo_H26ir08NVvHrXrWSg5VbNb9S-gIwrptqg-Z79fIrYTiFVsDMbj7bMLGd3ZlZwIu6huptlT22SXtb5rmdJ7atM9nOUtfWWWqbtLSzPLR14uWZUNwHyNkukLC9o1o7p1ET8r1lsrxtdbvZpo7twsVpXLd3-IzzJG4gbQtsTRi24gQ7I5o8J4qrsyvaRNiyrRmLI6sp2IrY1oKwBZZD66Nc9GCJObSbD1YTvkZkilcJPCEe0k-wbInT7yldZCvhuTibW80pTjiMVoqqvBhDi7ZTgaPLxhVaXatZuawrDKv50VpbzbOr2nnj6vq6ctW4atQbtQbMbkCrfn5VvqzWGo3L0mX9-rrxybZ-UruWz0uNeq1xfXldrZTq5Xr90_8B59s_0w?type=png)](https://mermaid.live/edit#pako:eNqdWN1u47gVfhVCgy12USXxTxzHxmAAWZITt47tteRNZzdFQVu0LUQWvSSdsXc8fYKiLXrX3vS2d73tVR-mL9A-Qg9_JMs_SWbWQBLz8PDj4fn5eJiP1oRGxGpaM4aXcxS2HlIEH74aa4G_FoSlOPnhwfrf3__w53yMAsKe4gnhD9Zv9RL5iWJGJiKmaQ4kP55_54f-ECDejt95ZEEA4pytUjQSazocuG8vxu_ejtnFuxkMMmAlcDGLcEpRK6GTx8kcxynysMB7e7r9m14n7Gt05z5ALp2lsaA5at9ZiTmqnJfUaMQJQ1JCUhFPsDR2H84Zek7PwB3vn6MOGFkyGl3cgTAlQslChlOOtQP27CRp9JAeeLbNaCpgQnn2j__Ix6iLN4R9hltbw_59kLlVHavF6Af4m9vozhldkIs2LJ_S9UWAp5jFe8hD33FDjTAkYDmYzedjCsfeHZQy0US1cr2qz7hZkmDC4qVAv0TfxYLs4e2-5ecc4BnhsIX6u6csP12n53V6NzDfxWkUp7MjDc8JbmE6N-xIwek53fdhxw1Ay4HU3EBcjze69Z1uKIFuCU7E_Gg-8MMQDJEgARECLNnHUCF84ZguXSxpCkklzzrqFMZHW913vock0xutlvfxT6dOFYxartFajblyOCSAe0q1278JnVbXl14iSfxE2KZLZzzE44QcKYd-oGvxnoznlD6GhIuDdMuPeiptW3jyqLP2P3_763__9adM8CWE4Aw6plyDwXnPD8FZjEjpYdKVqjrplFLjvPRarrlQQowmCWEyCkM4alH0TE78zg2HXW3PxVwlR26GzpUdxKmsGQ2KAFyGNF-vAvzS8lFrb3Eh0nwHUpQ-A_Zadt5T9qidIsM1Y3QFETPC44Ia3owCEyA2W3Gtl9tTIONgk06U7PflUqmExnKGXyzi9Ahz6IfD9xrTJN6QCLY5gB7AyTgiMoNRucSV7A6vUQ0x0I7Jl5VklpGwrUqwkxmqjfNGbsakAyD8pSB8SKLVpGBbkdwHjAIOB5JQU04UMRiiOywm80w4xIKgbryIxUlW6wQDJ3Rvs12NU7yYLyVIYd_bMBygQT8I9ejOcc-CW6dSu1Jj8BIS8YLQlfj8GpZ30xhzoq6ev_wbDSALYqCBdEI--_bxWm6_F_q_MbeHs1x6Y5mcZC1y0_22ruyGuXt7yxn_MZHee4qjg11OxM-HG1rEKn6ZxbnsVCkFe64slk1uUQ8viI1Gw66N_CcgZ3mbqYl2nAANchvJsKmo8VM8G2RNTE6zuzIVWKwAYIA3CcWRzgGZ4y4Um7DBsdLBmyNUcGO7c7PXHIEfp_EO2U-jJY0lBlAk-jXZKOnXfjphG8jU6JtjZ4RO6GvIYAOBXUjjSA7YxVwECVVGcXELN6s-AVQzGlAeHzVFz1SazMobYNkfvtaVQ7mYMRJ820Xl-iGVX1YraugBRUCrIlMFGEQmwTcvNEluEkOUTES5bpX-aaQoE39Gtvo9b9Dv9Eyyvqcrlq1GmXf3Ci5AQ_LjCqB0HIN4lkJ0IZW_IyyeHvaNBcu_-kpVF2on9IM8ZKqN4XrWNJfo7Ozd9qCn3WZtstY0A6Wp22LBCF5sNTlrHfVVaRg-0n0q32aEptXMQCkqhkKGrwho7njI7JuPlX5OPtvchSf1XDBO0h2dbVWZaKVsf6B-pfXtShJ7G8cJiYp6Ow1_rZumGF4Y8qai06kKQLUElVVe2KgGP2X1a35svP5t-uLc_mCr29xsL_iq5mTzKrlovdnKwjIR0q8JpfCr-xCFFJqbZwDUuwJaBKCyAoKJDVQq6BRbjP2JXedwIDctQRGsALLz43ZHwVprh6iPh5M4kkH5BQrwEzlWNxvp-A1HHuovCVOJzY-UTdAzoVoDD4bo4p6BF7eKfV_T2cX7eR1Nhq_uJumtaJjcHp2dg1og4MKJUAdilrGTVpG7v6KiN39FSe39is5heUrbkSb1_SPuVEZLFSvF03sHLFavOyeTR91T8KLPDxIze1QdiuVL6lCWP54OJ3TOHUqzV9LpffXD5miNfskcGWleLYdy_UAp8GkgNolsodR4kmDOPTJFJPtHxDROkuabdrvRKJVsDs3xI2m-qVQr7apvhmcf4kjMm9Xl2p7QhLLmm-l0egA3zV7fGq5WaVy67RfhKi_Bjc2jSKO5jUrNK_98tCjrfjRctXV57bo_H26ir08NVvHrXrWSg5VbNb9S-gIwrptqg-Z79fIrYTiFVsDMbj7bMLGd3ZlZwIu6huptlT22SXtb5rmdJ7atM9nOUtfWWWqbtLSzPLR14uWZUNwHyNkukLC9o1o7p1ET8r1lsrxtdbvZpo7twsVpXLd3-IzzJG4gbQtsTRi24gQ7I5o8J4qrsyvaRNiyrRmLI6sp2IrY1oKwBZZD66Nc9GCJObSbD1YTvkZkilcJPCEe0k-wbInT7yldZCvhuTibW80pTjiMVoqqvBhDi7ZTgaPLxhVaXatZuawrDKv50VpbzbOr2nnj6vq6ctW4atQbtQbMbkCrfn5VvqzWGo3L0mX9-rrxybZ-UruWz0uNeq1xfXldrZTq5Xr90_8B59s_0w)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PANOPTES SYSTEM ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────────────┘

    External Services          →    Backend Services    →    Persistence    →    Client
    
    Demeter.run UtxoRPC              ArgusWorker              PostgreSQL           React
    AWS Cognito                      PanoptesReducer          AppDbContext         Dashboard
                                     WebhookDispatcher
                                     WebhookRetryWorker
```

---

## 🔷 Component Legend

### External Services
Components that provide external functionality to the system.

| Component | Type | Description |
|-----------|------|-------------|
| **Demeter.run UtxoRPC** | gRPC Service | Cardano blockchain data provider via UtxoRPC protocol |
| **AWS Cognito** | Authentication Service | User authentication and identity management |

### Background Workers
Long-running services that process blockchain data and handle retries.

| Component | Type | Description |
|-----------|------|-------------|
| **ArgusWorker** | Background Service | Syncs blockchain data from Demeter UtxoRPC, processes blocks, and triggers webhook deliveries |
| **WebhookRetryWorker** | Background Service | Polls failed deliveries every 10s, implements exponential backoff, max 5 retries |

### Core Services
Business logic layer that processes transactions and dispatches webhooks.

| Component | Type | Description |
|-----------|------|-------------|
| **PanoptesReducer** | Service | Processes transactions, matches addresses, enforces rate limits, encodes Bech32 addresses |
| **WebhookDispatcher** | Service | Dispatches HTTP POST requests, signs with HMAC-SHA256, handles custom headers and timeouts |

### REST API Controllers
HTTP endpoints that expose system functionality.

| Component | Endpoint | Description |
|-----------|----------|-------------|
| **HealthController** | `/health` | System status, database health, metrics |
| **SetupController** | `/setup` | Demeter configuration, credential validation |
| **SubscriptionsController** | `/subscriptions` | CRUD operations, toggle active, test webhook, delivery logs |

### Persistence Layer
Database entities and data access.

| Component | Type | Description |
|-----------|------|-------------|
| **AppDbContext** | EF Core DbContext | Entity Framework Core database context with PostgreSQL provider |
| **Subscriptions** | Entity | Stores webhook subscription configurations (Name, URL, EventType, Filters, RateLimits) |
| **DeliveryLogs** | Entity | Audit trail of webhook attempts (Status, Payload, RetryCount, Latency) |
| **DemeterConfigs** | Entity | Encrypted Demeter credentials (Endpoint, API Key, Network) |
| **SystemStates** | Entity | System checkpoints (LastSlot, LastHash, sync position) |

### Database
Primary data store.

| Component | Type | Description |
|-----------|------|-------------|
| **PostgreSQL 17** | Relational Database | Production-ready database running in Docker on localhost:5432 |

### Frontend Application
User interface for managing webhooks.

| Component | Type | Description |
|-----------|------|-------------|
| **React Dashboard** | SPA | Modern dashboard built with React 18.2, TypeScript 5.2, Vite 7.2 |
| **Pages** | UI Components | Landing, Dashboard, Analytics, Health, Settings, Profile, SubscriptionDetail |
| **Components** | UI Library | 40+ reusable components (SetupWizard, SubscriptionCard, LogViewer, WebhookTester, etc.) |

---

## Data Flow

### 1. Blockchain Sync Flow
```
Cardano Blockchain
    ↓
Demeter.run UtxoRPC (gRPC)
    ↓
ArgusWorker (Background Service)
    ├─ Connects to Demeter
    ├─ Processes blocks
    ├─ Catch-up mode detection
    └─ Triggers reducer
        ↓
PanoptesReducer (Core Service)
    ├─ Transaction processing
    ├─ Address matching
    ├─ Rate limiting check
    ├─ Bech32 encoding
    └─ Builds webhook payload
        ↓
WebhookDispatcher (Core Service)
    ├─ HTTP POST dispatch
    ├─ HMAC-SHA256 signing
    ├─ Custom headers
    └─ Timeout handling (10s)
        ↓
Your Webhook Endpoint (External)
```

### 2. Webhook Delivery Flow
```
WebhookDispatcher
    ↓
Creates DeliveryLog
    ├─ Status: Pending
    ├─ Payload: JSON
    └─ AttemptedAt: Timestamp
        ↓
HTTP POST Request
    ├─ Headers: X-Panoptes-Signature
    ├─ Headers: X-Panoptes-Event
    └─ Headers: X-Panoptes-Delivery
        ↓
Response Handling
    ├─ 2xx → Status: Success
    ├─ 429 → Status: Retrying (Rate Limited)
    └─ Other → Status: Retrying
        ↓
Update DeliveryLog
    ├─ ResponseStatusCode
    ├─ ResponseBody
    ├─ Latency (ms)
    └─ NextRetryAt (if failed)
```

### 3. Retry Flow
```
WebhookRetryWorker (Every 10s)
    ↓
Query DeliveryLogs
    ├─ Status: Retrying
    ├─ NextRetryAt <= Now
    ├─ RetryCount < MaxRetries (5)
    └─ Subscription IsActive
        ↓
For each log:
    ├─ Deserialize payload
    ├─ Re-dispatch via WebhookDispatcher
    └─ Update status
        ├─ Success → Status: Success
        ├─ Failed & RetryCount < 5 → Exponential backoff (30s, 1m, 5m, 15m, 1h)
        └─ Failed & RetryCount >= 5 → Status: Failed (permanent)
```

### 4. User Interaction Flow
```
User (Browser)
    ↓
React Dashboard (localhost:5173)
    ├─ Authentication via AWS Cognito
    ├─ API calls via Axios
    └─ Vite proxy to backend
        ↓
ASP.NET Core API (localhost:5033)
    ├─ /setup → SetupController
    ├─ /subscriptions → SubscriptionsController
    └─ /health → HealthController
        ↓
AppDbContext (EF Core)
    ↓
PostgreSQL (localhost:5432)
```

---

## Technology Stack

### Backend
| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Runtime | .NET | 9.0.308 | Application runtime |
| Framework | ASP.NET Core | 9.0 | Web framework |
| Blockchain Sync | Argus.Sync | 0.3.17-alpha | Cardano blockchain indexing |
| CBOR Parsing | Chrysalis.Cbor | Latest | Cardano data deserialization |
| ORM | Entity Framework Core | 9.0.0 | Database access |
| Database Provider | Npgsql | 9.0.4 | PostgreSQL driver |

### Frontend
| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Runtime | Node.js | 24.11.0 | JavaScript runtime |
| Framework | React | 18.2.0 | UI library |
| Build Tool | Vite | 7.2.6 | Fast build tool |
| Language | TypeScript | 5.2.2 | Type-safe JavaScript |
| Styling | Tailwind CSS | 3.4.1 | Utility-first CSS |
| Animation | Framer Motion | 11.0.0 | Animation library |
| Charts | Recharts | 2.15.4 | Data visualization |
| HTTP Client | Axios | 1.6.7 | API client |
| Routing | React Router DOM | 7.10.1 | Client-side routing |
| Authentication | AWS Amplify | 6.15.9 | Auth integration |

### Infrastructure
| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Database | PostgreSQL | 17 (Alpine) | Primary data store |
| Container | Docker | 20+ | Database containerization |
| Orchestration | Docker Compose | Latest | Multi-container management |

---

## Security Architecture

### Authentication
```
User Browser
    ↓
AWS Cognito (OAuth 2.0)
    ├─ User authentication
    ├─ Token issuance
    └─ Session management
        ↓
React Dashboard
    ├─ Token storage
    ├─ Axios interceptors
    └─ Protected routes
        ↓
ASP.NET Core API
    └─ Token validation
```

### Credential Encryption
```
User Input (Demeter API Key)
    ↓
ASP.NET Core Data Protection
    ├─ Key derivation
    ├─ AES encryption
    └─ Authenticated encryption
        ↓
PostgreSQL (Encrypted)
    └─ DemeterConfigs.ApiKeyEncrypted
```

### Webhook Security
```
WebhookDispatcher
    ├─ Payload serialization
    ├─ HMAC-SHA256 signing (using SecretKey)
    └─ Custom headers
        ↓
HTTP POST
    ├─ Header: X-Panoptes-Signature (HMAC)
    ├─ Header: X-Panoptes-Event
    └─ Header: X-Panoptes-Delivery (UUID)
        ↓
Your Endpoint
    └─ Signature verification (recommended)
```

---

## Performance Characteristics

### Throughput
- **Sync Speed**: ~1000 blocks/minute (Preprod)
- **Webhook Latency**: <100ms processing time + network latency
- **Rate Limiting**: 60/min, 1000/hour per subscription (configurable)

### Scalability
- **Database**: PostgreSQL 17 (production-ready)
- **Horizontal Scaling**: Docker/Kubernetes support
- **Catch-up Mode**: Automatic detection and batching during sync

### Reliability
- **Retry Logic**: Exponential backoff (30s, 1m, 5m, 15m, 1h)
- **Max Retries**: 5 attempts per webhook
- **Delivery Logs**: Full audit trail of all attempts

---

## 📁 Project Structure

```
panoptes/
├── Panoptes.Api/              # ASP.NET Core Web API (Entry Point)
│   ├── Controllers/           # REST API endpoints
│   │   ├── HealthController.cs        # System health & metrics
│   │   ├── SetupController.cs         # Demeter configuration
│   │   └── SubscriptionsController.cs # Webhook CRUD operations
│   ├── Workers/               # Background services
│   │   ├── ArgusWorker.cs             # Blockchain sync worker
│   │   └── WebhookRetryWorker.cs      # Failed delivery retry
│   ├── DTOs/                  # Data transfer objects
│   ├── Auth/                  # API authentication
│   └── Program.cs             # Application entry point & DI setup
│
├── Panoptes.Core/             # Domain Layer (Entities, Interfaces)
│   ├── Entities/              # Database models
│   │   ├── WebhookSubscription.cs     # Subscription configuration
│   │   ├── DeliveryLog.cs             # Webhook delivery audit
│   │   ├── DemeterConfig.cs           # Demeter credentials
│   │   ├── SystemState.cs             # Sync checkpoints
│   │   └── RateLimitConfig.cs         # Rate limit configuration
│   ├── Interfaces/            # Service contracts
│   │   ├── IAppDbContext.cs           # Database context interface
│   │   └── IWebhookDispatcher.cs      # Webhook dispatcher interface
│   └── External/              # External type definitions
│       └── SaibTypes.cs               # SAIB-specific types
│
├── Panoptes.Infrastructure/   # Data Access & Services
│   ├── Persistence/           # EF Core DbContext
│   │   └── AppDbContext.cs            # Main database context
│   ├── Services/              # Business logic
│   │   ├── PanoptesReducer.cs         # Transaction processor (Argus IReducer)
│   │   └── WebhookDispatcher.cs       # HTTP delivery service
│   ├── Providers/             # External service integrations
│   │   └── PanoptesU5CProvider.cs     # UtxoRPC provider
│   ├── Configurations/        # App configuration models
│   │   └── PanoptesConfig.cs          # Argus configuration
│   └── Migrations/            # EF Core migrations
│       └── [Timestamp]_*.cs           # Database schema versions
│
├── Panoptes.Client/           # React Frontend (SPA)
│   ├── src/
│   │   ├── pages/             # Route components
│   │   │   ├── Dashboard.tsx          # Main dashboard
│   │   │   ├── Landing.tsx            # Landing page
│   │   │   ├── Analytics.tsx          # Analytics view
│   │   │   ├── Health.tsx             # System health
│   │   │   ├── Settings.tsx           # Demeter settings
│   │   │   ├── Profile.tsx            # User profile
│   │   │   └── SubscriptionDetail.tsx # Subscription details
│   │   ├── components/        # Reusable UI components (40+)
│   │   │   ├── SetupWizard.tsx        # Initial setup wizard
│   │   │   ├── SubscriptionCard.tsx   # Subscription card
│   │   │   ├── DeliveryLogsTable.tsx  # Delivery logs table
│   │   │   ├── LogViewer.tsx          # Log viewer modal
│   │   │   ├── WebhookTester.tsx      # Webhook testing tool
│   │   │   ├── StatCard.tsx           # Statistics card
│   │   │   ├── DistributionChart.tsx  # Distribution chart
│   │   │   └── VolumeChart.tsx        # Volume chart
│   │   ├── services/          # API client
│   │   │   └── api.ts                 # Axios-based API client
│   │   ├── context/           # React context
│   │   │   └── AuthContext.tsx        # AWS Cognito auth context
│   │   ├── hooks/             # Custom hooks
│   │   │   ├── useScrollbarTheme.ts   # Scrollbar theming
│   │   │   ├── useStatsData.ts        # Statistics data
│   │   │   └── useSubscriptionFilters.ts # Filter logic
│   │   ├── layouts/           # Page layouts
│   │   │   └── DashboardLayout.tsx    # Main layout
│   │   └── types/             # TypeScript definitions
│   │       └── index.ts               # Type exports
│   ├── vite.config.ts         # Vite configuration (proxy setup)
│   ├── package.json           # Frontend dependencies
│   └── tailwind.config.js     # Tailwind CSS configuration
│
├── Panoptes.Tests/            # Unit & Integration Tests
│   ├── Providers/             # Provider tests
│   ├── Services/              # Service tests
│   └── UnitTest1.cs           # Sample tests
│
├── terraform/                 # Infrastructure as Code (AWS)
│   ├── auth.tf                # AWS Cognito configuration
│   ├── backend.tf             # S3 backend
│   ├── domain.tf              # Domain & DNS
│   ├── frontend.tf            # S3 + CloudFront
│   ├── outputs.tf             # Terraform outputs
│   ├── providers.tf           # AWS provider
│   └── variables.tf           # Terraform variables
│
├── docker-compose.yml         # PostgreSQL development container
├── docker-compose.prod.yml    # Production deployment
└── README.md                  # Project documentation
```

---

## Deployment Architecture

### Development Environment
```
Developer Machine
    ├── Docker Desktop
    │   └── PostgreSQL Container (localhost:5432)
    ├── .NET 9.0 SDK
    │   └── Panoptes.Api (localhost:5033)
    └── Node.js 24.11.0
        └── Vite Dev Server (localhost:5173)
```

### Production Environment (AWS)
```
AWS Cloud
    ├── Route 53 (DNS)
    ├── CloudFront (CDN)
    │   └── S3 Bucket (React SPA)
    ├── Application Load Balancer
    │   └── ECS Fargate (ASP.NET Core API)
    ├── RDS PostgreSQL (Managed Database)
    └── Cognito (User Authentication)
```

---

## Monitoring & Observability

### Health Endpoints
- **GET /health** - System health check
  - Database connectivity
  - UtxoRPC service status
  - System metrics (CPU, memory, threads)
  - Uptime

### Metrics Collected
- Active subscriptions count
- Total subscriptions
- Last block synced
- Deliveries in last 24h
- Successful deliveries
- Failed deliveries
- Average response time
- Rate limit violations

### Logging
- Structured logging via ASP.NET Core ILogger
- Log levels: Debug, Information, Warning, Error, Critical
- Log outputs: Console, File, Application Insights (production)

---

## 📚 Related Documentation

- [README.md](../README.md) - Project overview and quick start
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [CHANGELOG.md](../CHANGELOG.md) - Version history
- [WEBHOOK_VERIFICATION.md](WEBHOOK_VERIFICATION.md) - Webhook security guide

---

## 📞 Architecture Questions?

For architectural questions or discussions:
- Open an issue on GitHub
- Join our community discussions
- Contact the maintainers

---

**Last Updated**: December 15, 2025  
**Version**: 1.0.0
