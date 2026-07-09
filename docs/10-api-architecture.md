# GoldOS — API Architecture

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026  
**Classification:** Internal — Architecture

---

## Purpose

This document defines the API architecture for GoldOS — the design principles, endpoint structure, authentication mechanisms, versioning strategy, and integration patterns that enable web applications, mobile apps, third-party integrations, and partner systems to interact with the platform securely and efficiently.

---

## API Design Principles

1. **API First** — APIs are designed before UI; every feature is API-accessible
2. **RESTful** — Resource-oriented URLs, standard HTTP methods, predictable patterns
3. **Consistent** — Uniform response format, error handling, and naming conventions
4. **Versioned** — Explicit API versioning with deprecation policy
5. **Secure** — Authentication on every endpoint, tenant isolation, rate limiting
6. **Documented** — Auto-generated OpenAPI specification, always up to date
7. **Performant** — Pagination, filtering, field selection, and caching headers
8. **Idempotent** — Safe retry for non-idempotent operations via idempotency keys

---

## API Overview

### Base URL Structure

```
Production:  https://api.goldos.com/v1/{resource}
Staging:     https://api.staging.goldos.com/v1/{resource}
Tenant UI:   https://{tenant-slug}.goldos.com
```

### API Layers

```
┌─────────────────────────────────────────────────┐
│                  API Clients                     │
│  Web App │ Mobile Apps │ Integrations │ Webhooks │
└──────────┬──────────┬──────────┬───────────────┘
           │          │          │
┌──────────┴──────────┴──────────┴───────────────┐
│                  API Gateway                     │
│  Rate Limiting │ TLS Termination │ WAF          │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│              API Application Layer               │
│  Auth Middleware │ Tenant Context │ RBAC        │
│  Validation │ Serialization │ Error Handling   │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│              Business Logic Layer                │
│  POS │ Inventory │ Accounting │ CRM │ ...      │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│              Data Access Layer                   │
│  PostgreSQL │ Redis │ Object Storage             │
└─────────────────────────────────────────────────┘
```

---

## Authentication

### Authentication Methods

| Method | Use Case | Header |
|--------|----------|--------|
| **Session Cookie** | Web application | `Cookie: session={token}` |
| **Bearer Token (JWT)** | Mobile apps, SPA | `Authorization: Bearer {jwt}` |
| **API Key** | Server-to-server integrations | `X-API-Key: {key}` |

### JWT Token Structure

```json
{
  "sub": "user-uuid",
  "tid": "tenant-uuid",
  "bid": "active-branch-uuid",
  "roles": ["branch_manager"],
  "permissions": ["pos.sale.create", "inventory.item.view"],
  "iat": 1720569600,
  "exp": 1720570500,
  "iss": "goldos.com"
}
```

| Claim | Description |
|-------|-------------|
| `sub` | User ID |
| `tid` | Tenant ID |
| `bid` | Active branch ID |
| `roles` | User role codes |
| `permissions` | Flattened permission list |
| `iat` | Issued at (Unix timestamp) |
| `exp` | Expiration (15 minutes for access token) |
| `iss` | Issuer |

### Token Lifecycle

| Token | Lifetime | Storage | Refresh |
|-------|----------|---------|---------|
| Access Token (JWT) | 15 minutes | Memory (client) | Via refresh token |
| Refresh Token | 7 days | HTTP-only secure cookie / secure storage | Rotated on use |
| API Key | Configurable (30–365 days) | Client secure storage | Manual rotation |
| Session Cookie | 30 min idle / 12 hr absolute | HTTP-only secure cookie | Automatic on activity |

### API Key Management

```
POST   /v1/admin/api-keys          Create API key
GET    /v1/admin/api-keys          List API keys
DELETE /v1/admin/api-keys/{id}     Revoke API key
```

