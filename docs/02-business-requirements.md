# GoldOS — Business Requirements

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026  
**Classification:** Internal — Product

---

## Purpose

This document defines the business rules, domain logic, and operational requirements that govern how GoldOS behaves. These requirements reflect the real-world practices of jewelry and gold retail businesses and serve as the authoritative reference for product, engineering, and QA teams.

---

## Domain Overview

GoldOS operates within the **precious metals and jewelry retail domain**, which has distinct business characteristics:

- Products are valued by **weight (grams)**, **purity (karat)**, **craftsmanship (making charges)**, and **stones (carat, clarity, cut)**
- **Spot gold prices** fluctuate daily and affect inventory valuation and selling prices
- **High transaction values** require rigorous audit trails and approval workflows
- **Workshop operations** transform raw materials into finished goods with measurable wastage
- **Multi-branch chains** require inventory mobility, consolidated reporting, and centralized policy control

---

## Business Entities

### Organizational Hierarchy

```
Platform (GoldOS)
└── Tenant (Company)
    ├── Subscription & Billing
    ├── Global Settings & Policies
    └── Branches (1..N)
        ├── Employees (1..N)
        ├── Inventory Locations
        ├── POS Terminals
        ├── Workshop (optional)
        └── Local Settings
```

### Core Business Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| **Tenant (Company)** | A subscribing jewelry business | Name, legal info, tax ID, currency, timezone, subscription plan |
| **Branch** | A physical store or warehouse location | Name, address, phone, operating hours, branch type (retail/warehouse/workshop) |
| **Employee** | A user belonging to a tenant | Name, role, branch assignment, employment status |
| **Customer** | End consumer or B2B buyer | Name, contact, ID documents, credit limit, loyalty tier |
| **Supplier** | Gold supplier, stone vendor, or service provider | Name, contact, payment terms, ledger balance |
| **Product** | A sellable or trackable item | SKU, name, category, karat, weight, making charges, stones |
| **Inventory Item** | A physical instance of a product at a branch | Barcode, QR, weight, location, status |
| **Invoice** | A sales or purchase document | Number, date, line items, taxes, payment status |
| **Transfer** | Movement of inventory between branches | Source, destination, items, approval status |
| **Work Order** | Manufacturing/repair job in workshop | Customer, items, labor, materials, status |
| **Journal Entry** | Accounting transaction | Debit/credit accounts, amount, reference |

---

## Business Rules — Gold & Inventory

### BR-INV-001: Karat Management

The system shall support standard gold karats: **24K, 22K, 21K, 18K, 14K, 10K**, plus configurable custom karats. Each karat has a defined purity percentage (e.g., 21K = 87.5% pure gold).

### BR-INV-002: Weight Precision

All gold weights shall be stored and calculated to **3 decimal places (milligrams)**. Display precision may be configured per tenant (2 or 3 decimals). Rounding rules must be consistent and documented.

### BR-INV-003: Spot Gold Rate Integration

- Gold selling and buying prices shall be derived from configurable **spot gold rates** per karat
- Rates can be updated manually, via API feed, or on a schedule
- Rate changes shall be logged with timestamp and user
- Historical rates must be preserved for audit and repricing

### BR-INV-004: Pricing Formula

Standard gold product pricing:

```
Selling Price = (Net Gold Weight × Rate per Gram) + Making Charges + Stone Value + Tax
```

Where:
- **Net Gold Weight** = Gross Weight − Stone Weight
- **Rate per Gram** = Spot Rate × (Karat Purity / 24)
- **Making Charges** = Fixed amount OR percentage of gold value OR per-gram charge
- **Stone Value** = Sum of stone prices (if applicable)

### BR-INV-005: Inventory Valuation

- Inventory shall be valued at **weighted average cost** by default
- Alternative methods (FIFO, specific identification) may be supported per tenant configuration
- Revaluation entries shall be generated when spot rates change (configurable)

### BR-INV-006: Barcode & QR Identity

- Every inventory item shall have a **unique barcode** and/or **QR code**
- Codes are generated at item creation (receipt, manufacturing, or manual entry)
- Scanning a code at POS shall instantly retrieve item details
- Codes are unique within a tenant; optionally globally unique across platform

### BR-INV-007: Item Status Lifecycle

