# Project UI/UX Specification

**Version:** 1.0  
**Last Updated:** August 8, 2026  
**Status:** Architectural Specification (Pre-Implementation)  
**Owner:** Frontend Engineering & UX Team  
**Sprint:** Sprint 3  

---

## Document Purpose

This document is **Part 2 of 3** in the Project Domain Specification for Freelance-OS. It outlines the authoritative UI/UX design, information architecture, component hierarchy, and design system integration for the Project vertical slice.

| Document | Contents |
|----------|----------|
| `project.md` | Product & Domain Specification: features, relationships, data model, business rules, acceptance criteria |
| `project-design.md` (this file) | Authoritative UI/UX Specification: information architecture, component inventory, wireframes, design token mapping |
| `project-api.md` | Authoritative HTTP & API Specification: REST endpoints, Zod schemas, error models, TanStack Query architecture |

---

## 1. Information Architecture

Projects are organized within the Workspace context and reference Client records.

```text
Workspace Navigation
  ├── Dashboard
  ├── Clients (/workspaces/[workspaceId]/clients)
  └── Projects (/workspaces/[workspaceId]/projects)
        ├── Project List (Default view)
        └── Project Detail (/workspaces/[workspaceId]/projects/[projectId])
```

---

## 2. Project List View

### Layout & Representation
The Project List uses a **responsive grid of cards** (`ProjectCard`) on Desktop/Tablet and a single column on Mobile.

**Why Cards over Table?**
- Projects carry distinct metadata (status badge, client tag, budget figure, deadline progress, and pricing model indicator). Cards provide richer visual hierarchy for scanning project health compared to dense tabular data.

### Page Anatomy (`ProjectPage.tsx`)
1. **Header Zone**:
   - Title: `Projects` (`var(--color-ink-deep)`, 24px bold)
   - Subtitle: `Track active client engagements, timelines, and budgets.`
   - Primary CTA: `+ Add Project` (`Button` variant `primary` / `yellow`)
2. **Filter & Search Bar**:
   - Search input: `Search by project name or client...` (with `MagnifyingGlass` icon)
   - Status Tabs: `Active` (default), `Draft`, `Completed`, `Archived`, `All`
