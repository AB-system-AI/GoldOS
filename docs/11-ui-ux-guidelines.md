# GoldOS — UI/UX Guidelines

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** July 2026  
**Classification:** Internal — Product & Design

---

## Purpose

This document establishes the user interface and user experience standards for GoldOS. As a platform used daily by cashiers, managers, accountants, and business owners in the jewelry industry, the UI must be professional, efficient, accessible, and tailored to the unique workflows of gold and jewelry commerce.

---

## Design Philosophy

### Core UX Principles

1. **Speed is a Feature** — POS transactions must complete in seconds, not minutes. Every tap counts.
2. **Clarity Over Cleverness** — Users are jewelers, not technologists. Interfaces must be immediately understandable.
3. **Progressive Disclosure** — Show what's needed now; reveal complexity on demand.
4. **Consistency** — Same patterns, same positions, same behaviors across all modules.
5. **Forgiveness** — Confirm destructive actions, support undo, prevent costly mistakes.
6. **Context Awareness** — Show relevant information based on role, branch, and current task.
7. **Accessibility First** — Usable by everyone, including RTL languages and assistive technologies.

### Design Attributes

| Attribute | Expression |
|-----------|-----------|
| **Professional** | Clean layouts, restrained color palette, premium feel |
| **Precise** | Exact numbers, weights, and prices prominently displayed |
| **Efficient** | Minimal clicks, keyboard shortcuts, smart defaults |
| **Trustworthy** | Clear confirmations, visible audit info, secure indicators |
| **Modern** | Contemporary design language, smooth animations, responsive |

---

## Visual Identity

### Color Palette

#### Primary Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Gold** | `#C9A84C` | Primary brand, CTAs, active states, gold-related UI |
| **Gold Dark** | `#A68A3A` | Hover states, pressed buttons |
| **Gold Light** | `#F5EDD6` | Backgrounds, highlights, selected rows |
| **Navy** | `#1B2A4A` | Primary text, headers, sidebar background |
| **Navy Light** | `#2D4A7A` | Secondary elements, borders |

#### Semantic Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Success** | `#2E7D32` | Completed, in stock, approved, positive values |
| **Warning** | `#F57F17` | Pending approval, low stock, attention needed |
| **Error** | `#C62828` | Errors, voided, rejected, negative values |
| **Info** | `#1565C0` | Informational, in transit, neutral status |
| **Neutral** | `#6B7280` | Secondary text, disabled, placeholders |

#### Surface Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Background** | `#F8F9FB` | Page background |
| **Surface** | `#FFFFFF` | Cards, panels, modals |
| **Border** | `#E5E7EB` | Dividers, input borders |
| **Text Primary** | `#1B2A4A` | Headings, primary content |
| **Text Secondary** | `#6B7280` | Labels, descriptions, metadata |

### Typography

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| **H1 — Page Title** | Inter | 28px | 700 | 36px |
| **H2 — Section Title** | Inter | 22px | 600 | 28px |
| **H3 — Card Title** | Inter | 18px | 600 | 24px |
| **Body** | Inter | 14px | 400 | 20px |
| **Body Small** | Inter | 12px | 400 | 16px |
| **Label** | Inter | 12px | 500 | 16px |
| **Price (POS)** | JetBrains Mono | 24px | 700 | 32px |
| **Weight (POS)** | JetBrains Mono | 18px | 600 | 24px |
| **Barcode** | JetBrains Mono | 14px | 400 | 20px |

**Arabic Typography:** Noto Sans Arabic for all Arabic text, maintaining size and weight parity with Inter.

### Iconography

- **Library:** Lucide Icons (consistent, open-source)
- **Size:** 16px (inline), 20px (navigation), 24px (feature icons)
- **Style:** Outlined (1.5px stroke), rounded caps
- **Color:** Inherit from text color; semantic colors for status icons

### Spacing System

Based on 4px grid:

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Tight spacing, icon gaps |
| `sm` | 8px | Input padding, compact lists |
| `md` | 16px | Card padding, section gaps |
| `lg` | 24px | Section spacing, modal padding |
| `xl` | 32px | Page margins, major sections |
| `2xl` | 48px | Page header spacing |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 4px | Inputs, badges, tags |
| `md` | 8px | Cards, buttons, dropdowns |
| `lg` | 12px | Modals, panels |
| `full` | 9999px | Avatars, pills, circular buttons |

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | `0 1px 2px rgba(0,0,0,0.05)` | Cards, inputs |
| `md` | `0 4px 6px rgba(0,0,0,0.07)` | Dropdowns, popovers |
| `lg` | `0 10px 15px rgba(0,0,0,0.10)` | Modals, floating panels |

---

## Layout Architecture

### Application Shell

