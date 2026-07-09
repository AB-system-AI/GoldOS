# GoldOS — User Roles & Permissions

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026  
**Classification:** Internal — Security & Product

---

## Purpose

This document defines the role hierarchy, permission model, and access control policies for GoldOS. The permission system is designed to enforce the **principle of least privilege** while providing flexibility for tenants to customize roles to their organizational structure.

---

## Role Hierarchy Overview

GoldOS implements a **hierarchical role-based access control (RBAC)** model with two layers:

1. **Platform Roles** — GoldOS staff who manage the SaaS platform itself
2. **Tenant Roles** — Users within a subscribing company who operate the ERP/POS

```
Platform Layer (GoldOS Staff)
├── Super Admin
├── Platform Support
└── Platform Billing

Tenant Layer (Per Company)
├── Tenant Owner
├── Tenant Admin
├── Branch Manager
├── Assistant Manager
├── Accountant
├── Inventory Manager
├── Sales Associate
├── Cashier
├── Workshop Manager
├── Workshop Technician
├── HR Manager
└── Viewer (Read-Only)
```

---

## Platform Roles

Platform roles are assigned to GoldOS employees and operate outside tenant boundaries.

### Super Admin

| Attribute | Value |
|-----------|-------|
| **Scope** | Entire platform |
| **Count** | ≤ 5 individuals |
| **MFA** | Required (hardware key) |

**Capabilities:**
- Full access to all tenants, data, and platform configuration
- Manage platform staff accounts
- Configure global system settings
- Access infrastructure monitoring and deployment tools
- Override tenant restrictions in emergency situations
- All actions are logged with enhanced audit trail

### Platform Support

| Attribute | Value |
|-----------|-------|
| **Scope** | Assigned tenants (read + limited write) |
| **MFA** | Required |

**Capabilities:**
- View tenant data for troubleshooting (with tenant consent or active support ticket)
- Impersonate tenant users (with audit trail and time limit)
- Manage support tickets
- Cannot modify billing, delete tenants, or access platform configuration
- Cannot view sensitive data (passwords, payment card numbers) even in impersonation

### Platform Billing

| Attribute | Value |
|-----------|-------|
| **Scope** | Billing and subscription data across tenants |
| **MFA** | Required |

**Capabilities:**
- View and manage subscription plans
- Process billing adjustments and refunds
- Generate platform revenue reports
- Cannot access tenant business data (inventory, sales, customers)

---

## Tenant Roles

Tenant roles are assigned by the Tenant Owner or Tenant Admin and scoped to a single company.

### Tenant Owner

| Attribute | Value |
|-----------|-------|
| **Scope** | Entire tenant (all branches) |
| **Assignment** | One per tenant (transferable) |
| **MFA** | Strongly recommended |

**Capabilities:**
- Full access to all modules, settings, and data within the tenant
- Manage subscription and billing
- Create, modify, and delete all roles and users
- Configure global tenant settings (currency, tax, gold rates, invoice templates)
- Access all reports and audit logs
- Delete the tenant account
- Cannot be deleted; ownership must be transferred

### Tenant Admin

| Attribute | Value |
|-----------|-------|
| **Scope** | Entire tenant (all branches) |
| **MFA** | Recommended |

**Capabilities:**
- All Tenant Owner capabilities except:
  - Cannot manage subscription/billing
  - Cannot delete tenant account
  - Cannot modify Tenant Owner account
- Manage branches, employees, roles, and permissions
- Configure system settings
- Full report and audit log access

### Branch Manager

| Attribute | Value |
|-----------|-------|
| **Scope** | Assigned branch(es) |
| **MFA** | Optional |

**Capabilities:**
- Full operational control of assigned branch(es)
- Approve discounts above threshold
- Approve inter-branch transfers (send and receive)
- Manage branch employees (create, assign roles ≤ Assistant Manager)
- View branch reports and dashboards
- Configure branch-specific settings (operating hours, POS terminals)
- Process returns and voids
- Manage customer credit limits (within tenant policy)
- Cannot access other branches' data (unless explicitly granted)
- Cannot modify tenant-wide settings or roles above Assistant Manager

### Assistant Manager

| Attribute | Value |
|-----------|-------|
| **Scope** | Assigned branch(es) |

**Capabilities:**
- All Cashier/Sales Associate capabilities
- Approve discounts up to configured limit (below manager threshold)
- Initiate transfers (requires manager approval)
- View branch inventory and reports
- Manage hold/layaway orders
- Process returns (within policy)
- Cannot approve transfers or high-value discounts
- Cannot manage employees or branch settings

### Accountant

| Attribute | Value |
|-----------|-------|
| **Scope** | Entire tenant (financial data) |

**Capabilities:**
- Full access to accounting module
- View all financial reports (P&L, balance sheet, trial balance)
- Manage chart of accounts
- Record journal entries, payments, and receipts
- Manage supplier and customer ledgers
- Process supplier payments
- Export financial data
- View sales and purchase invoices (read-only)
- Cannot process POS sales or modify inventory
- Cannot manage users or system settings

### Inventory Manager