API key attributes:
- Name and description
- Permission scope (subset of creator's permissions)
- IP whitelist (optional)
- Expiration date
- Rate limit override (optional)
- Last used timestamp

---

## Request & Response Format

### Standard Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes (except public) | Bearer token or API key |
| `Content-Type` | Yes (for POST/PUT/PATCH) | `application/json` |
| `Accept` | No | `application/json` (default) |
| `X-Idempotency-Key` | For POST (financial) | UUID for idempotent operations |
| `X-Branch-Id` | For multi-branch users | Override active branch |
| `Accept-Language` | No | `en`, `ar` (for localized errors) |

### Standard Response Envelope

**Success (single resource):**
```json
{
  "data": {
    "id": "uuid",
    "type": "product",
    "attributes": { ... }
  },
  "meta": {
    "request_id": "req-uuid"
  }
}
```

**Success (collection):**
```json
{
  "data": [
    { "id": "uuid", "type": "product", "attributes": { ... } },
    { "id": "uuid", "type": "product", "attributes": { ... } }
  ],
  "meta": {
    "request_id": "req-uuid",
    "pagination": {
      "page": 1,
      "per_page": 25,
      "total_pages": 10,
      "total_count": 250
    }
  }
}
```

**Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The given data was invalid.",
    "details": [
      {
        "field": "email",
        "code": "REQUIRED",
        "message": "Email is required."
      }
    ],
    "request_id": "req-uuid"
  }
}
```

### HTTP Status Codes

| Code | Usage |
|------|-------|
| `200 OK` | Successful GET, PUT, PATCH |
| `201 Created` | Successful POST (resource created) |
| `204 No Content` | Successful DELETE |
| `400 Bad Request` | Validation error, malformed request |
| `401 Unauthorized` | Missing or invalid authentication |
| `403 Forbidden` | Valid auth but insufficient permissions |
| `404 Not Found` | Resource not found (or not in tenant scope) |
| `409 Conflict` | Duplicate, version conflict, state conflict |
| `422 Unprocessable Entity` | Business rule violation |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Unexpected server error |
| `503 Service Unavailable` | Maintenance or overload |

### Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | No valid credentials |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `TOKEN_EXPIRED` | 401 | JWT expired |
| `ACCOUNT_LOCKED` | 401 | Too many failed attempts |
| `PERMISSION_DENIED` | 403 | Insufficient permissions |
| `TENANT_SUSPENDED` | 403 | Tenant account suspended |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `BUSINESS_RULE_VIOLATION` | 422 | Business logic rejected action |
| `DUPLICATE_ENTRY` | 409 | Unique constraint violation |
| `VERSION_CONFLICT` | 409 | Optimistic locking failure |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `PLAN_LIMIT_REACHED` | 422 | Subscription plan limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected error |

---

## API Endpoints by Module

### Authentication (`/v1/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Login with email/password | Public |
| POST | `/auth/logout` | Invalidate session | Required |
| POST | `/auth/refresh` | Refresh access token | Refresh token |
| POST | `/auth/forgot-password` | Request password reset | Public |
| POST | `/auth/reset-password` | Reset password with token | Public |
| POST | `/auth/verify-2fa` | Submit 2FA code | Partial auth |
| GET | `/auth/me` | Current user profile | Required |
| PUT | `/auth/me/password` | Change password | Required |
| GET | `/auth/sessions` | List active sessions | Required |
| DELETE | `/auth/sessions/{id}` | Terminate session | Required |

### Tenant & Branch Management (`/v1/admin`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/admin/tenant` | Get tenant details | `admin.settings.view` |
| PUT | `/admin/tenant` | Update tenant settings | `admin.settings.manage` |
| GET | `/admin/branches` | List branches | `admin.branch.view` |
| POST | `/admin/branches` | Create branch | `admin.branch.create` |
| GET | `/admin/branches/{id}` | Get branch | `admin.branch.view` |
| PUT | `/admin/branches/{id}` | Update branch | `admin.branch.update` |
| DELETE | `/admin/branches/{id}` | Deactivate branch | `admin.branch.delete` |
| GET | `/admin/users` | List employees | `admin.user.view` |
| POST | `/admin/users` | Create/invite employee | `admin.user.create` |
| PUT | `/admin/users/{id}` | Update employee | `admin.user.update` |
| DELETE | `/admin/users/{id}` | Deactivate employee | `admin.user.delete` |
| GET | `/admin/roles` | List roles | `admin.role.view` |
| POST | `/admin/roles` | Create custom role | `admin.role.create` |
| GET | `/admin/audit-logs` | Search audit logs | `admin.audit.view` |