```
┌──────────────────────────────────────────────────────────┐
│  Top Bar: Logo │ Branch Selector │ Search │ 🔔 │ User  │
├────────┬─────────────────────────────────────────────────┤
│        │                                                 │
│  Side  │              Main Content Area                  │
│  Nav   │                                                 │
│        │                                                 │
│  📊    │                                                 │
│  🛒    │                                                 │
│  📦    │                                                 │
│  👥    │                                                 │
│  💰    │                                                 │
│  🔧    │                                                 │
│  📈    │                                                 │
│  ⚙️    │                                                 │
│        │                                                 │
├────────┴─────────────────────────────────────────────────┤
│  Status Bar: Connection │ Sync Status │ Version         │
└──────────────────────────────────────────────────────────┘
```

### Navigation Structure

| Icon | Module | Sub-Navigation |
|------|--------|---------------|
| Dashboard | Reports | Owner Dashboard, Branch Dashboard |
| POS | Point of Sale | Sales, Returns, Holds, Shift |
| Inventory | Inventory | Products, Items, Gold Rates, Categories |
| Transfers | Transfers | Create, Pending, History |
| Customers | CRM | Customers, Loyalty |
| Purchasing | Purchasing | Suppliers, Purchase Orders |
| Workshop | Workshop | Work Orders, Materials |
| Accounting | Accounting | Journal, Reports, AR, AP |
| HR | Human Resources | Employees, Attendance, Commission |
| Settings | Admin | Company, Branches, Users, Roles, Audit |

### Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| **Mobile** | < 768px | Bottom navigation, single column, stacked cards |
| **Tablet** | 768–1024px | Collapsible sidebar, two-column where appropriate |
| **Desktop** | 1024–1440px | Full sidebar, multi-column layouts |
| **Wide** | > 1440px | Full sidebar, max content width 1280px, centered |

### POS Layout (Dedicated)

The POS interface uses a **distinct layout** optimized for touch and speed:

```
┌──────────────────────────────────────────────────────────┐
│  POS: Branch Name │ Cashier │ Shift # │ 🔔 │ [End Shift]│
├──────────────────────────────┬───────────────────────────┤
│                              │                           │
│   Product Search / Scan      │      Cart / Invoice       │
│                              │                           │
│   ┌────┐ ┌────┐ ┌────┐     │   Item 1    21K  5.2g  $$$ │
│   │Cat │ │Cat │ │Cat │     │   Item 2    18K  3.1g  $$$ │
│   └────┘ └────┘ └────┘     │   ─────────────────────── │
│                              │   Subtotal:         $$$  │
│   Product Grid / Search      │   Discount:          -$  │
│   Results                    │   Tax:               $$$  │
│                              │   ═══════════════════════ │
│                              │   TOTAL:            $$$  │
│                              │                           │
│                              │   [Customer] [Discount]   │
│                              │   [Hold]     [Payment]    │
├──────────────────────────────┴───────────────────────────┤
│  Quick Keys: [Gold Chain] [Ring] [Bracelet] [Custom]      │
└──────────────────────────────────────────────────────────┘
```

---

## Component Standards

### Buttons

| Type | Usage | Style |
|------|-------|-------|
| **Primary** | Main action (Save, Pay, Create) | Gold background, white text |
| **Secondary** | Alternative action (Cancel, Back) | White background, navy border |
| **Danger** | Destructive action (Delete, Void) | Red background, white text |
| **Ghost** | Tertiary action (Edit, View) | No background, navy text |
| **Icon** | Compact actions | Icon only, circular or square |

**Sizes:** `sm` (32px), `md` (40px), `lg` (48px — POS primary actions)

**Rules:**
- One primary button per view/section
- Destructive actions require confirmation dialog
- Disabled state: 50% opacity, no pointer events
- Loading state: spinner replaces label, button disabled

### Form Inputs

| Type | Usage | Specifications |
|------|-------|---------------|
| **Text Input** | Names, codes, notes | 40px height, 12px padding, border on focus |
| **Number Input** | Weights, prices, quantities | Right-aligned, monospace font, step controls |
| **Select** | Dropdowns, karat selection | Searchable for long lists |
| **Date Picker** | Dates, periods | Calendar popup, keyboard input supported |
| **Currency Input** | Prices, amounts | Currency symbol prefix, thousand separators |
| **Weight Input** | Gold weights | "g" suffix, 3 decimal places, monospace |
| **Barcode Input** | Scan or manual entry | Auto-focus, large target, scan icon |
| **Toggle** | Boolean settings | Switch style, label on right |
| **Textarea** | Notes, descriptions | Auto-resize, character count |

**Validation:**
- Inline validation on blur (not on every keystroke)
- Error message below field in red
- Success state: green border (optional, for critical fields)
- Required fields marked with asterisk

