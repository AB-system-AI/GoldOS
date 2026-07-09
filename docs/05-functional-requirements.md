# GoldOS — Functional Requirements

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026  
**Classification:** Internal — Product & Engineering

---

## Purpose

This document provides detailed functional requirements for every major feature in GoldOS. Each requirement is uniquely identified, prioritized, and traceable to business requirements and system modules. This serves as the primary specification for engineering implementation and QA test case derivation.

---

## Requirement Conventions

### Identifier Format

`FR-{MODULE}-{NUMBER}`

Example: `FR-POS-001` = Functional Requirement, POS module, requirement #1

### Priority Levels

| Priority | Label | Meaning |
|----------|-------|---------|
| P0 | Critical | Must have for launch; system unusable without it |
| P1 | High | Required for launch; workaround exists but unacceptable |
| P2 | Medium | Important; can launch without but needed soon after |
| P3 | Low | Nice to have; future enhancement |

### Status

`Draft` → `Approved` → `In Development` → `Implemented` → `Verified`

---

## Authentication & Identity

### FR-AUTH-001: User Login
**Priority:** P0  
Users shall authenticate using email and password. Failed attempts are rate-limited (5 attempts per 15 minutes per IP). Successful login creates a session and returns an access token.

### FR-AUTH-002: Multi-Factor Authentication
**Priority:** P1  
Users shall be able to enable TOTP-based 2FA. Upon login with 2FA enabled, a second factor is required before session creation. Backup codes (10 single-use) are generated at setup.

### FR-AUTH-003: Password Reset
**Priority:** P0  
Users shall request password reset via email. Reset link expires in 1 hour. New password must meet complexity requirements (min 8 chars, uppercase, lowercase, number, special character).

### FR-AUTH-004: Session Management
**Priority:** P0  
Sessions expire after 30 minutes of inactivity (configurable 15–120 min). Users can view active sessions and terminate them. Admin can force-logout any user in their tenant.

### FR-AUTH-005: Password Change
**Priority:** P1  
Authenticated users can change password by providing current password. All other sessions are invalidated upon password change.

### FR-AUTH-006: Account Lockout
**Priority:** P1  
After 10 failed login attempts, account is locked for 30 minutes. Admin can manually unlock. Lockout events are audit-logged and trigger email notification.

---

## Tenant & Branch Management

### FR-TENANT-001: Tenant Registration
**Priority:** P0  
New tenants register with company name, owner email, password, country, and currency. Email verification required. Default branch and owner account created automatically.

### FR-TENANT-002: Onboarding Wizard
**Priority:** P1  
Post-registration guided wizard: company details → first branch → gold rates → first product → invite team. Progress saved; resumable.

### FR-TENANT-003: Branch CRUD
**Priority:** P0  
Tenant Admin can create, edit, and deactivate branches. Branch attributes: name, type (retail/warehouse/workshop), address, phone, operating hours, timezone.

### FR-TENANT-004: Tenant Settings
**Priority:** P0  
Configurable settings: base currency, fiscal year start, tax configuration, invoice template, gold rate source, date/time format, language.

### FR-TENANT-005: Subscription Plan Management
**Priority:** P1  
Tenant Owner views current plan, usage (branches, employees), and can upgrade/downgrade. Plan limits enforced in real-time.

### FR-TENANT-006: Data Export
**Priority:** P2  
Tenant Owner can request full data export (JSON/CSV). Export generated asynchronously; download link emailed when ready. Available before account deletion.

---

## User & Role Management

### FR-USER-001: Employee CRUD
**Priority:** P0  
Admin creates employees with: name, email, phone, role(s), branch assignment. Invitation email sent. Employee sets password on first login.

### FR-USER-002: Role Assignment
**Priority:** P0  
Admin assigns one or more roles to employee with optional branch scope. Role changes take effect on next login (or immediately for downgrade).

### FR-USER-003: Custom Roles
**Priority:** P2  
Professional+ tenants create custom roles by selecting permissions from registry. Custom roles cannot exceed creator's permissions.

### FR-USER-004: Employee Deactivation
**Priority:** P0  
Admin deactivates employee; all sessions terminated immediately. Employee data and audit history preserved. Deactivated employees cannot log in.

### FR-USER-005: Permission Enforcement
**Priority:** P0  
Every API endpoint and UI action checks user permissions before execution. Unauthorized access returns 403 and is audit-logged.

---

## Point of Sale

### FR-POS-001: Sales Interface
**Priority:** P0  
Touch-optimized sales screen: product search/scan, cart, customer selection, payment, and receipt. Optimized for < 30 second transaction time.