| Status | Description |
|--------|-------------|
| `in_stock` | Available for sale at branch |
| `reserved` | Held for a customer or order |
| `in_transit` | Being transferred between branches |
| `in_workshop` | At workshop for manufacturing/repair |
| `sold` | Sold to customer |
| `returned` | Returned by customer (may return to stock or scrap) |
| `scrapped` | Written off or melted down |
| `lost` | Reported lost; pending investigation |

### BR-INV-008: Serialized vs. Bulk Inventory

- **Serialized items** — Individual pieces (rings, necklaces) tracked by unique barcode/QR with exact weight
- **Bulk items** — Gold grain, casting grain, raw materials tracked by total weight per branch/location
- Both types must coexist within the same inventory system

---

## Business Rules — Sales & POS

### BR-SALE-001: Invoice Numbering

- Invoice numbers shall be **auto-generated**, sequential, and unique per branch (or per tenant, configurable)
- Format: configurable prefix + sequential number (e.g., `INV-2026-00001`)
- No gaps in sequence unless explicitly voided with audit reason

### BR-SALE-002: Payment Methods

Supported payment methods (configurable per tenant):

- Cash
- Credit/Debit Card
- Bank Transfer
- Mobile Wallet
- Customer Credit (on account)
- Gold Exchange (old gold trade-in)
- Mixed (split across multiple methods)

### BR-SALE-003: Gold Exchange (Trade-In)

- Customer may trade old gold items as partial payment
- Trade-in gold is weighed, karat-tested, and priced at configured buy rate
- Trade-in value is deducted from invoice total
- Trade-in items enter inventory as scrap or raw gold at assessed value

### BR-SALE-004: Discounts & Approvals

- Discounts may be applied as percentage or fixed amount
- Discounts above a configurable threshold require **manager approval**
- All discounts are logged with reason and approver

### BR-SALE-005: Returns & Refunds

- Returns accepted within configurable return window (default: 7 days)
- Return must reference original invoice
- Refund method must match or be approved by manager
- Returned items revert to inventory or are scrapped based on condition
- Partial returns supported (individual line items)

### BR-SALE-006: Hold & Layaway

- Items can be placed on **hold** for a customer with deposit
- **Layaway** plans with scheduled payments supported
- Held items are marked `reserved` and excluded from available stock

### BR-SALE-007: Receipt & Invoice Printing

- Thermal receipt printing for POS
- A4/Tax invoice printing with full legal details
- Digital invoice delivery via email/SMS/WhatsApp
- Invoice templates configurable per tenant with logo, tax info, and terms

---

## Business Rules — Transfers

### BR-XFER-001: Inter-Branch Transfers

- Inventory can be transferred between branches within the same tenant
- Transfer requires: source branch, destination branch, items, and optional notes
- Transfer states: `draft` → `approved` → `in_transit` → `received` → `completed`
- Items in transit are not available at either branch

### BR-XFER-002: Transfer Approval

- Transfers above configurable value threshold require **manager approval**
- Source branch manager and/or destination branch manager may need to approve
- Rejected transfers return items to source branch stock

### BR-XFER-003: Transfer Reconciliation

- Destination branch must **confirm receipt** with actual weights
- Weight discrepancies are flagged and require resolution
- Transfer completion updates inventory at both branches and generates accounting entries

---

## Business Rules — Workshop & Manufacturing

### BR-WS-001: Work Order Types

| Type | Description |
|------|-------------|
| `manufacturing` | Create new piece from raw materials |
| `repair` | Fix or resize existing customer item |
| `custom_order` | Bespoke piece per customer specifications |
| `refining` | Melt and refine scrap gold |

### BR-WS-002: Material Consumption

- Raw materials (gold grain, stones, findings) are consumed from branch/workshop inventory
- Consumption is recorded with exact weight and linked to work order
- Material cost is allocated to the finished piece

### BR-WS-003: Wastage Tracking

- Workshop operations have expected wastage percentages per process (casting, filing, polishing)
- Actual wastage is recorded and compared to expected
- Wastage is accounted for in inventory (removed from stock) and cost (added to piece cost)

### BR-WS-004: Labor Charges

- Labor can be charged as flat fee, per-hour, or per-gram of finished weight
- Labor cost is added to the finished piece cost and optionally billed to customer