3. **Content State**:
   - **Loading**: Grid of 3 `Skeleton` cards (height 180px).
   - **Empty State**: `ProjectEmptyState` component with illustration, headline, and "+ Create Project" button.
   - **Populated State**: Responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5`).

---

## 3. Project Card Design (`ProjectCard.tsx`)

Every card displays key project identity and metadata:

```text
┌──────────────────────────────────────────────────────────┐
│  [STATUS BADGE]                           [PRICING TAG]  │
│  Acme E-Commerce Redesign                                │
│  Client: Acme Corp Pvt Ltd                               │
│  ──────────────────────────────────────────────────────  │
│  Budget: ₹1,50,000                       Fixed Price     │
│  Target: Oct 15, 2026 (12 days left)                     │
│  ──────────────────────────────────────────────────────  │
│  [View Details]                           [Edit] [Archive]│
└──────────────────────────────────────────────────────────┘
```

### Visual Tokens & Tokens
- **Background**: `bg-white` with `border border-[var(--color-hairline)]` and subtle hover elevation (`hover:shadow-md transition-shadow`).
- **Status Badges**:
  - `draft`: `bg-amber-50 text-amber-700 border-amber-200`
  - `active`: `bg-emerald-50 text-emerald-700 border-emerald-200`
  - `completed`: `bg-blue-50 text-blue-700 border-blue-200`
  - `archived`: `bg-gray-100 text-gray-600 border-gray-200`

---

## 4. Create Project Dialog (`CreateProjectDialog.tsx` & `CreateProjectForm.tsx`)

The Create Project form is rendered inside a modal dialog (`Dialog`).

### Form Field Layout
1. **Project Name** (`FormField`): Required. Text input (`e.g., Mobile App Development`).
2. **Client Selection** (`Select` / `Dropdown`): Optional. Selects from active workspace clients. Options show `Client Name (Company)`. Include option: `None (Internal Project)`.
3. **Pricing Model & Budget** (Grid 2 cols):
   - Pricing Model (`Select`): `Fixed Price`, `Hourly Rate`, `Monthly Retainer`.
   - Budget Amount (`FormField`): Number input (`e.g., 150000`) with Currency suffix (`INR`).
4. **Timeline Dates** (Grid 2 cols):
   - Start Date (`FormField` type `date`).
   - Target Deadline (`FormField` type `date`).
5. **Project Description** (`Textarea`): Optional scope description.

### Form Behavior
- Uses React Hook Form + Zod (`projectFormSchema`).
- Real-time client-side validation for dates (`targetDate >= startDate`) and budget (`budgetAmount >= 0`).
- Submit button shows spinning `CircleNotch` and enters disabled state during mutation.

---

## 5. Project Detail View (`ProjectDetail.tsx`)

Accessible via clicking a Project Card or navigating to `/workspaces/[workspaceId]/projects/[projectId]`.

```text
┌──────────────────────────────────────────────────────────┐
│ ← Back to Projects                                       │
│                                                          │
│ Mobile App Development                    [Status Select]│
│ Client: Acme Corp Pvt Ltd | Fixed Price   [Edit] [Archive]│
│ ──────────────────────────────────────────────────────── │
│                                                          │
│  ┌────────────────────┐   ┌───────────────────────────┐  │
│  │ Financials         │   │ Timeline                  │  │
│  │ Budget: ₹1,50,000  │   │ Start: Sep 1, 2026        │  │
│  │ Model: Fixed Price │   │ Target: Oct 31, 2026      │  │
│  └────────────────────┘   └───────────────────────────┘  │
│                                                          │
│  Scope Overview                                          │
│  Complete iOS and Android mobile app development for     │
│  the e-commerce store including UPI checkout.            │
└──────────────────────────────────────────────────────────┘
```

---

## 6. Status Control UI (`ProjectStatusControl.tsx`)

Status transitions are performed via an interactive dropdown button group on the Project Detail and Project Card views:

- Displays current status badge.
- Clicking opens quick actions:
  - `Mark as Active` (if in Draft)
  - `Mark as Completed` (if in Active)
  - `Move back to Draft` (if in Active)
  - `Archive Project` (Owner only)

---

## 7. Component Inventory

All components will reside in `apps/web/src/features/project/components/`:

| Component Name | Responsibility | Shared Dependencies Used |
|---|---|---|
| `ProjectPage.tsx` | Main feature page layout, header, filter state, data fetching | `Button`, `Input`, `Skeleton` |
| `ProjectList.tsx` | Renders grid of project cards or empty state | `ProjectCard`, `ProjectEmptyState` |
| `ProjectCard.tsx` | Individual project card with metadata, badge, and quick actions | `Card`, `Button`, `@phosphor-icons/react` |
| `ProjectDetail.tsx` | Detailed single project view with full metadata and scope description | `Button`, `Card`, `@phosphor-icons/react` |
| `CreateProjectDialog.tsx` | Modal wrapper for project creation | `Dialog` |
| `CreateProjectForm.tsx` | React Hook Form for project creation with Zod validation | `FormProvider`, `FormField`, `Button`, `Input` |
| `EditProjectDialog.tsx` | Modal wrapper for editing an existing project | `Dialog`, `CreateProjectForm` |
| `ProjectStatusControl.tsx` | Dropdown control for changing project status | `Button` |
| `ProjectEmptyState.tsx` | Zero-state placeholder illustration when no projects exist | `Button`, `@phosphor-icons/react` |

---

## 8. Shared Component Reuse Map

Following the architecture rules, Project reuses existing UI components from `@shared/components`:

```text
@shared/components/
  ├── Button        (Used for CTAs, actions, status toggles)
  ├── Card          (Used for ProjectCard and Detail containers)
  ├── Dialog        (Used for Create/Edit modals)
  ├── FormField     (Used for text, date, and number inputs)
  ├── Input         (Base input component)
  └── Skeleton      (Used for loading states)
```

**Icons (`@phosphor-icons/react`)**:
- `FolderPlus` (Add Project)
- `Briefcase` (Project icon)
- `CalendarBlank` (Timeline/Dates)
- `CurrencyInr` / `CurrencyDollar` (Budget)
- `UserCheck` (Client indicator)
- `Clock` (Status indicator)
- `PencilSimple` / `Archive` / `ArrowClockwise` (Actions)

---

## 9. Responsive & Accessibility Design

### Responsive Rules
- **Desktop (≥ 1024px)**: 3-column card grid, full filter bar.
- **Tablet (768px - 1023px)**: 2-column card grid.
- **Mobile (< 768px)**: 1-column layout, full-width create CTA, stacked filters.

### Accessibility (a11y)
- **Dialog Focus Trap**: `CreateProjectDialog` traps focus and closes on `Esc` or overlay click.
- **ARIA Attributes**: Form inputs use `aria-invalid` and `aria-describedby` for error messages.
- **Color Contrast**: All status badge text combinations maintain WCAG AA ratio (≥ 4.5:1).