### Point of Sale (`/v1/pos`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/pos/products/search` | Search products for POS | `pos.sale.create` |
| GET | `/pos/products/barcode/{code}` | Lookup by barcode | `pos.sale.create` |
| POST | `/pos/invoices` | Create sale invoice | `pos.sale.create` |
| GET | `/pos/invoices` | List invoices | `pos.sale.view` |
| GET | `/pos/invoices/{id}` | Get invoice details | `pos.sale.view` |
| POST | `/pos/invoices/{id}/void` | Void invoice | `pos.sale.void` |
| POST | `/pos/invoices/{id}/return` | Process return | `pos.sale.void` |
| POST | `/pos/invoices/{id}/payments` | Add payment | `pos.sale.create` |
| GET | `/pos/shifts/current` | Get current shift | `pos.sale.create` |
| POST | `/pos/shifts/open` | Open shift | `pos.sale.create` |
| POST | `/pos/shifts/close` | Close shift | `pos.sale.create` |
| GET | `/pos/shifts/{id}/report` | Shift report | `pos.sale.view` |
| POST | `/pos/holds` | Create hold/layaway | `pos.sale.create` |
| GET | `/pos/gold-rates` | Current gold rates | `pos.sale.create` |

### Inventory (`/v1/inventory`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/inventory/products` | List products | `inventory.product.view` |
| POST | `/inventory/products` | Create product | `inventory.product.create` |
| GET | `/inventory/products/{id}` | Get product | `inventory.product.view` |
| PUT | `/inventory/products/{id}` | Update product | `inventory.product.update` |
| GET | `/inventory/items` | List inventory items | `inventory.item.view` |
| POST | `/inventory/items` | Create inventory item | `inventory.item.create` |
| GET | `/inventory/items/{id}` | Get item details | `inventory.item.view` |
| PUT | `/inventory/items/{id}` | Update item | `inventory.item.update` |
| POST | `/inventory/items/{id}/adjust` | Stock adjustment | `inventory.item.update` |
| GET | `/inventory/items/barcode/{code}` | Lookup by barcode | `inventory.item.view` |
| POST | `/inventory/items/batch-labels` | Generate barcode labels | `inventory.item.create` |
| GET | `/inventory/gold-rates` | List current rates | `inventory.rate.view` |
| POST | `/inventory/gold-rates` | Set gold rates | `inventory.rate.manage` |
| GET | `/inventory/gold-rates/history` | Rate history | `inventory.rate.view` |
| GET | `/inventory/valuation` | Inventory valuation report | `inventory.item.view` |
| GET | `/inventory/categories` | List categories | `inventory.product.view` |
| POST | `/inventory/categories` | Create category | `inventory.product.create` |

### Transfers (`/v1/transfers`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/transfers` | List transfers | `transfers.view` |
| POST | `/transfers` | Create transfer | `transfers.create` |
| GET | `/transfers/{id}` | Get transfer details | `transfers.view` |
| PUT | `/transfers/{id}` | Update draft transfer | `transfers.create` |
| POST | `/transfers/{id}/submit` | Submit for approval | `transfers.create` |
| POST | `/transfers/{id}/approve` | Approve transfer | `transfers.approve` |
| POST | `/transfers/{id}/reject` | Reject transfer | `transfers.approve` |
| POST | `/transfers/{id}/dispatch` | Mark as dispatched | `transfers.create` |
| POST | `/transfers/{id}/receive` | Confirm receipt | `transfers.receive` |
| POST | `/transfers/{id}/complete` | Complete transfer | `transfers.receive` |

### Customers (`/v1/customers`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/customers` | List customers | `crm.customer.view` |
| POST | `/customers` | Create customer | `crm.customer.create` |
| GET | `/customers/{id}` | Get customer | `crm.customer.view` |
| PUT | `/customers/{id}` | Update customer | `crm.customer.update` |
| GET | `/customers/{id}/history` | Purchase history | `crm.customer.view` |
| GET | `/customers/search` | Quick search (POS) | `crm.customer.view` |
| POST | `/customers/{id}/payments` | Record payment | `accounting.ar.manage` |

### Suppliers & Purchasing (`/v1/purchasing`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/purchasing/suppliers` | List suppliers | `purchasing.supplier.view` |
| POST | `/purchasing/suppliers` | Create supplier | `purchasing.supplier.create` |
| GET | `/purchasing/purchase-orders` | List POs | `purchasing.po.view` |
| POST | `/purchasing/purchase-orders` | Create PO | `purchasing.po.create` |
| POST | `/purchasing/purchase-orders/{id}/receive` | Receive goods | `purchasing.po.receive` |
| POST | `/purchasing/suppliers/{id}/payments` | Record payment | `accounting.ap.manage` |