### Data Tables

| Feature | Implementation |
|---------|---------------|
| **Sorting** | Click column header; arrow indicator |
| **Filtering** | Filter bar above table; chip-style active filters |
| **Pagination** | Bottom bar: page size selector, page numbers, total count |
| **Row Actions** | Icon buttons or three-dot menu on right |
| **Selection** | Checkbox column for bulk actions |
| **Empty State** | Illustration + message + CTA button |
| **Loading** | Skeleton rows (not spinner) |
| **Row Click** | Navigate to detail view |
| **Responsive** | Horizontal scroll on mobile; priority columns visible |

### Cards

- White background, `sm` shadow, `md` border radius
- Padding: `md` (16px)
- Header: title (H3) + optional action button
- Content: structured with consistent spacing
- Footer: optional actions, right-aligned

### Modals & Dialogs

| Type | Usage | Behavior |
|------|-------|----------|
| **Modal** | Forms, multi-step flows | Centered, backdrop, close on Escape |
| **Confirmation** | Destructive action confirm | Small, focused, clear consequences |
| **Drawer** | Detail view, filters | Slide from right, full height |
| **Toast** | Success/error feedback | Top-right, auto-dismiss (5s), stackable |

### Status Badges

| Status | Color | Usage |
|--------|-------|-------|
| Active / In Stock / Completed | Green | Positive states |
| Pending / In Transit / Draft | Yellow/Amber | In-progress states |
| Voided / Rejected / Scrapped | Red | Negative states |
| In Workshop / On Hold | Blue | Special states |
| Inactive / Cancelled | Gray | Neutral/inactive |

---

## Module-Specific UX Patterns

### POS — Sales Flow

**Target: Complete sale in ≤ 5 taps after scan**

1. **Scan/Search** → Item appears in cart (auto)
2. **Review cart** → Weights and prices visible
3. **Tap Payment** → Payment method selection
4. **Enter amount** → Confirm
5. **Receipt** → Auto-print or send

**Key UX Decisions:**
- Barcode scanner input always focused and ready
- Cart updates in real-time with running total prominently displayed
- Gold weight and karat displayed in monospace font for precision
- Payment screen shows large total amount
- Cash payment: calculator-style numpad for amount entry with change calculation
- Success screen: brief confirmation (1s) then auto-return to sales screen

### Inventory — Item Management

- **List view:** Table with image thumbnail, barcode, name, karat, weight, status, branch
- **Detail view:** Full item card with image gallery, all attributes, movement history timeline
- **Create flow:** Step wizard — Product → Weight → Branch → Barcode → Confirm
- **Barcode printing:** Select items → Preview labels → Print
- **Gold rate update:** Prominent banner when rates are stale (> 24 hours)

### Dashboard — Data Visualization

- **KPI cards:** Large number, trend arrow, comparison to previous period
- **Charts:** Line (trends), bar (comparisons), donut (distribution)
- **Color coding:** Gold for revenue, navy for counts, semantic for status
- **Refresh:** Auto-refresh every 60 seconds with subtle indicator
- **Date range:** Preset buttons (Today, Week, Month, Quarter, Year) + custom range

### Transfers — Approval Flow

- **Visual pipeline:** Draft → Pending → Approved → In Transit → Received → Complete
- **Status indicators:** Color-coded steps with timestamps
- **Action buttons:** Contextual to current status (Submit, Approve, Dispatch, Receive)
- **Item list:** Scannable items with weight verification input on receive

---

## Accessibility Standards

### WCAG 2.1 Level AA Compliance

| Requirement | Implementation |
|-------------|---------------|
| **Color contrast** | 4.5:1 for text, 3:1 for large text and UI components |
| **Keyboard navigation** | All interactive elements focusable and operable via keyboard |
| **Focus indicators** | Visible focus ring (2px gold outline) |
| **Screen readers** | ARIA labels, roles, and live regions for dynamic content |
| **Alt text** | All product images and meaningful icons |
| **Form labels** | Explicit labels associated with all inputs |
| **Error identification** | Errors described in text, not color alone |
| **Resize** | Functional at 200% zoom |

### RTL (Right-to-Left) Support

- Full RTL layout for Arabic language
- Mirrored navigation, icons, and flow direction
- Numbers and prices remain LTR (international convention)
- Bidirectional text handling for mixed Arabic/English content
- RTL-aware animations and transitions

---

## Internationalization (i18n)

### Language Support

| Phase | Languages | Direction |
|-------|-----------|-----------|
| Phase 1 | English, Arabic | LTR, RTL |
| Phase 2 | French, Urdu, Hindi | LTR, RTL |
| Phase 3 | Additional based on market demand | — |