### FR-POS-002: Product Search
**Priority:** P0  
Search by: name, SKU, barcode scan, QR scan, category browse. Results show image, name, karat, weight, and price. Supports partial name matching.

### FR-POS-003: Barcode/QR Scanning
**Priority:** P0  
Camera-based and USB scanner barcode/QR input. Scan instantly adds item to cart with full details. Invalid/unrecognized codes show clear error.

### FR-POS-004: Gold Pricing at POS
**Priority:** P0  
For gold items: display karat, gross weight, net gold weight, rate per gram, making charges, stone value, and total. Price auto-calculated from current rates.

### FR-POS-005: Manual Weight Entry
**Priority:** P0  
For bulk/weight-based sales: cashier enters weight, system calculates price from rate. Scale integration support (future).

### FR-POS-006: Payment Processing
**Priority:** P0  
Accept: cash, card, bank transfer, customer credit, gold exchange, and mixed payments. Split payment across multiple methods. Change calculation for cash.

### FR-POS-007: Gold Exchange (Trade-In)
**Priority:** P1  
Customer trades old gold: weigh, select karat, system prices at buy rate. Trade-in value deducted from total. Trade-in item enters inventory.

### FR-POS-008: Discount Application
**Priority:** P0  
Apply percentage or fixed discount per line item or entire invoice. Discounts above threshold require manager PIN/password approval.

### FR-POS-009: Customer Selection
**Priority:** P0  
Search and attach customer to sale. Display credit balance and limit. Walk-in (anonymous) sales supported.

### FR-POS-010: Invoice Generation
**Priority:** P0  
Auto-generate sequential invoice number. Invoice includes: items, weights, prices, taxes, payments, and balance. Store copy and customer copy.

### FR-POS-011: Receipt Printing
**Priority:** P0  
Print thermal receipt (80mm) and A4 tax invoice. Configurable templates with logo and legal text. Reprint from invoice history.

### FR-POS-012: Digital Invoice Delivery
**Priority:** P1  
Send invoice via email, SMS link, or WhatsApp. Customer receives PDF or web link to view invoice.

### FR-POS-013: Hold & Layaway
**Priority:** P2  
Place items on hold with customer deposit. Items marked reserved. Layaway with scheduled payments. Auto-release hold after configurable period.

### FR-POS-014: Returns & Refunds
**Priority:** P1  
Process return against original invoice. Full or partial return. Refund via original payment method or store credit. Returned items re-enter stock or scrapped.

### FR-POS-015: Void Transaction
**Priority:** P1  
Void completed sale with manager authorization. Void reason required. Inventory restored. Accounting reversal generated. Voided invoices retain number with VOID mark.

### FR-POS-016: Shift Management
**Priority:** P1  
Cashier opens shift with opening cash amount. Closes shift with cash count and reconciliation. Shift report shows all transactions, payments, and discrepancies.

### FR-POS-017: POS Terminal Assignment
**Priority:** P1  
Each POS instance tied to a terminal ID and branch. Terminal configuration: receipt printer, default payment method, display settings.

### FR-POS-018: Quick Keys
**Priority:** P2  
Configurable quick-access buttons for frequently sold items or categories. Customizable per terminal.

### FR-POS-019: Sales History
**Priority:** P1  
View today's and historical sales. Filter by date, cashier, payment method, customer. Reprint receipts. View invoice details.

### FR-POS-020: Offline Mode
**Priority:** P3  
Limited offline sales capability on mobile POS. Queue transactions for sync when connectivity restored. Conflict resolution on sync.

---

## Inventory Management

### FR-INV-001: Product Catalog
**Priority:** P0  
Create products with: name, SKU, category, description, images, karat, default making charges, stone details. Categories support hierarchy (e.g., Rings > Engagement Rings).

### FR-INV-002: Serialized Inventory Items
**Priority:** P0  
Create individual items with: unique barcode, QR code, exact weight, branch location, and status. Auto-generate codes or manual entry.

### FR-INV-003: Bulk Inventory
**Priority:** P0  
Track bulk materials (gold grain, casting grain) by total weight per branch. Add/remove weight with reason. No individual barcode required.

### FR-INV-004: Gold Rate Management
**Priority:** P0  
Set spot gold rates per karat. Manual entry or API feed. Rate history preserved. Rate effective date/time. Notification on rate change.

### FR-INV-005: Pricing Engine
**Priority:** P0  
Auto-calculate selling price: (net gold weight × rate per gram) + making charges + stone value. Recalculate on rate change (configurable auto/manual).