| Attribute | Value |
|-----------|-------|
| **Scope** | Assigned branch(es) or entire tenant |

**Capabilities:**
- Full inventory management (add, edit, adjust, write-off)
- Create and receive purchase orders
- Initiate and manage inter-branch transfers
- Manage suppliers (inventory-related)
- Print barcode/QR labels
- View inventory reports and valuation
- Record gold rate updates (if permitted by tenant policy)
- Cannot process sales or access financial/accounting data
- Cannot manage employees

### Sales Associate

| Attribute | Value |
|-----------|-------|
| **Scope** | Assigned branch |

**Capabilities:**
- Process POS sales and invoices
- Look up customers and products
- Apply discounts within personal limit
- Create hold/layaway orders
- Scan barcodes and QR codes
- View own sales history and commission
- Cannot void invoices or process returns
- Cannot access reports, inventory management, or settings
- Cannot approve discounts above personal limit

### Cashier

| Attribute | Value |
|-----------|-------|
| **Scope** | Assigned branch, assigned POS terminal |

**Capabilities:**
- Process POS sales (simplified interface)
- Accept payments (cash, card)
- Scan barcodes and QR codes
- Print receipts
- Cannot apply discounts (or up to minimal fixed discount)
- Cannot void, return, or modify completed sales
- Cannot access customer credit sales
- Cannot access any reports or settings
- Shift-based: access active only during assigned shift

### Workshop Manager

| Attribute | Value |
|-----------|-------|
| **Scope** | Assigned workshop branch |

**Capabilities:**
- Full workshop module access
- Create, assign, and complete work orders
- Manage workshop inventory (raw materials, tools)
- Record wastage and labor
- View workshop reports (productivity, material usage, wastage)
- Manage workshop technicians
- Cannot process retail sales or access financial data

### Workshop Technician

| Attribute | Value |
|-----------|-------|
| **Scope** | Assigned workshop branch |

**Capabilities:**
- View assigned work orders
- Update work order status and progress
- Record material consumption and wastage
- Cannot create work orders or manage inventory
- Cannot view financial data or reports

### HR Manager

| Attribute | Value |
|-----------|-------|
| **Scope** | Entire tenant |

**Capabilities:**
- Manage employee records (personal info, employment status)
- Manage attendance and shift schedules
- View and manage commission reports
- Cannot access sales, inventory, or financial data
- Cannot manage system roles or permissions (except HR-related fields)

### Viewer (Read-Only)

| Attribute | Value |
|-----------|-------|
| **Scope** | Configurable (branch or tenant) |

**Capabilities:**
- View dashboards and reports (as configured)
- No create, update, or delete permissions
- Useful for investors, auditors, or consultants
- Customizable per-module view access

---

## Permission Model

### Permission Structure

Permissions follow the pattern: `{module}.{resource}.{action}`

**Examples:**
- `pos.sale.create`
- `inventory.item.update`
- `accounting.journal.create`
- `admin.user.delete`
- `reports.financial.view`

### Actions

| Action | Description |
|--------|-------------|
| `view` | Read/list resource |
| `create` | Create new resource |
| `update` | Modify existing resource |
| `delete` | Remove resource |
| `approve` | Approve pending action (transfer, discount, etc.) |
| `void` | Void/cancel a completed transaction |
| `export` | Export data from module |
| `manage` | Full CRUD + configuration |

### Module Permission Matrix

| Permission | Owner | Admin | Branch Mgr | Asst Mgr | Accountant | Inv Mgr | Sales | Cashier | WS Mgr | WS Tech | HR Mgr | Viewer |
|------------|-------|-------|------------|----------|------------|---------|-------|---------|--------|---------|--------|--------|
| **POS — Sale** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | 👁 |
| **POS — Void/Return** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **POS — Discount (full)** | ✅ | ✅ | ✅ | ⚡ | ❌ | ❌ | ⚡ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Inventory — Manage** | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ | 👁 | 👁 | ⚡ | 👁 | ❌ | 👁 |
| **Transfers — Create** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 👁 |
| **Transfers — Approve** | ✅ | ✅ | ✅ | ❌ | ❌ | ⚡ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Accounting — Full** | ✅ | ✅ | 👁 | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 👁 |
| **Workshop — Manage** | ✅ | ✅ | 👁 | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ⚡ | ❌ | 👁 |
| **CRM — Manage** | ✅ | ✅ | ✅ | ✅ | 👁 | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | 👁 |
| **HR — Manage** | ✅ | ✅ | ⚡ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚡ | ❌ | ✅ | 👁 |
| **Reports — Financial** | ✅ | ✅ | ⚡ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 👁 |
| **Reports — Operational** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚡ | ❌ | ✅ | ❌ | ⚡ | 👁 |
| **Admin — Users** | ✅ | ✅ | ⚡ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚡ | ❌ | ⚡ | ❌ |
| **Admin — Settings** | ✅ | ✅ | ⚡ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Admin — Audit Log** | ✅ | ✅ | 👁 | ❌ | 👁 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Billing — Manage** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Legend:** ✅ Full access | ⚡ Limited/branch-scoped | 👁 Read-only | ❌ No access