### BR-WS-005: Work Order Completion

- Completed work order produces a finished inventory item with full cost breakdown
- Item enters branch inventory or is directly invoiced to customer
- All material, labor, and wastage costs are captured in the item's cost basis

---

## Business Rules — Suppliers & Purchasing

### BR-PUR-001: Purchase Orders

- Purchase orders created for supplier deliveries
- PO states: `draft` → `sent` → `partial_received` → `received` → `closed`
- Received goods update inventory and generate supplier payable

### BR-PUR-002: Supplier Ledger

- Each supplier maintains a running balance (amount owed)
- Payments recorded against supplier account
- Aging report shows outstanding payables by period

### BR-PUR-003: Gold Purchasing

- Gold purchased from suppliers is weighed, karat-verified, and priced
- Purchase price = weight × rate per gram (buy rate)
- Purchased gold enters inventory as raw material or finished goods

---

## Business Rules — Customers & CRM

### BR-CRM-001: Customer Profile

- Customer record includes: personal info, contact, ID verification, preferences
- Purchase history, returns, and outstanding credit tracked per customer
- Customer segmentation by tier (regular, VIP, wholesale)

### BR-CRM-002: Customer Credit

- Credit limits configurable per customer
- Sales on credit create accounts receivable entries
- Credit utilization visible at POS before completing sale
- Overdue credit triggers alerts and may block new credit sales

### BR-CRM-003: Loyalty & Rewards

- Points earned per purchase (configurable rate)
- Points redeemable for discounts or gifts
- Loyalty tier upgrades based on cumulative spend

### BR-CRM-004: Customer Communication

- Automated notifications: invoice delivery, order ready, payment reminders
- Marketing campaigns (with consent management)
- Communication history logged per customer

---

## Business Rules — Accounting

### BR-ACC-001: Chart of Accounts

- Default chart of accounts provided per region/currency
- Tenants can customize accounts within framework
- Standard accounts: Cash, Bank, Inventory, Accounts Receivable, Accounts Payable, Sales Revenue, COGS, Wastage, Making Charges Revenue

### BR-ACC-002: Automatic Journal Entries

The following events shall automatically generate journal entries:

| Event | Debit | Credit |
|-------|-------|--------|
| Cash sale | Cash | Sales Revenue + Tax |
| Credit sale | Accounts Receivable | Sales Revenue + Tax |
| Purchase from supplier | Inventory | Accounts Payable |
| Supplier payment | Accounts Payable | Cash/Bank |
| Customer payment | Cash/Bank | Accounts Receivable |
| Inventory transfer | Inventory (dest) | Inventory (source) |
| Wastage write-off | Wastage Expense | Inventory |
| Gold rate revaluation | Inventory / Revaluation | Gain/Loss on Revaluation |

### BR-ACC-003: Financial Periods

- Fiscal year and periods configurable per tenant
- Period close prevents backdated entries (configurable override by admin)
- Trial balance, P&L, and balance sheet generated per period

### BR-ACC-004: Multi-Currency

- Tenants operating in multiple currencies supported
- Exchange rates configurable and historical rates preserved
- Transactions recorded in transaction currency; consolidated in base currency

---

## Business Rules — Human Resources

### BR-HR-001: Employee Management

- Employee records: personal info, role, branch, hire date, salary
- Employment status: active, on leave, terminated
- Terminated employees retain audit history but lose system access

### BR-HR-002: Attendance & Shifts

- Shift schedules configurable per branch
- Clock-in/clock-out tracking
- Overtime calculation per labor rules

### BR-HR-003: Payroll (Future Phase)

- Basic salary tracking in initial release
- Full payroll processing in later phase
- Commission tracking for sales staff linked to POS transactions

### BR-HR-004: Commission

- Sales commission rules: percentage of sales, tiered by amount, per category
- Commission calculated automatically from completed sales
- Commission reports per employee per period

---

## Business Rules — Multi-Tenancy & Subscriptions

### BR-SUB-001: Subscription Plans

| Plan | Branches | Employees | Features |
|------|----------|-----------|----------|
| **Starter** | 1 | 5 | POS, Inventory, Basic Reports |
| **Professional** | 5 | 25 | + Accounting, CRM, Transfers, Workshop |
| **Enterprise** | Unlimited | Unlimited | + API, AI, Custom Integrations, SLA |