### FR-INV-006: Barcode/QR Generation
**Priority:** P0  
Generate barcode (Code 128) and QR code per item. Print labels (configurable size). Batch printing for multiple items.

### FR-INV-007: Stock Levels
**Priority:** P0  
Real-time stock count per branch, category, and karat. Available vs. reserved vs. in-transit breakdown. Low stock alerts.

### FR-INV-008: Stock Adjustment
**Priority:** P1  
Manual stock adjustment with reason (damage, loss, found, correction). Requires authorization above threshold. Audit-logged.

### FR-INV-009: Inventory Valuation
**Priority:** P1  
Calculate total inventory value by branch, karat, and category. Weighted average cost method. Valuation report exportable.

### FR-INV-010: Item Status Management
**Priority:** P0  
Track item status: in_stock, reserved, in_transit, in_workshop, sold, returned, scrapped, lost. Status transitions logged.

### FR-INV-011: Inventory Search & Filter
**Priority:** P0  
Search by barcode, SKU, name, karat, weight range, status, branch. Advanced filters and saved filter presets.

### FR-INV-012: Stock Movement History
**Priority:** P1  
Full history of every item movement: received, sold, transferred, adjusted, scrapped. Timeline view per item.

### FR-INV-013: Reorder Points
**Priority:** P2  
Set minimum stock levels per product/category. Alert when stock falls below threshold. Suggested reorder quantity.

### FR-INV-014: Import/Export
**Priority:** P2  
Bulk import products and inventory via CSV/Excel. Export inventory data. Import validation with error report.

---

## Inter-Branch Transfers

### FR-XFER-001: Create Transfer
**Priority:** P1  
Select source branch, destination branch, and items (by barcode scan or selection). Add notes. Save as draft or submit for approval.

### FR-XFER-002: Transfer Approval
**Priority:** P1  
Configurable approval chain based on transfer value. Approver notified. Approve or reject with reason. Rejected items return to source stock.

### FR-XFER-003: Dispatch
**Priority:** P1  
Approved transfer dispatched: items marked in-transit. Dispatch note printable. Source stock decremented.

### FR-XFER-004: Receive Transfer
**Priority:** P1  
Destination branch receives transfer. Confirm items and weights. Flag discrepancies. Accept or reject individual items.

### FR-XFER-005: Discrepancy Resolution
**Priority:** P2  
Weight or quantity discrepancies flagged. Resolution workflow: accept as-is, adjust, or return. Manager approval required.

### FR-XFER-006: Transfer History
**Priority:** P1  
View all transfers: pending, in-transit, completed, rejected. Filter by branch, date, status. Full audit trail per transfer.

### FR-XFER-007: Transfer Accounting
**Priority:** P2  
Auto-generate inter-branch journal entries on transfer completion. Configurable transfer pricing (cost, retail, or manual).

---

## Purchasing & Suppliers

### FR-PUR-001: Supplier Management
**Priority:** P1  
CRUD supplier profiles: name, contact, address, payment terms, tax ID, notes. Active/inactive status.

### FR-PUR-002: Purchase Order
**Priority:** P1  
Create PO: supplier, items, quantities, expected delivery date. States: draft, sent, partial_received, received, closed. Send PO to supplier via email.

### FR-PUR-003: Goods Receipt
**Priority:** P1  
Receive goods against PO. Verify weight and karat for gold items. Partial receipt supported. Auto-update inventory on receipt.

### FR-PUR-004: Supplier Ledger
**Priority:** P1  
Running balance per supplier. Record invoices and payments. Aging report: current, 30, 60, 90+ days.

### FR-PUR-005: Supplier Payment
**Priority:** P2  
Record payment to supplier. Allocate to specific invoices or general balance. Payment method tracking.

---

## Workshop & Manufacturing

### FR-WS-001: Work Order Creation
**Priority:** P1  
Create work order: type (manufacturing, repair, custom), customer (optional), description, expected completion, assigned technician.

### FR-WS-002: Material Allocation
**Priority:** P1  
Allocate raw materials from workshop inventory to work order. Record exact weight consumed. Materials deducted from stock.

### FR-WS-003: Wastage Recording
**Priority:** P1  
Record wastage per work order: process type, expected %, actual weight lost. Wastage deducted from inventory and added to piece cost.

### FR-WS-004: Labor Tracking
**Priority:** P2  
Record labor hours or flat fee per work order. Labor cost added to piece cost. Configurable labor rates.

### FR-WS-005: Work Order Progress
**Priority:** P1  
Update status: pending, in_progress, quality_check, completed, delivered. Status change notifications. Timeline view.

