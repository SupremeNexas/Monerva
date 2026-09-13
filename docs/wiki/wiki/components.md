# Reusable Visual Component Library

Last Updated: 2026-07-19

This document details the API structure and visual conventions for the reusable UI components located in [frontend/src/components/UI/](file:///Users/supryo/Desktop/Expense-Tracker/frontend/src/components/UI).

---

## 🔘 Button (`Button.tsx`)

A spring-animated control for submits and actions.

### Props
*   `variant` (`'primary' | 'secondary' | 'danger' | 'ghost'`): Controls colors, shadows, and hover transitions.
*   `size` (`'sm' | 'md' | 'lg'`): Height and padding settings.
*   `loading` (`boolean`): Replaces labels with a smooth circular spinner and disables actions.
*   `icon` (`React.ReactNode`): Renders helper graphics before text.

### Example
```typescript
import { Button } from '../UI/Button';

<Button 
  type="submit" 
  variant="primary"
  loading={isSubmitting}
>
  Confirm Payment
</Button>
```

---

## ✍️ Input (`Input.tsx`)

Unified text, number, and date input fields.

### Props
*   `label` (`string`): Small label above fields.
*   `error` (`string`): Helper invalid details. Applies red outline.
*   `icon` (`React.ReactNode`): Prefix label content inside the input.
*   Standard HTML input properties (`type`, `placeholder`, `value`, `onChange`, `required`, etc.).

### Example
```typescript
import { Input } from '../UI/Input';

<Input 
  label="Target Amount"
  type="number"
  value={amount}
  onChange={e => setAmount(e.target.value)}
  icon={<span className="text-sm font-semibold">₹</span>}
  required
/>
```

---

## 🔽 Select (`Select.tsx`)

Unified drop-down field.

### Props
*   `label` (`string`): Input label.
*   `error` (`string`): Validation details.
*   Standard select parameters.

### Example
```typescript
import { Select } from '../UI/Select';

<Select label="Interval" name="cycle" value={cycle} onChange={handleChange}>
  <option value="monthly">Monthly</option>
  <option value="yearly">Yearly</option>
</Select>
```

---

## ⚡ Loading Skeletons (`Skeleton.tsx`)

Visual placeholders to manage initial API fetches.

### Components
*   `Skeleton`: Basic custom shimmer line.
*   `SkeletonCard`: Medium height dashboard stats representation block.
*   `SkeletonList`: Column row item lists representation block.
*   `SkeletonChart`: Wide grid chart representation block.

### Example
```typescript
import { SkeletonCard } from '../UI/Skeleton';

{isLoading ? <SkeletonCard /> : <DataCard />}
```

---

## 🕳️ Empty States (`EmptyState.tsx`)

Standardized illustration view shown when datasets are empty.

### Props
*   `iconName` (`string`): Lucide icon identifier.
*   `title` (`string`): Bold heading.
*   `description` (`string`): Support explanation detail.
*   `action` (`React.ReactNode`): Custom action elements like buttons.

### Example
```typescript
import EmptyState from '../UI/EmptyState';

<EmptyState
  iconName="Milestone"
  title="No savings goals found"
  description="Fund a laptop or vacation target to track progress."
/>
```

---

## 🔗 Related Resources
*   Read [[wiki/ui-design-system]] for style parameters.
*   Read [[wiki/design-principles]] for UX guidelines.
