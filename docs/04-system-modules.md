# GoldOS — System Modules

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026  
**Classification:** Internal — Architecture

---

## Purpose

This document describes the modular architecture of GoldOS — the major functional modules, their responsibilities, boundaries, interactions, and dependencies. The modular design enables independent development, testing, deployment, and scaling of each domain area.

---

## Architecture Overview

GoldOS follows a **modular monolith** architecture in its initial phases, with clear module boundaries that can evolve into microservices as scale demands. Each module owns its domain logic, data access, and API surface.

```
┌─────────────────────────────────────────────────────────────────┐
│                        GoldOS Platform                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │   Web    │  │  Mobile  │  │   API    │  │  Admin Panel │   │
│  │   App    │  │   Apps   │  │ Gateway  │  │  (Platform)  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│       └──────────────┴───────────┴───────────────┘             │
│                              │                                  │
│  ┌───────────────────────────┴───────────────────────────────┐  │
│  │                    Core Platform Services                  │  │
│  │  Auth │ Tenant │ RBAC │ Audit │ Notifications │ Files    │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                  │
│  ┌──────────┬──────────┬─────┴────┬──────────┬──────────┐    │
│  │   POS    │Inventory │Accounting│   CRM    │    HR    │    │
│  ├──────────┼──────────┼──────────┼──────────┼──────────┤    │
│  │Workshop  │Purchasing│Transfers │ Reports  │    AI    │    │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘    │
│                              │                                  │
│  ┌───────────────────────────┴───────────────────────────────┐  │
│  │              Data Layer (PostgreSQL + Redis)               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Platform Services

These services are shared infrastructure used by all business modules.

### Module: Authentication & Identity (`auth`)

**Responsibility:** User authentication, session management, 2FA, password policies, SSO (future).

| Capability | Description |
|------------|-------------|
| Login/Logout | Email + password authentication with rate limiting |
| Session Management | Token-based sessions with configurable timeout |
| 2FA | TOTP, SMS, hardware key support |
| Password Management | Reset, change, complexity enforcement |
| OAuth/SSO | Google, Microsoft SSO (Enterprise, future) |
| Device Management | Trusted devices, session listing, force logout |

**Dependencies:** Tenant Module, Audit Module  
**Consumers:** All modules

---

### Module: Tenant Management (`tenant`)

**Responsibility:** Multi-tenant lifecycle, subscription management, tenant configuration.

| Capability | Description |
|------------|-------------|
| Tenant Provisioning | Create, configure, and onboard new tenants |
| Subscription Management | Plan assignment, feature flags, usage limits |
| Tenant Settings | Currency, timezone, locale, tax configuration |
| Branch Management | Create and configure branches |
| Onboarding Wizard | Guided setup for new tenants |
| Tenant Deprovisioning | Data export, grace period, account deletion |

**Dependencies:** Billing (external), Audit Module  
**Consumers:** All modules

---

### Module: Role-Based Access Control (`rbac`)

**Responsibility:** Permission definitions, role management, access enforcement.

| Capability | Description |
|------------|-------------|
| Permission Registry | Central catalog of all system permissions |
| Role Management | System and custom role CRUD |
| User-Role Assignment | Assign roles to users with branch scoping |
| Permission Checking | Middleware/guard for API and UI access |
| Access Review | Reports on user permissions |

**Dependencies:** Auth Module, Tenant Module  
**Consumers:** All modules

---

### Module: Audit & Compliance (`audit`)

**Responsibility:** Immutable audit trail for all system actions.

| Capability | Description |
|------------|-------------|
| Action Logging | Log all CRUD and business actions |
| Change Tracking | Before/after values for modifications |
| Audit Search | Filter and search audit logs |
| Compliance Reports | Export audit data for regulatory review |
| Retention Management | Configurable retention policies |

**Dependencies:** Auth Module, Tenant Module  
**Consumers:** All modules (write-only from business modules)

---

### Module: Notifications (`notifications`)

**Responsibility:** Multi-channel notification delivery and preference management.

| Capability | Description |
|------------|-------------|
| In-App Notifications | Real-time notification center |
| Email | Transactional and marketing emails |
| SMS | OTP and alert messages |
| Push Notifications | Mobile app push via FCM/APNs |
| WhatsApp | Business API integration (regional) |
| Templates | Configurable notification templates |
| Preferences | Per-user channel and event preferences |
| Scheduling | Delayed and recurring notifications |

**Dependencies:** Tenant Module, Auth Module  
**Consumers:** All business modules

---

### Module: File & Media Management (`files`)

**Responsibility:** Upload, storage, and retrieval of files and images.

| Capability | Description |
|------------|-------------|
| Image Upload | Product photos, employee avatars, logos |
| Document Storage | Invoices, contracts, ID documents |
| Barcode/QR Generation | Generate and store barcode/QR images |
| CDN Delivery | Optimized delivery via CDN |
| Access Control | Tenant-scoped file access |

**Dependencies:** Tenant Module  
**Consumers:** Inventory, POS, CRM, HR modules

---

## Business Modules

### Module: Point of Sale (`pos`)

**Responsibility:** In-store sales operations, invoicing, payments, and receipt management.

| Capability | Description |
|------------|-------------|
| Sales Terminal | Fast, touch-optimized sales interface |
| Product Lookup | Search, barcode/QR scan, category browse |
| Karat & Weight Entry | Gold-specific pricing inputs |
| Payment Processing | Multi-method payment, split payments |
| Gold Exchange | Trade-in old gold as payment |
| Discounts | Percentage/fixed discounts with approval workflow |
| Hold & Layaway | Reserve items with deposit |
| Invoice Generation | Auto-numbered invoices with templates |
| Receipt Printing | Thermal and A4 printing |
| Shift Management | Open/close shift with cash reconciliation |
| Returns | Process returns against original invoice |
| Void | Void transactions with authorization |
| Offline Mode | Limited offline sales with sync (mobile, future) |

**Dependencies:** Inventory, CRM, Accounting, Auth, RBAC, Notifications, Files  
**Key Integrations:** Payment gateways, receipt printers, barcode scanners

---

### Module: Inventory Management (`inventory`)

**Responsibility:** Gold and jewelry inventory tracking, valuation, and lifecycle management.

| Capability | Description |
|------------|-------------|
| Product Catalog | Categories, attributes, karat, making charges |
| Serialized Items | Individual pieces with barcode/QR, exact weight |
| Bulk Inventory | Raw gold, casting grain by total weight |
| Stock Levels | Real-time stock per branch and location |
| Gold Rate Management | Spot rates per karat, historical tracking |
| Pricing Engine | Auto-calculate selling price from rate + charges |
| Barcode/QR | Generation, printing, scanning |
| Stock Adjustments | Manual adjustments with reason and approval |
| Stock Valuation | Weighted average, FIFO valuation |
| Low Stock Alerts | Configurable thresholds and notifications |
| Inventory Reports | Stock listing, valuation, movement history |
| Item Lifecycle | Status tracking (in stock, sold, in transit, etc.) |

**Dependencies:** Tenant, Auth, RBAC, Audit, Files, Notifications  
**Consumers:** POS, Transfers, Workshop, Purchasing, Reports

---

### Module: Inter-Branch Transfers (`transfers`)

**Responsibility:** Inventory movement between branches with approval and reconciliation.

| Capability | Description |
|------------|-------------|
| Transfer Creation | Select items, source, destination |
| Approval Workflow | Multi-level approval based on value |
| In-Transit Tracking | Items marked in transit, unavailable at both ends |
| Receipt Confirmation | Destination confirms with weight verification |
| Discrepancy Handling | Flag and resolve weight differences |
| Transfer History | Full audit trail of all transfers |
| Accounting Integration | Auto-generate journal entries on completion |

**Dependencies:** Inventory, Auth, RBAC, Audit, Notifications, Accounting  
**Consumers:** Reports

---

### Module: Purchasing & Suppliers (`purchasing`)

**Responsibility:** Supplier management, purchase orders, and goods receipt.

| Capability | Description |
|------------|-------------|
| Supplier Registry | Supplier profiles, contacts, payment terms |
| Purchase Orders | Create, send, track POs |
| Goods Receipt | Receive and verify delivered goods |
| Gold Purchasing | Weight, karat verification, pricing at buy rate |
| Supplier Ledger | Running balance, payment history |
| Payment Recording | Record payments against supplier account |
| Supplier Reports | Aging, purchase history, performance |

**Dependencies:** Inventory, Accounting, Auth, RBAC, Audit, Notifications  
**Consumers:** Reports

---

### Module: Workshop & Manufacturing (`workshop`)

**Responsibility:** In-house manufacturing, repairs, and custom orders.

| Capability | Description |
|------------|-------------|
| Work Orders | Create, assign, track manufacturing jobs |
| Material Management | Workshop raw material inventory |
| Material Consumption | Record materials used per work order |
| Wastage Tracking | Expected vs. actual wastage per process |
| Labor Tracking | Record labor hours and costs |
| Cost Allocation | Calculate total piece cost (material + labor + wastage) |
| Work Order Completion | Produce finished item into inventory |
| Customer Repairs | Track customer items through repair process |
| Workshop Reports | Productivity, material usage, wastage analysis |

**Dependencies:** Inventory, Auth, RBAC, Audit, Notifications, CRM  
**Consumers:** POS (direct invoicing), Reports, Accounting

---

### Module: Customer Relationship Management (`crm`)

**Responsibility:** Customer profiles, purchase history, loyalty, and communication.

| Capability | Description |
|------------|-------------|
| Customer Profiles | Contact info, ID documents, preferences |
| Purchase History | All transactions linked to customer |
| Credit Management | Credit limits, outstanding balance |
| Loyalty Program | Points earning and redemption |
| Customer Segmentation | Tiers (regular, VIP, wholesale) |
| Communication Log | History of all customer interactions |
| Marketing Campaigns | Targeted campaigns with consent management |
| Customer Portal | Self-service order tracking (future) |

**Dependencies:** Auth, RBAC, Audit, Notifications, Files  
**Consumers:** POS, Reports

---

### Module: Accounting & Finance (`accounting`)

**Responsibility:** Financial records, journal entries, ledgers, and financial reporting.

| Capability | Description |
|------------|-------------|
| Chart of Accounts | Configurable account structure |
| Journal Entries | Manual and automatic entries |
| General Ledger | All transactions by account |
| Accounts Receivable | Customer outstanding and aging |
| Accounts Payable | Supplier outstanding and aging |
| Bank Reconciliation | Match bank statements (future) |
| Financial Reports | P&L, Balance Sheet, Trial Balance, Cash Flow |
| Tax Management | Configurable tax rules and reporting |
| Period Management | Fiscal periods, close, and lock |
| Multi-Currency | Transaction and reporting currency support |
| Export | Export to external accounting systems |

**Dependencies:** Tenant, Auth, RBAC, Audit  
**Consumers:** POS, Purchasing, Transfers, Workshop, Reports

---

### Module: Human Resources (`hr`)

**Responsibility:** Employee management, attendance, shifts, and commissions.

| Capability | Description |
|------------|-------------|
| Employee Records | Personal info, employment details, documents |
| Attendance | Clock-in/out, shift tracking |
| Shift Scheduling | Define and assign shift schedules |
| Leave Management | Request and approve leave (future) |
| Commission Tracking | Auto-calculate from sales data |
| Commission Reports | Per-employee commission statements |
| Payroll Data | Salary records (processing in future phase) |
| Employee Self-Service | View own attendance, commission (future) |

**Dependencies:** Auth, RBAC, Audit, Notifications, Files  
**Consumers:** POS (commission), Reports

---

### Module: Reports & Analytics (`reports`)

**Responsibility:** Business intelligence, dashboards, and report generation.

| Capability | Description |
|------------|-------------|
| Dashboard Engine | Configurable real-time dashboards |
| Standard Reports | Pre-built reports for all modules |
| Custom Reports | Report builder with filters and grouping (Enterprise) |
| Scheduled Reports | Auto-generate and email on schedule |
| Export | PDF, Excel, CSV export |
| Data Visualization | Charts, graphs, trend lines |
| Comparative Analysis | Branch comparison, period comparison |
| KPI Tracking | Key performance indicators with targets |

**Dependencies:** All business modules (read-only), Auth, RBAC  
**Consumers:** Web App, Mobile Apps, API

---

### Module: AI Assistant (`ai`)

**Responsibility:** Intelligent assistance, predictions, and automation.

| Capability | Description |
|------------|-------------|
| Conversational Assistant | Natural language queries about business data |
| Pricing Recommendations | Suggest optimal pricing based on market data |
| Demand Forecasting | Predict inventory needs by category/karat |
| Anomaly Detection | Flag unusual transactions or inventory discrepancies |
| Smart Search | Semantic search across products, customers, invoices |
| Report Narration | Auto-generate narrative summaries of reports |
| Workflow Suggestions | Recommend operational improvements |

**Dependencies:** All business modules (read-only), Auth, RBAC  
**Consumers:** Web App, Mobile Apps, API  
**Phase:** Introduced in Phase 2 (see roadmap)

---

## Module Interaction Map

### Sales Flow (POS → Accounting → CRM)

```
Customer selects items → POS calculates price (Inventory rates)
  → Payment processed → Invoice created
  → Accounting: journal entry generated
  → CRM: customer purchase history updated
  → Inventory: items marked sold
  → HR: commission calculated
  → Notifications: receipt sent to customer
  → Audit: all actions logged