### FR-WS-006: Work Order Completion
**Priority:** P1  
Complete work order: record finished weight, calculate total cost (materials + labor + wastage). Create inventory item or direct invoice.

### FR-WS-007: Customer Repair Tracking
**Priority:** P2  
Track customer-owned items through repair. Customer notified on status changes. Item returned and invoiced on completion.

### FR-WS-008: Workshop Reports
**Priority:** P2  
Reports: active work orders, completion rate, material usage, wastage analysis, technician productivity.

---

## Customer Relationship Management

### FR-CRM-001: Customer Profile
**Priority:** P0  
Create customer: name, phone, email, address, ID type/number, notes, tags. Upload ID document photo.

### FR-CRM-002: Purchase History
**Priority:** P1  
View all customer transactions: invoices, returns, payments. Total spend, average transaction, last visit.

### FR-CRM-003: Customer Credit
**Priority:** P1  
Set credit limit per customer. Track outstanding balance. Credit utilization shown at POS. Block sale if over limit (configurable).

### FR-CRM-004: Loyalty Points
**Priority:** P2  
Earn points per purchase (configurable rate). Redeem for discounts. Points balance and history visible.

### FR-CRM-005: Customer Segmentation
**Priority:** P2  
Assign tier: regular, VIP, wholesale. Tier-based pricing or discount rules (future). Auto-upgrade based on spend.

### FR-CRM-006: Customer Search
**Priority:** P0  
Search by name, phone, email, ID number. Quick lookup at POS. Recent customers list.

### FR-CRM-007: Communication History
**Priority:** P2  
Log all communications: invoices sent, marketing messages, support interactions. Timeline per customer.

---

## Accounting & Finance

### FR-ACC-001: Chart of Accounts
**Priority:** P1  
Default chart provided per region. Tenant customizes: add, edit, deactivate accounts. Account types: asset, liability, equity, revenue, expense.

### FR-ACC-002: Automatic Journal Entries
**Priority:** P1  
Auto-generate entries for: sales, purchases, payments, transfers, wastage, returns. Configurable mapping rules.

### FR-ACC-003: Manual Journal Entry
**Priority:** P1  
Accountant creates manual entries: date, accounts, debit/credit amounts, description, reference. Balanced entry validation.

### FR-ACC-004: General Ledger
**Priority:** P1  
View all transactions by account. Filter by date range, account, branch. Running balance.

### FR-ACC-005: Financial Reports
**Priority:** P1  
Generate: Trial Balance, Profit & Loss, Balance Sheet, Cash Flow. By period, branch, or consolidated. Export to PDF/Excel.

### FR-ACC-006: Accounts Receivable
**Priority:** P1  
Customer outstanding balances. Aging report. Record customer payments. Allocate to invoices.

### FR-ACC-007: Accounts Payable
**Priority:** P1  
Supplier outstanding balances. Aging report. Record supplier payments. Allocate to invoices.

### FR-ACC-008: Tax Configuration
**Priority:** P1  
Configure tax rates (VAT, GST, sales tax). Apply per product category or globally. Tax summary report.

### FR-ACC-009: Fiscal Period Management
**Priority:** P2  
Define fiscal year and periods. Close period (prevent backdated entries). Reopen with admin authorization.

### FR-ACC-010: Multi-Currency
**Priority:** P3  
Record transactions in foreign currency. Exchange rate management. Consolidated reporting in base currency.

---

## Human Resources

### FR-HR-001: Employee Record
**Priority:** P1  
Extended employee profile: hire date, salary, department, emergency contact, documents. Linked to system user account.

### FR-HR-002: Attendance Tracking
**Priority:** P2  
Clock-in/clock-out via web or mobile. Shift assignment. Attendance report per employee.

### FR-HR-003: Shift Scheduling
**Priority:** P2  
Define shift templates (morning, evening, full day). Assign shifts to employees by branch and date. Calendar view.

### FR-HR-004: Commission Calculation
**Priority:** P2  
Auto-calculate commission from completed sales. Configurable rules: flat %, tiered, per category. Per-period commission report.

### FR-HR-005: Commission Report
**Priority:** P2  
Employee commission statement: sales count, total sales, commission earned. Exportable. Period comparison.

---

## Reports & Dashboards

### FR-RPT-001: Owner Dashboard
**Priority:** P1  
Real-time: today's revenue, monthly revenue, top products, branch comparison, inventory value, pending transfers.

### FR-RPT-002: Branch Dashboard
**Priority:** P1  
Branch-specific: today's sales, active POS sessions, stock alerts, pending approvals, recent transactions.

