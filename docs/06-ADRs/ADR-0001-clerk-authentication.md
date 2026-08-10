# ADR-0001: Selection of Clerk for Managed Authentication

**Status:** PROPOSED  
**Date:** August 10, 2026  
**Deciders:** Principal Security Architect & Lead Full-Stack Engineer  

---

## 1. Context & Problem Statement

Freelance-OS is transitioning from a local development mock identity system (`550e8400-e29b-41d4-a716-446655440000`) to production-grade authentication.

Requirements:
1. Multi-tenant workspace isolation.
2. Secure session management across Next.js 15 App Router (`apps/web`) and Express REST API (`apps/api`).
3. Out-of-the-box support for Email + Password, Google, and GitHub OAuth logins.
4. Seamless integration without compromising Freelance-OS domain RBAC policies or PostgreSQL relational integrity.

---

## 2. Options Considered

### Option A: Clerk Managed Identity Provider (RECOMMENDED)
- **Pros**: Managed UI components (`<SignIn />`, `<SignUp />`, `<UserButton />`), native `@clerk/nextjs` and `@clerk/express` SDKs, built-in session token rotation, zero password storage liability, handles MFA and OAuth state seamlessly.
- **Cons**: Third-party SaaS dependency.

### Option B: Auth.js / NextAuth.js
- **Pros**: Open-source, flexible session storage.
- **Cons**: Complex Express API token bridge requiring custom JWT verification logic; requires building custom auth UI components and managing session database tables manually.

### Option C: Custom Auth / Passport / Express JWT
- **Pros**: Complete control.
- **Cons**: High security risk (password hashing, CSRF, refresh token storage, password resets, rate limiting), significant engineering overhead.

---

## 3. Decision

We decide to adopt **Option A: Clerk** as the primary authentication provider for Freelance-OS.

---

## 4. Why Clerk Fits This Architecture

1. **Clean Separation of Concerns**:
   - Clerk handles **Authentication** (Who is the user?).
   - Freelance-OS handles **Authorization & RBAC** (What can the user do in workspace X?).
2. **First-Class Express & Next.js SDKs**:
   - `@clerk/nextjs` provides zero-latency server component session checks.
   - `@clerk/express` provides fast JWT verification middleware for Express REST endpoints.
3. **Domain Autonomy Preserved**:
   - By mapping Clerk IDs (`clerk_id`) to an internal `users` table (`id: UUID`), domain repositories and policies (`canCreateClient`, `canUpdateInvoice`) remain 100% decoupled from Clerk.

---

## 5. Consequences & Security Implications

- **Vendor Decoupling**: If Freelance-OS ever migrates away from Clerk in the future, only the `userResolverMiddleware` and client SDK change. Domain logic, database tables, and policies remain intact.
- **Security Posture**: Offloads credential handling, OWASP auth vulnerabilities, and OAuth token rotation to a hardened identity provider.