```

### Transfer Flow

```
Inventory Manager creates transfer → Approval workflow
  → Source branch: items marked in-transit
  → Destination receives → Weight verification
  → Discrepancy resolution (if any)
  → Items added to destination stock
  → Accounting: inter-branch journal entry
  → Audit: full trail logged
```

### Workshop Flow

```
Work order created → Materials allocated from workshop stock
  → Technician processes → Wastage recorded
  → Work order completed → Finished item created
  → Item cost = materials + labor + wastage
  → Item enters branch inventory (or direct sale via POS)
  → Accounting: cost entries generated
```

---

## Module Deployment & Scaling Strategy

### Phase 1: Modular Monolith

All modules deployed as a single application with clear internal boundaries:
- Shared database with schema-per-module organization
- Internal module APIs (function calls, not HTTP)
- Single deployment unit
- Simpler operations, faster development

### Phase 2: Selective Service Extraction

High-load or independently scaling modules extracted:
- **Notifications** — High volume, async processing
- **Reports** — Heavy queries, can use read replicas
- **AI** — GPU resources, different scaling profile
- **Files** — Object storage, CDN integration

### Phase 3: Full Microservices (if needed)

Remaining modules extracted based on:
- Independent scaling requirements
- Team ownership boundaries
- Deployment frequency differences
- Fault isolation needs

---

## Module Maturity Levels

| Level | Description | Criteria |
|-------|-------------|----------|
| **L0 — Planned** | Documented, not yet developed | Requirements defined |
| **L1 — MVP** | Core functionality, limited edge cases | Usable for primary workflows |
| **L2 — Production** | Full functionality, tested, performant | Ready for all tenant tiers |
| **L3 — Enterprise** | Advanced features, SLA, integrations | Ready for large chains |
| **L4 — AI-Enhanced** | ML/AI capabilities integrated | Intelligent automation active |

### Current Target Maturity (Phase 1 Launch)

| Module | Target Level |
|--------|-------------|
| Auth | L2 |
| Tenant | L2 |
| RBAC | L2 |
| Audit | L2 |
| Notifications | L1 |
| Files | L1 |
| POS | L2 |
| Inventory | L2 |
| Transfers | L1 |
| Purchasing | L1 |
| Workshop | L1 |
| CRM | L1 |
| Accounting | L1 |
| HR | L1 |
| Reports | L1 |
| AI | L0 |

---

## Document References

| Document | Purpose |
|----------|---------|
| [05-functional-requirements.md](./05-functional-requirements.md) | Detailed feature specifications per module |
| [10-api-architecture.md](./10-api-architecture.md) | API design per module |
| [09-database-overview.md](./09-database-overview.md) | Data model per module |
| [12-development-roadmap.md](./12-development-roadmap.md) | Module delivery timeline |

---

*This document is maintained by the Architecture team and updated as modules are added, modified, or restructured.*
