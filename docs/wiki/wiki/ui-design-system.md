# UI Design System

Last Updated: 2026-07-19

This document outlines the visual variables, styling guidelines, and theme tokens implemented across the Expense Tracker web application. The design system is inspired by premium SaaS layouts (Linear, Stripe, CRED) and is optimized for both light and dark modes.

---

## 🎨 HSL Color Tokens

Colors are declared inside [index.css](file:///Users/supryo/Desktop/Expense-Tracker/frontend/src/index.css) as CSS custom properties mapped to light and dark themes.

### Light Theme Tokens
```css
:root {
  --background: 0 0% 98%;       /* #FAFAFA - Off-white canvas */
  --card: 0 0% 100%;            /* #FFFFFF - Pure white card containers */
  --text: 240 10% 3.9%;         /* Deep near-black slate */
  --muted: 240 3.8% 46.1%;      /* Slate gray details */
  --border: 240 5.9% 90%;       /* Soft borders (#E5E5E5) */
  --radius-interactive: 18px;   /* Smooth rounded corner primitives */
}
```

### Dark Theme Tokens
```css
.dark {
  --background: 0 0% 5%;        /* Deep carbon black canvas (#0D0D0D) */
  --card: 0 0% 8%;              /* Dark charcoal cards (#151515) */
  --text: 0 0% 98%;             /* Crisp off-white text */
  --muted: 240 5% 64.9%;        /* Dimmed slate grey details */
  --border: 240 5.9% 15%;       /* Subdued charcoal borders */
}
```

---

## 📐 Spacing & Layout Structure

*   **Page Canvas**: Managed by the [Layout](file:///Users/supryo/Desktop/Expense-Tracker/frontend/src/components/Layout/Layout.tsx) system.
*   **Sidebar Width**: Fluid width transitioning from `w-64` (default) to `w-16` (collapsed mode) with a smooth transition of `transition-all duration-300`.
*   **Grid Layouts**: Pages use a flexible Tailwind grid structure (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) with consistent gap alignments (`gap-6`).
*   **Form Sizing**: Input columns and select interfaces are set to height `h-[56px]` with custom border-radius properties (`rounded-[18px]`) to maintain CRED-like high-end fields.

---

## ✨ Shimmer & Interaction Effects

### Volcanic Shimmer Loading Animation
The `.shimmer` class utilizes a CSS keyframe animation modifying the background-position of a repeating linear gradient:
```css
.shimmer {
  background: linear-gradient(
    90deg,
    var(--border) 25%,
    rgba(255, 255, 255, 0.05) 50%,
    var(--border) 75%
  );
  background-size: 200% 100%;
  animation: shimmer-swipe 1.6s infinite linear;
}
```

### Premium Button Hover States
*   **Micro-Scaling**: Buttons dynamically scale to `scale-[0.98]` on tap using `framer-motion` to replicate hardware clicks.
*   **Glassmorphic Overlays**: Modals utilize backdrop-blur properties (`backdrop-blur-md bg-black/30`) to emphasize content overlays over the background canvas.
*   **Dynamic Borders**: Custom input fields focus with a crisp brand outline (`focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10`).

---

## 🔗 Related Resources
*   Read [[wiki/components]] for reusable component interfaces.
*   Read [[wiki/design-principles]] for design guidelines.