### Workshop (`/v1/workshop`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/workshop/work-orders` | List work orders | `workshop.order.view` |
| POST | `/workshop/work-orders` | Create work order | `workshop.order.create` |
| GET | `/workshop/work-orders/{id}` | Get work order | `workshop.order.view` |
| PUT | `/workshop/work-orders/{id}` | Update work order | `workshop.order.update` |
| POST | `/workshop/work-orders/{id}/materials` | Record material usage | `workshop.order.update` |
| POST | `/workshop/work-orders/{id}/wastage` | Record wastage | `workshop.order.update` |
| POST | `/workshop/work-orders/{id}/complete` | Complete work order | `workshop.order.update` |

### Accounting (`/v1/accounting`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/accounting/accounts` | Chart of accounts | `accounting.coa.view` |
| GET | `/accounting/journal-entries` | List entries | `accounting.journal.view` |
| POST | `/accounting/journal-entries` | Create manual entry | `accounting.journal.create` |
| GET | `/accounting/reports/trial-balance` | Trial balance | `accounting.report.view` |
| GET | `/accounting/reports/profit-loss` | P&L report | `accounting.report.view` |
| GET | `/accounting/reports/balance-sheet` | Balance sheet | `accounting.report.view` |
| GET | `/accounting/receivables` | AR aging | `accounting.ar.view` |
| GET | `/accounting/payables` | AP aging | `accounting.ap.view` |

### Reports (`/v1/reports`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/reports/dashboard/owner` | Owner dashboard | `reports.dashboard.view` |
| GET | `/reports/dashboard/branch` | Branch dashboard | `reports.dashboard.view` |
| GET | `/reports/sales/daily` | Daily sales report | `reports.sales.view` |
| GET | `/reports/sales/summary` | Sales summary | `reports.sales.view` |
| GET | `/reports/inventory/stock` | Stock report | `reports.inventory.view` |
| POST | `/reports/export` | Export report | `reports.export` |
| GET | `/reports/scheduled` | List scheduled reports | `reports.schedule.view` |
| POST | `/reports/scheduled` | Create scheduled report | `reports.schedule.manage` |

### Files (`/v1/files`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/files/upload` | Upload file | Authenticated |
| GET | `/files/{id}` | Get file metadata | Authenticated |
| GET | `/files/{id}/download` | Download file | Authenticated |
| DELETE | `/files/{id}` | Delete file | File owner or admin |

---

## Pagination, Filtering & Sorting

### Pagination

```
GET /v1/inventory/products?page=2&per_page=25
```

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `page` | 1 | — | Page number |
| `per_page` | 25 | 100 | Items per page |

Response includes pagination metadata in `meta.pagination`.

### Filtering

```
GET /v1/inventory/items?filter[status]=in_stock&filter[karat]=21K&filter[branch_id]=uuid
```

- Filters use `filter[field]=value` syntax
- Multiple filters are AND-ed
- Supported operators: `eq` (default), `gt`, `lt`, `gte`, `lte`, `in`, `like`
- Example: `filter[weight][gte]=5.0&filter[weight][lte]=10.0`

### Sorting

```
GET /v1/inventory/products?sort=-created_at,name
```

- Comma-separated field names
- Prefix `-` for descending order
- Default sort varies by endpoint (typically `-created_at`)

### Field Selection

```
GET /v1/inventory/products?fields=id,name,sku,karat
```

- Reduce response payload by selecting specific fields
- Related resources: `?include=category,images`

### Search

```
GET /v1/inventory/products?q=gold+ring
GET /v1/customers?q=ahmed
```

- Full-text search via `q` parameter
- Searches across name, SKU, barcode, phone, email (varies by endpoint)

---

## Rate Limiting

### Default Limits

| Scope | Limit | Window |
|-------|-------|--------|
| Per user | 300 requests | 1 minute |
| Per tenant | 1,000 requests | 1 minute |
| Per API key | 600 requests | 1 minute |
| Login endpoint | 10 requests | 15 minutes (per IP) |
| File upload | 20 requests | 1 minute |
| Report generation | 5 concurrent | — |

### Rate Limit Headers

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 287
X-RateLimit-Reset: 1720570500
```

### Rate Limit Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please retry after 45 seconds.",
    "retry_after": 45
  }
}
```