### BR-SUB-002: Plan Enforcement

- System enforces branch and employee limits per plan
- Feature flags control module access per plan
- Grace period on plan downgrade before feature restriction

### BR-SUB-003: Billing

- Monthly or annual billing cycles
- Usage-based overage for transactions (optional)
- Invoice generation and payment collection via platform billing

---

## Business Rules — Notifications

### BR-NOT-001: Notification Channels

- In-app notifications
- Email
- SMS
- Push notifications (mobile apps)
- WhatsApp Business API (regional)

### BR-NOT-002: Notification Triggers

| Event | Recipients | Channel |
|-------|-----------|---------|
| Low stock alert | Branch manager, inventory manager | In-app, Email |
| Transfer pending approval | Approving manager | In-app, Push |
| Large sale | Store owner | In-app, SMS |
| Payment overdue | Accountant, customer | Email, SMS |
| Daily sales summary | Store owner | Email |
| System maintenance | All users | In-app, Email |

### BR-NOT-003: User Preferences

- Users can configure which notifications they receive and via which channels
- Critical security notifications cannot be disabled

---

## Business Rules — Reporting & Analytics

### BR-RPT-001: Standard Reports

| Report | Description | Access |
|--------|-------------|--------|
| Daily Sales Summary | Sales by branch, payment method, category | Manager+ |
| Inventory Valuation | Current stock value by karat, branch | Manager+ |
| Profit & Loss | Revenue, COGS, expenses by period | Admin, Accountant |
| Accounts Receivable Aging | Customer outstanding by age bucket | Accountant |
| Accounts Payable Aging | Supplier outstanding by age bucket | Accountant |
| Employee Commission | Commission earned per employee | Manager, HR |
| Transfer History | All inter-branch transfers | Manager+ |
| Audit Log | All system actions by user | Admin |
| Gold Rate History | Historical rate changes | All |

### BR-RPT-002: Dashboards

- **Owner Dashboard** — Revenue, profit, top products, branch comparison
- **Branch Dashboard** — Today's sales, stock alerts, pending transfers
- **POS Dashboard** — Quick stats for cashier (personal sales, shift total)
- **Workshop Dashboard** — Active work orders, material levels, wastage

### BR-RPT-003: Export

- All reports exportable to PDF, Excel, and CSV
- Scheduled report delivery via email
- API access to report data for enterprise tenants

---

## Business Rules — Audit & Compliance

### BR-AUD-001: Audit Trail

Every action that creates, modifies, or deletes business data shall be logged:

- Actor (user ID, name, role)
- Action (create, update, delete, approve, void)
- Entity type and ID
- Before and after values (for modifications)
- Timestamp (UTC)
- IP address and device info
- Branch context

### BR-AUD-002: Data Retention

- Audit logs retained for minimum **7 years** (configurable per regulation)
- Business data retained per tenant subscription (active + 90 days post-cancellation)
- Data export available before deletion

### BR-AUD-003: Regulatory Compliance

- Tax invoice format compliance per country (configurable templates)
- AML transaction reporting for high-value sales (configurable thresholds)
- GDPR/data protection compliance for customer PII
- Hallmarking record keeping where applicable

---

## Assumptions & Constraints

### Assumptions

1. Tenants have reliable internet connectivity at branch locations
2. Gold karat testing at point of purchase is performed manually (or via integrated device in future)
3. Initial release targets Arabic and English languages
4. Payment gateway integrations are region-specific and added incrementally

### Constraints

1. Platform is cloud-only; no on-premise deployment in initial release
2. Real-time spot gold rate feeds depend on third-party API availability
3. Mobile apps require iOS 15+ and Android 10+
4. Maximum single transaction value: configurable, default $1,000,000

---

## Document References

| Document | Purpose |
|----------|---------|
| [03-user-roles.md](./03-user-roles.md) | Role-based access to business functions |
| [04-system-modules.md](./04-system-modules.md) | Module mapping for business requirements |
| [05-functional-requirements.md](./05-functional-requirements.md) | Detailed functional specifications |
| [09-database-overview.md](./09-database-overview.md) | Data model for business entities |

---

*This document is maintained by the Product team and reviewed with domain experts from the jewelry industry quarterly.*