### FR-RPT-003: Standard Reports
**Priority:** P1  
Pre-built reports for all modules (see BR-RPT-001 in business requirements). Filterable, sortable, exportable.

### FR-RPT-004: Report Export
**Priority:** P1  
Export any report to PDF, Excel, or CSV. Include charts in PDF export.

### FR-RPT-005: Scheduled Reports
**Priority:** P2  
Schedule report generation and email delivery. Daily, weekly, monthly frequency. Multiple recipients.

### FR-RPT-006: Custom Report Builder
**Priority:** P3  
Enterprise feature: drag-and-drop report builder. Select data sources, filters, grouping, and visualization.

---

## Notifications

### FR-NOT-001: In-App Notifications
**Priority:** P1  
Real-time notification bell with unread count. Mark as read. Click to navigate to relevant item.

### FR-NOT-002: Email Notifications
**Priority:** P1  
Transactional emails: invoice, password reset, alerts. HTML templates with tenant branding.

### FR-NOT-003: SMS Notifications
**Priority:** P2  
OTP for 2FA. Invoice links. Payment reminders. Configurable per notification type.

### FR-NOT-004: Push Notifications
**Priority:** P2  
Mobile app push for alerts, approvals needed, and daily summaries.

### FR-NOT-005: Notification Preferences
**Priority:** P2  
User configures which events trigger notifications and via which channels. Critical security notifications cannot be disabled.

---

## Audit & Compliance

### FR-AUD-001: Audit Log
**Priority:** P0  
Log every create, update, delete, approve, void action. Fields: actor, action, entity, before/after values, timestamp, IP, branch.

### FR-AUD-002: Audit Search
**Priority:** P1  
Search audit logs by: user, action type, entity type, date range, branch. Export results.

### FR-AUD-003: Audit Retention
**Priority:** P1  
Retain audit logs for minimum 7 years. Configurable per tenant. Archived logs searchable but not modifiable.

---

## AI Assistant

### FR-AI-001: Conversational Query
**Priority:** P3  
Natural language questions about business data: "What were today's sales?", "Which items are low on stock?"

### FR-AI-002: Pricing Recommendations
**Priority:** P3  
Suggest optimal selling price based on current rates, making charges, and market comparison.

### FR-AI-003: Demand Forecasting
**Priority:** P3  
Predict inventory needs by category and karat based on historical sales patterns.

### FR-AI-004: Anomaly Detection
**Priority:** P3  
Flag unusual transactions: abnormally large sale, inventory discrepancy, off-hours activity.

---

## Integrations & API

### FR-API-001: REST API
**Priority:** P2  
Full REST API for all modules. API key authentication. Rate limiting. OpenAPI documentation.

### FR-API-002: Webhooks
**Priority:** P2  
Configurable webhooks for events: sale completed, transfer completed, low stock. Retry with exponential backoff.

### FR-API-003: Payment Gateway Integration
**Priority:** P1  
Integrate with regional payment gateways for card processing at POS.

### FR-API-004: Gold Rate Feed
**Priority:** P2  
Integrate with external gold rate API for automatic rate updates.

### FR-API-005: Accounting Export
**Priority:** P2  
Export journal entries to external accounting systems (QuickBooks, Xero format).

### FR-API-006: E-Commerce Integration
**Priority:** P3  
Sync inventory and orders with e-commerce platforms (Shopify, WooCommerce).

---

## Mobile Applications

### FR-MOB-001: Mobile POS
**Priority:** P2  
iOS and Android POS app: sales, scan, payment, receipt. Optimized for tablet and phone.

### FR-MOB-002: Mobile Dashboard
**Priority:** P2  
Owner/manager dashboard on mobile: sales, alerts, approvals.

### FR-MOB-003: Mobile Inventory
**Priority:** P3  
Inventory lookup, stock check, barcode scan verification on mobile.

### FR-MOB-004: Mobile Notifications
**Priority:** P2  
Push notifications for alerts, approvals, and summaries.

---

## Document References

| Document | Purpose |
|----------|---------|
| [02-business-requirements.md](./02-business-requirements.md) | Business rules underlying these requirements |
| [04-system-modules.md](./04-system-modules.md) | Module architecture |
| [14-testing.md](./14-testing.md) | Test case derivation from requirements |
| [12-development-roadmap.md](./12-development-roadmap.md) | Priority-based delivery schedule |

---

*This document is maintained by the Product team. Requirements are reviewed and prioritized during sprint planning. All P0 requirements must be verified before launch.*