---

## Webhooks

### Webhook Configuration

```
POST   /v1/admin/webhooks          Create webhook
GET    /v1/admin/webhooks          List webhooks
PUT    /v1/admin/webhooks/{id}     Update webhook
DELETE /v1/admin/webhooks/{id}     Delete webhook
```

### Webhook Payload

```json
{
  "id": "evt-uuid",
  "type": "invoice.completed",
  "tenant_id": "tenant-uuid",
  "created_at": "2026-07-10T12:00:00Z",
  "data": {
    "id": "invoice-uuid",
    "invoice_number": "INV-2026-00001",
    "total": 15000.00,
    "branch_id": "branch-uuid"
  }
}
```

### Supported Events

| Event | Description |
|-------|-------------|
| `invoice.completed` | Sale invoice finalized |
| `invoice.voided` | Invoice voided |
| `transfer.completed` | Inter-branch transfer completed |
| `inventory.low_stock` | Stock below threshold |
| `work_order.completed` | Workshop job completed |
| `customer.created` | New customer registered |
| `gold_rate.updated` | Gold rates changed |
| `payment.received` | Customer payment recorded |

### Webhook Security

- HMAC-SHA256 signature in `X-GoldOS-Signature` header
- Signature computed over raw request body with webhook secret
- Timestamp in `X-GoldOS-Timestamp` (reject if > 5 minutes old)
- Retry policy: 3 attempts with exponential backoff (1min, 5min, 30min)
- Webhook logs available for debugging

---

## API Versioning

### Version Strategy

- Version in URL path: `/v1/`, `/v2/`
- Major version bump for breaking changes only
- Non-breaking additions (new endpoints, new optional fields) within same version

### Deprecation Policy

1. Announce deprecation via API response header: `Deprecation: true`
2. Provide sunset date in header: `Sunset: Sat, 01 Jan 2028 00:00:00 GMT`
3. Minimum 12 months between deprecation announcement and removal
4. Deprecated endpoints documented in changelog
5. Migration guide provided for breaking changes

### Breaking vs. Non-Breaking Changes

| Breaking | Non-Breaking |
|----------|-------------|
| Removing an endpoint | Adding a new endpoint |
| Removing a response field | Adding a new optional response field |
| Changing field type | Adding a new optional request field |
| Changing URL structure | Adding new enum values |
| Changing authentication method | Adding new error codes |

---

## Real-Time API (WebSocket)

### Connection

```
wss://api.goldos.com/v1/ws?token={jwt}
```

### Use Cases

| Channel | Events | Use Case |
|---------|--------|----------|
| `pos.{branch_id}` | New sale, shift update | Branch manager live view |
| `notifications.{user_id}` | New notification | Real-time notification bell |
| `inventory.{branch_id}` | Stock change, low stock | Inventory alerts |
| `transfers.{tenant_id}` | Transfer status change | Transfer tracking |
| `gold_rates.{tenant_id}` | Rate update | POS price refresh |

### Message Format

```json
{
  "channel": "pos.branch-uuid",
  "event": "sale.completed",
  "data": { ... },
  "timestamp": "2026-07-10T12:00:00Z"
}
```

---

## SDK & Client Libraries (Planned)

| Language/Platform | Priority | Phase |
|-------------------|----------|-------|
| JavaScript/TypeScript | P1 | Phase 2 |
| Python | P2 | Phase 2 |
| PHP | P2 | Phase 3 |
| Mobile (React Native) | P1 | Phase 2 |
| Postman Collection | P1 | Phase 1 |

---

## OpenAPI Documentation

- Auto-generated from code annotations/decorators
- Available at: `https://api.goldos.com/v1/docs`
- Interactive Swagger UI for testing
- Updated on every deployment
- Includes authentication flow, all endpoints, schemas, and examples

---

## Document References

| Document | Purpose |
|----------|---------|
| [07-security.md](./07-security.md) | API security controls |
| [03-user-roles.md](./03-user-roles.md) | Permission definitions for endpoints |
| [09-database-overview.md](./09-database-overview.md) | Data model behind APIs |
| [05-functional-requirements.md](./05-functional-requirements.md) | Feature requirements driving APIs |

---

*This document is maintained by the Architecture and API teams. All endpoint changes require API review and OpenAPI spec update.*
