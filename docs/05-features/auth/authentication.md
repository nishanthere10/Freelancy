# Authentication Specification — Product & User Experience

**Document Status:** DRAFT (Sprint 5 Phase 0)  
**Target Delivery:** Sprint 5 Phase 1  
**Author:** Principal Security Architect & Lead Engineer  

---

## 1. Executive Summary & Purpose

The purpose of **Sprint 5 Authentication** is to replace the development mock identity (`550e8400-e29b-41d4-a716-446655440000`) with production-grade, secure, multi-tenant authentication using **Clerk** as the managed Identity Provider (IdP).

Authentication guarantees that:
1. Users must verify their identity before accessing workspace resources.
2. Identity is securely bound to real users across sessions and devices.
3. Multi-workspace access, invitation workflows, and RBAC permissions operate on verified user accounts.

---

## 2. Target User Journeys

### Journey 1: New User Registration & First Workspace Onboarding
1. **Landing / Sign-Up**: Unauthenticated visitor clicks "Get Started" or navigates to `/sign-up`.
2. **Identity Creation**: User completes Clerk Sign-Up (Email + Password or OAuth via Google/GitHub).
3. **Provisioning**: User is provisioned in the internal Freelance-OS database (`users` table).
4. **First Workspace Onboarding**: If the user has no workspace membership, they are directed to `/onboarding/workspace` to name their first workspace (e.g. "Acme Studio").
5. **Ownership Assignment**: The system creates the workspace, assigns the user as `owner` in `workspace_members`, and redirects to `/workspaces/[workspaceId]/clients`.

### Journey 2: Existing User Sign-In
1. **Sign-In**: Returning user navigates to `/sign-in` and enters credentials or completes OAuth.
2. **Session Verification**: Clerk issues a secure session token (HTTP-only cookie / JWT).
3. **Workspace Resolution**: System resolves user's active/last-used workspace.
4. **Redirect**: User is navigated directly to their workspace dashboard.

### Journey 3: Sign-Out
1. **User Action**: User clicks "Sign Out" from the profile dropdown.
2. **Session Revocation**: Clerk invalidates session tokens on server and client.
3. **Redirect**: User is redirected to `/sign-in`.

### Journey 4: Multi-Workspace Switcher
1. **Workspace Selection**: User with memberships in multiple workspaces selects a different workspace from the header dropdown.
2. **Permission Check**: System verifies `workspace_members` membership for target workspace.
3. **Route Navigation**: Browser navigates to `/workspaces/[newWorkspaceId]`.

---

## 3. Protected vs. Public Areas

| Route Pattern | Access Level | Unauthenticated Behavior |
| :--- | :--- | :--- |
| `/` | Public | Displays landing page with Sign In / Sign Up buttons. |
| `/sign-in/*` | Public | Renders Clerk Sign-In component. Redirects to `/workspaces` if already authenticated. |
| `/sign-up/*` | Public | Renders Clerk Sign-Up component. Redirects to `/workspaces` if already authenticated. |
| `/onboarding/*` | Authenticated | Redirects to `/sign-in` if unauthenticated. Redirects to `/workspaces` if user already has a workspace. |
| `/workspaces` | Authenticated | Redirects to `/sign-in` if unauthenticated. Resolves active workspace or sends to `/onboarding`. |
| `/workspaces/[workspaceId]/**` | Workspace-Scoped | Requires valid session + active membership in `workspace_members`. Returns 403/404 if not a member. |
| `/api/v1/**` | Authenticated API | Returns `401 Unauthorized` JSON response if session token is missing or invalid. |

---

## 4. MVP Product Scope & Explicit Exclusions

### Included in MVP Scope (Sprint 5)
- Clerk Email + Password & Google/GitHub OAuth authentication.
- Auto-provisioning of internal `users` record on first login.
- Protected client-side routes & server API endpoints.
- Single active workspace selection with initial onboarding flow.
- Session persistence and secure sign-out.

### Explicitly Excluded from MVP Scope
- Multi-factor authentication (MFA) enforcement (deferred to post-MVP).
- Custom self-hosted auth provider / SAML SSO (Enterprise tier feature).
- Complex team member invitation email system (handled in Sprint 6 Workspace Management).
- Custom white-labeled domain authentication.

---

## 5. Acceptance Criteria

1. **Unauthenticated Gate**: Navigating directly to `/workspaces` without a valid Clerk session MUST redirect to `/sign-in`.
2. **API Protection**: All `POST`, `GET`, `PATCH`, `DELETE` requests to `/api/v1/workspaces/*` without a valid Bearer token MUST receive `401 Unauthorized`.
3. **RBAC Preservation**: Once authenticated, domain policy rules (`canCreateClient`, `canUpdateInvoice`, etc.) MUST operate seamlessly using the authenticated user's internal UUID.
4. **Zero Mock ID Leakage**: No route, middleware, or database query may fall back to `550e8400-e29b-41d4-a716-446655440000` in non-test environments.
