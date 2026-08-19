# Activity Feed UI & Design Specification

## 1. Design Philosophy

The Activity Feed UI provides high-density, glanceable business history adhering to the **Freelance OS Design System**:
- **Typography**: Google Fonts `Plus Jakarta Sans` for clarity across event names, timestamps, and actor labels.
- **Glassmorphism**: Translucent card backgrounds (`bg-card/40 backdrop-blur-xs`) with subtle neutral borders (`border-border/60`).
- **Tactile Feedback**: Smooth hover states with micro-interactions (`active:scale-[0.98]`).

---

## 2. Domain Color Accents & Icons

Each activity entry is visually anchored by a domain-specific Phosphor icon and HSL color badge:

| Domain | Icon | Accent Palette | Badge Class |
| :--- | :--- | :--- | :--- |
| **Client** | `UserPlus` / `Buildings` | Teal | `bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20` |
| **Project** | `FolderPlus` / `Briefcase` | Yellow / Amber | `bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20` |
| **Invoice** | `Receipt` / `CreditCard` | Rose | `bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20` |
| **Workspace / Member** | `Users` | Indigo | `bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20` |

---

## 3. Component Hierarchy (`apps/web/src/features/activity`)

```text
ActivityFeed (Container & Card Wrapper)
  ├── ActivityHeader (Title + Event Count Badge)
  ├── ActivitySkeleton (Loading state with 5 pulse rows)
  ├── ActivityEmptyState (Empty state with Clock icon)
  └── ActivityItem[] (Individual event cards)
        ├── Icon Badge (Domain color & Phosphor icon)
        ├── Message (Human-readable description)
        └── Subtext (Actor name + relative timestamp)
```

---

## 4. Relative Time Rendering

Timestamps are formatted relative to user's local time:
- `< 60s`: `Just now`
- `< 60m`: `Xm ago`
- `< 24h`: `Xh ago`
- `1 day`: `Yesterday`
- `< 7 days`: `Xd ago`
- `≥ 7 days`: Formatted date (e.g. `Aug 19`)

---

## 5. Responsive Behavior

- **Mobile (< 640px)**: Compact padding (`p-3.5`), font sizes scaled to `text-xs`.
- **Desktop (≥ 1024px)**: 1/3 width sidebar column in executive dashboard layout next to `RecentInvoicesList`.