---

## Custom Roles

Tenants on Professional and Enterprise plans can create **custom roles**:

1. Start from a system role template (e.g., "Sales Associate")
2. Add or remove individual permissions
3. Name and describe the custom role
4. Assign to employees

**Constraints:**
- Custom roles cannot exceed the permissions of the role creator
- Certain permissions are restricted to specific system roles (e.g., `admin.billing.manage` → Owner only)
- Maximum 50 custom roles per tenant (Enterprise: unlimited)
- Custom role changes are audit-logged

---

## Branch Scoping

### Single-Branch Assignment

Most operational roles (Cashier, Sales Associate, Workshop Technician) are assigned to **one branch**. They can only view and operate on data within that branch.

### Multi-Branch Assignment

Management roles (Branch Manager, Inventory Manager) can be assigned to **multiple branches**. Data access is unioned across assigned branches.

### Tenant-Wide Assignment

Administrative roles (Tenant Admin, Accountant, HR Manager) have **tenant-wide** access by default. Branch scoping can optionally be applied to limit visibility.

### Branch Context in Session

- Users with multi-branch access select an **active branch** at login
- All operations occur within the active branch context
- Branch switching available without re-login
- Audit logs always record the branch context of each action

---

## Session Management

### Session Policies

| Policy | Default | Configurable |
|--------|---------|-------------|
| Session timeout (inactivity) | 30 minutes | Yes (15–120 min) |
| Maximum session duration | 12 hours | Yes |
| Concurrent sessions | 3 per user | Yes (1–5) |
| Force logout on password change | Yes | No |
| Remember device | 30 days | Yes (7–90 days) |

### POS Session

- Cashiers log in to a specific **POS terminal**
- POS session tied to terminal and shift
- Shift open/close with cash drawer reconciliation
- Automatic logout on shift close

### Session Security

- Sessions stored as secure, HTTP-only cookies (web) or secure tokens (mobile)
- Session invalidation on: logout, password change, role change, admin force-logout
- Suspicious activity (new device, new location) triggers email alert
- All active sessions visible to user in profile settings
- Admin can force-logout any user in their tenant

---

## Two-Factor Authentication (2FA)

### 2FA Requirements

| Role | 2FA Policy |
|------|-----------|
| Platform Super Admin | Required (hardware key) |
| Platform Support/Billing | Required (TOTP or hardware key) |
| Tenant Owner | Strongly recommended; enforceable by policy |
| Tenant Admin | Recommended; enforceable by policy |
| All other roles | Optional; enforceable by tenant policy |

### Supported 2FA Methods

1. **TOTP Authenticator App** — Google Authenticator, Authy, etc.
2. **SMS OTP** — One-time code via SMS (fallback)
3. **Hardware Security Key** — FIDO2/WebAuthn (recommended for admins)
4. **Backup Codes** — 10 single-use recovery codes generated at 2FA setup

### Tenant 2FA Policy

Tenant Owner/Admin can enforce:
- `optional` — Users may enable 2FA voluntarily
- `required_admins` — All admin-level roles must enable 2FA
- `required_all` — All users must enable 2FA

---

## Permission Inheritance & Conflicts

### Inheritance Rules

1. Higher roles inherit all permissions of lower roles within the same branch scope
2. Branch Manager inherits Sales Associate + Cashier permissions for their branch
3. Tenant Admin inherits Branch Manager permissions for all branches
4. Custom roles do **not** inherit; they have explicitly defined permissions only

### Conflict Resolution

When a user has multiple role assignments:
- **Permissions are unioned** — if any role grants a permission, the user has it
- **Branch scopes are unioned** — user can access all branches from all role assignments
- **Restrictions are NOT applied** — a role cannot restrict another role's permissions

---

## API Access & Service Accounts

### API Keys (Enterprise Plan)

- Tenant Admin can generate API keys for integrations
- API keys are scoped to specific permissions (subset of creator's permissions)
- API keys have optional expiration and IP whitelist
- Rate limits apply per key
- All API actions are audit-logged with key identifier

### Service Accounts

- Non-human accounts for system integrations
- Assigned a custom role with minimal required permissions
- Cannot log in to UI
- MFA not applicable; secured by API key or OAuth client credentials

---

## Audit & Compliance

### Permission Change Auditing

All role and permission changes are logged:
- Who made the change
- What role/permission was added or removed
- Target user or role affected
- Timestamp and IP address

### Access Review

- Tenant Admin can generate **access review report** showing all users, roles, and permissions
- Recommended quarterly review for compliance
- Automated alert for users with excessive permissions (no login in 90 days but active account)

---

## Document References

| Document | Purpose |
|----------|---------|
| [07-security.md](./07-security.md) | Security architecture and policies |
| [05-functional-requirements.md](./05-functional-requirements.md) | Feature-level permission requirements |
| [08-multi-tenant.md](./08-multi-tenant.md) | Tenant isolation and data boundaries |

---

*This document is maintained by the Security and Product teams. Role definitions are reviewed semi-annually and updated based on customer feedback and compliance requirements.*
