# Multi-Currency Support Wiki

Last Updated: 2026-07-19

This wiki page outlines the multi-currency conversion architectures, rates provider abstractions, and display rules in the Expense Tracker.

---

## 💱 Multi-Currency Architecture

The application supports tracking balances across multiple currencies:
*   **User Base Currency**: Configured in user profile settings. Controls default presentation displays.
*   **Per-Wallet Currency**: Wallets can be assigned individual currencies (e.g. standard Cash wallet in INR, Travel cards in EUR, business accounts in USD).
*   **Automatic Conversion**: On transaction creation, values are dynamically converted into the workspace base currency for correct aggregated charting.

---

## 📡 Exchange Rates Provider (`converter.ts`)

The converter abstracts third-party rates APIs behind the `ExchangeRateProvider` interface:

```typescript
export interface ExchangeRateProvider {
  getRates(base: string): Promise<Record<string, number>>;
}
```

*   **Offline Fallback Manager**: Includes a local provider returning realistic cached exchange rates (relative to USD) to guarantee offline functionality.
*   **Live Integration Prep**: Open Exchange Rates or exchangerate.host API integrations can be wired in with no business-level modifications.

---

## 🔗 Related Resources
*   Read [[wiki/wallets]] for wallet profiles.
*   Read [[wiki/ai-architecture]] for AI forecasting.
