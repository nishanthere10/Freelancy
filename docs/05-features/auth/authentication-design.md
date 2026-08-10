# Authentication UX/UI & Design Specification

**Document Version:** 1.0  
**Status:** UX SPECIFICATION (Sprint 5 Phase 0)  
**Target App:** `apps/web`  

---

## 1. Overview & Design Language Alignment

Authentication interfaces in Freelance-OS must strictly adhere to the existing design system guidelines (`tokens.css`, `globals.css`):
- **Typography**: Inter / System Sans, strict hierarchy.
- **Palette**: Warm slate background (`--color-canvas`), deep ink headings (`--color-ink-deep`), amber accent buttons (`--color-brand-yellow-deep`), hairline borders (`--color-hairline`).
- **Modal & Container Styling**: Rounded-2xl cards (`rounded-2xl`), subtle shadows (`shadow-xl`), generous breathing room (`p-8`).

---

## 2. Page & Layout Specifications

### A. Sign-In Page (`/sign-in/[[...sign-in]]/page.tsx`)
- **Layout**: Centered card layout on `--color-canvas` background.
- **Header**: Freelance-OS logo mark + subtitle "Sign in to manage your freelance operations".
- **Clerk Component**: `<SignIn />` embedded inside a styled wrapper container.
- **Appearance Customization**: Customized via Clerk `appearance` prop to match design tokens:
  ```ts
  appearance={{
    elements: {
      card: "shadow-xl border border-[var(--color-hairline)] rounded-2xl bg-white",
      formButtonPrimary: "bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold",
      footerActionLink: "text-amber-600 hover:text-amber-700 font-medium",
    }
  }}
  ```

### B. Sign-Up Page (`/sign-up/[[...sign-up]]/page.tsx`)
- **Layout**: Centered card layout matching Sign-In page.
- **Header**: Freelance-OS logo mark + subtitle "Create your account to start managing clients & invoices".
- **Clerk Component**: `<SignUp />` embedded with matching design token appearance.

### C. Workspace Onboarding Page (`/onboarding/workspace/page.tsx`)
- **Trigger**: Displayed automatically after sign-up if the user does not belong to any workspace.
- **UI Elements**:
  - Step indicator: "Step 1 of 1: Create your workspace".
  - Input field: "Workspace Name" (e.g. *Acme Design Studio*).
  - Input field: "Workspace Slug" (Auto-generated from name, e.g. `acme-design-studio`).
  - Submit Button: "Create Workspace & Continue".

### D. Header & Navbar Navigation Changes (`Navbar.tsx`)
- **Unauthenticated State**:
  - Links: Features, Pricing.
  - Actions: "Sign In" (Outline Button) and "Get Started" (Primary Amber Button).
- **Authenticated State**:
  - Links: Workspaces, Clients, Projects, Invoices.
  - Workspace Switcher Dropdown: Shows active workspace logo + name.
  - User Menu: Clerk `<UserButton />` displaying user avatar, name, email, and "Sign Out" action.

---

## 3. Auth State Micro-Interactions & Loading States

```text
[ Unauthenticated User ] ──> Navigates to /workspaces ──> [ Full Page Skeleton ] ──> Redirects to /sign-in
[ Authenticated User ]   ──> Submits Sign-In Form    ──> [ Spinner on Button ]  ──> Redirects to /workspaces/ws-id
```

### Loading States
- **Page Load**: Protected route displays a clean centered logo pulse animation while verifying Clerk session tokens.
- **Action Pending**: Form buttons show inline spinner + text "Signing in..." / "Creating workspace...".

---

## 4. Mobile & Responsiveness

- Auth pages use fluid padding (`p-4 sm:p-8`) to render cleanly on mobile viewports (375px+).
- Dialogs and Clerk components scale to `max-w-md` on mobile and `max-w-lg` on desktop screens.
