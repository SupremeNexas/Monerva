# UI/UX Design Principles

Last Updated: 2026-07-19

This document records the visual philosophies and UX conventions followed during the Phase 2 polish of the Expense Tracker codebase.

---

## 🎨 Design Principles

### 1. Minimalist & Uncluttered Layouts
*   **Whitespace**: Embrace generous margins and padding. Ensure cards and elements have breathing room to help the user digest numerical data easily.
*   **Card Containers**: Use uniform border rules (`border border-black/[0.05] dark:border-white/[0.05]`) instead of heavy shadows or solid black separators.
*   **Muted Color Canvas**: Set backgrounds to near-white (`#FAFAFA`) or deep carbon black (`#0C0C0C`) so that colored expense items, badges, and positive inflow values draw focused attention.

### 2. High-Fidelity Feedback & Animations
*   **Interactive Scaling**: Hoverable elements should scale or translate smoothly. Use spring configurations for modal layouts to make overlays feel dynamic.
*   **Exit Animations**: Dialog closures, Toast dismissals, and alert notifications must slide or fade out using React/Framer Motion `<AnimatePresence>` to prevent sudden visual breaks.
*   **Validation States**: Form fields should provide visual error rings and helper messages immediately when inputs are invalid.

### 3. Shimmer Loading Experience
*   Avoid blank screens or raw text "Loading..." indicators.
*   Use custom `.shimmer` layout placeholders that closely mirror the sizing and structure of the loaded data blocks.

---

## 🛠️ Design Enforcement Checklist
When developing new features:
1. Ensure all modals utilize the centralized [Modal](file:///Users/supryo/Desktop/Expense-Tracker/frontend/src/components/UI/Modal.tsx) primitive with focus trapping and ESC listeners.
2. Form fields must use the shared [Input](file:///Users/supryo/Desktop/Expense-Tracker/frontend/src/components/UI/Input.tsx) and [Select](file:///Users/supryo/Desktop/Expense-Tracker/frontend/src/components/UI/Select.tsx) wrappers to maintain uniform heights and styling.
3. List structures with API queries must show [SkeletonList](file:///Users/supryo/Desktop/Expense-Tracker/frontend/src/components/UI/Skeleton.tsx) during fetches and [EmptyState](file:///Users/supryo/Desktop/Expense-Tracker/frontend/src/components/UI/EmptyState.tsx) when dataset sizes return 0.

---

## 🔗 Related Resources
*   Read [[wiki/ui-design-system]] for style tokens.
*   Read [[wiki/components]] for component libraries.