### Localization Rules

| Element | Rule |
|---------|------|
| **Dates** | Locale format (DD/MM/YYYY for MENA, MM/DD/YYYY for US) |
| **Numbers** | Locale thousand/decimal separators |
| **Currency** | Symbol position per locale (e.g., "1,500 EGP" vs "AED 1,500") |
| **Weights** | Always in grams with locale number format |
| **Karats** | Universal notation (21K, 18K) — not translated |
| **Labels** | Fully translated including error messages |
| **Pluralization** | Proper plural forms per language |

---

## Interaction Patterns

### Loading States

| Context | Pattern |
|---------|---------|
| Page load | Full-page skeleton matching layout |
| Table data | Skeleton rows (5 rows) |
| Button action | Inline spinner, button disabled |
| Background sync | Subtle progress bar in status bar |
| Image load | Blur placeholder → fade in |

### Empty States

Every list/table has an empty state with:
- Relevant illustration (not generic)
- Descriptive message ("No products yet")
- Primary CTA ("Add your first product")
- Optional secondary help link

### Error States

| Type | Pattern |
|------|---------|
| **Form validation** | Inline field errors, summary at top |
| **API error** | Toast notification with retry option |
| **Page error** | Full-page error with description and retry/home buttons |
| **Network error** | Banner at top: "Connection lost. Retrying..." |
| **Permission denied** | Friendly message with contact admin suggestion |

### Confirmation Patterns

| Action | Confirmation |
|--------|-------------|
| Delete entity | Modal: "Are you sure? This cannot be undone." |
| Void invoice | Modal: reason required, show invoice details |
| Large discount | Manager PIN/password entry |
| Transfer approval | Review screen with item list and totals |
| Account deactivation | Modal: type employee name to confirm |

---

## Mobile UX

### Mobile POS App

- **Primary device:** Tablet (10"+) in landscape orientation
- **Secondary:** Phone in portrait for quick lookups
- **Touch targets:** Minimum 44×44px for all interactive elements
- **Gestures:** Swipe to remove cart item, pull to refresh lists
- **Offline indicator:** Persistent banner when offline
- **Haptic feedback:** On scan success, payment completion

### Mobile Dashboard

- **Card-based layout:** KPI cards stacked vertically
- **Simplified navigation:** Bottom tab bar (Dashboard, POS, Inventory, More)
- **Push notifications:** Actionable (approve transfer, view alert)
- **Quick actions:** Floating action button for common tasks

---

## Print Design

### Thermal Receipt (80mm)

```
        [Company Logo]
        Company Name
        Branch Address
        Phone: +XX XXX XXX
        Tax ID: XXXXXXXXX
────────────────────────
Invoice: INV-2026-00001
Date: 10/07/2026 14:30
Cashier: Ahmed Hassan
Customer: Walk-in
────────────────────────
Gold Ring 21K
  Weight: 5.250g
  Rate: 3,200.00/g
  Gold: 16,800.00
  Making: 1,500.00
  Total: 18,300.00
────────────────────────
Subtotal:      18,300.00
Tax (14%):      2,562.00
Total:         20,862.00
Paid (Cash):   21,000.00
Change:           138.00
────────────────────────
Thank you for your visit!
[QR Code for digital receipt]
```

### Barcode Label (50×25mm)

```
┌─────────────────────────┐
│ ▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐ │ ← Barcode
│ GOS-2026-00042          │ ← Code text
│ Gold Ring 21K           │ ← Product name
│ 5.250g │ 20,862.00     │ ← Weight │ Price
└─────────────────────────┘
```

---

## Animation & Motion

| Interaction | Animation | Duration |
|-------------|-----------|----------|
| Page transition | Fade | 150ms |
| Modal open | Fade + scale (0.95→1) | 200ms |
| Drawer open | Slide from right | 250ms |
| Toast appear | Slide from top + fade | 200ms |
| Cart item add | Slide in from right | 150ms |
| Button press | Scale (0.97) | 100ms |
| Skeleton shimmer | Gradient sweep | 1.5s loop |

**Rules:**
- Respect `prefers-reduced-motion` — disable animations
- No animation on data updates (instant)
- Animations serve function, not decoration

---

## Document References

| Document | Purpose |
|----------|---------|
| [04-system-modules.md](./04-system-modules.md) | Module structure driving navigation |
| [05-functional-requirements.md](./05-functional-requirements.md) | Feature requirements for UI |
| [06-non-functional-requirements.md](./06-non-functional-requirements.md) | Usability and accessibility NFRs |
| [03-user-roles.md](./03-user-roles.md) | Role-based UI visibility |

---

*This document is maintained by the Product Design team. UI components are documented in the design system (Figma). Changes require design review.*
