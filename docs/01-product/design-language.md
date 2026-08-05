# Design Language

**Document Version:** 1.0
**Status:** Immutable (Requires ADR for Changes)
**Owner:** Product & Design
**Last Updated:** August 2026

---

# 1. Purpose

This document defines the visual identity, design philosophy, and user experience principles of the product.

It serves as the **single source of truth** for every designer, frontend engineer, AI coding agent, and contributor.

Every screen, component, interaction, animation, and layout must follow this document.

No feature may invent its own visual language.

---

# 2. Brand Personality

The product should communicate the following values:

* Trustworthy
* Intelligent
* Professional
* Calm
* Efficient
* Premium
* Modern
* Minimal
* Precise

The interface should never feel playful, noisy, or experimental.

Users should immediately feel that they are using a reliable professional tool.

---

# 3. Product Personality

If this product were a person, it would be:

* Calm under pressure
* Highly organized
* Helpful without being intrusive
* Technically competent
* Honest
* Efficient
* Detail-oriented

The UI should never feel overwhelming.

---

# 4. Design Philosophy

The product follows five core principles.

## 4.1 Simplicity First

Every screen should answer one question.

Avoid unnecessary visual elements.

Whitespace is preferred over decoration.

---

## 4.2 Function Before Decoration

Visual elements exist to improve usability.

Never add gradients, animations, shadows, or colors purely for decoration.

Everything must communicate purpose.

---

## 4.3 Consistency

The same action should always look and behave the same.

Buttons, dialogs, forms, cards, spacing, typography, and colors should remain consistent across every feature.

---

## 4.4 Progressive Disclosure

Only display information that is currently useful.

Advanced actions should remain hidden until needed.

Reduce cognitive load.

---

## 4.5 Immediate Feedback

Every user action must provide feedback.

Examples include:

* Loading indicators
* Skeletons
* Success toasts
* Inline validation
* Error messages
* Disabled states

The interface should never leave the user wondering whether something happened.

---

# 5. Visual Identity

The product follows a **Modern SaaS** design language.

Primary inspirations include:

* Linear
* Vercel
* Stripe Dashboard
* Raycast
* OpenAI

These are references for quality and interaction—not for imitation.

---

# 6. Theme Strategy

The application is **Dark-First**.

Dark mode is the primary design target.

Light mode will be supported in a future release.

All new screens should be designed for dark mode first.

---

# 7. Color Philosophy

Color communicates meaning—not decoration.

The majority of the interface should rely on:

* Typography
* Layout
* Whitespace
* Elevation
* Borders

Accent colors should be used sparingly.

Approximately:

* 90% Neutral Colors
* 10% Accent Colors

---

# 8. Color Palette

## Brand

Primary

`#2563EB`

Hover

`#1D4ED8`

Accent

`#3B82F6`

---

## Semantic Colors

Success

`#22C55E`

Warning

`#F59E0B`

Danger

`#EF4444`

Info

`#06B6D4`

---

## Neutral Palette

Background

`#0B0F19`

Surface

`#111827`

Surface Elevated

`#1F2937`

Border

`#374151`

Divider

`#4B5563`

Primary Text

`#F9FAFB`

Secondary Text

`#D1D5DB`

Muted Text

`#9CA3AF`

---

# 9. Typography

Primary Font

**Geist**

Fallback

**Inter**

Use typography instead of excessive color.

### Font Weights

400

500

600

700

Avoid heavier weights.

---

# 10. Spacing System

The application follows an **8-point grid system**.

Preferred spacing values:

4

8

12

16

24

32

48

64

Use spacing to separate concepts.

Avoid excessive borders.

---

# 11. Border Radius

Buttons

10px

Inputs

10px

Cards

16px

Dialogs

20px

Badges

Full

Rounded corners should feel modern but restrained.

---

# 12. Elevation

Elevation communicates hierarchy.

Cards

Subtle shadow.

Dialogs

Medium shadow.

Buttons

No shadow until hover.

Avoid dramatic shadows.

---

# 13. Motion

Animations should explain state.

Never distract.

Duration

150–250ms

Use ease-out transitions.

Avoid:

* Bounce
* Elastic
* Overshoot
* Flashy effects

---

# 14. Iconography

Use **Lucide React** exclusively.

Preferred size:

18–20px

Icons should accompany labels whenever possible.

Avoid icon-only interfaces unless universally understood.

---

# 15. Layout Principles

Prefer generous whitespace.

Use content width constraints.

Avoid edge-to-edge layouts except where appropriate.

Users should always understand visual hierarchy immediately.

---

# 16. Component Philosophy

Components should be:

* Predictable
* Reusable
* Accessible
* Composable

Do not create feature-specific visual styles.

Shared components belong in the shared design system.

---

# 17. Empty States

Empty states should educate and encourage.

Every empty state should include:

* Friendly illustration (future)
* Clear explanation
* Primary CTA
* Secondary guidance

An empty screen should never feel like an error.

---

# 18. Loading States

Prefer Skeleton UI over spinners.

Use spinners only for:

* Short actions
* Form submission
* Blocking operations

Long loading experiences should use skeleton placeholders.

---

# 19. Error Experience

Errors should:

* Explain what happened
* Explain what the user can do
* Avoid technical jargon

Never expose stack traces or backend error messages.

---

# 20. Accessibility

Every screen must support:

* Keyboard navigation
* Visible focus indicators
* Screen readers
* WCAG AA contrast
* Proper semantic HTML
* ARIA where necessary

Accessibility is not optional.

---

# 21. Responsive Philosophy

Desktop-first.

Tablet supported.

Mobile optimized.

Never remove functionality on smaller screens.

Adapt layout—not capability.

---

# 22. Micro-Interactions

Micro-interactions should reinforce user confidence.

Examples:

* Button hover
* Card elevation
* Toast animations
* Dialog transitions
* Input focus
* Success feedback

Interactions should feel subtle and intentional.

---

# 23. AI Design Rules

AI coding agents must follow these rules without exception.

## Never

* Invent colors
* Invent spacing
* Invent typography
* Invent shadows
* Invent animations
* Invent button styles
* Create feature-specific design systems

## Always

* Use the shared design tokens
* Use shared UI components
* Use the documented spacing system
* Follow the established visual hierarchy
* Reuse existing patterns before creating new ones

Consistency is more important than novelty.

---

# 24. Definition of Success

A successful interface should make users feel:

* Confident
* Focused
* Productive
* In control

The UI should disappear behind the user's workflow.

Users should remember what they accomplished—not how the interface looked.

---

# 25. Future Evolution

Any changes to the design language require:

1. Architectural discussion
2. Product review
3. Design review
4. Architecture Decision Record (ADR)

This document is intended to remain stable over the lifetime of the product.
