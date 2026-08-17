// budgetConfig.ts
// TODO: this should come from a user-configurable setting once that exists
// (see the matching TODO that used to live inline in InsightsScreen.tsx).
// Centralized here so the Insights budget card and the Cart screen's
// "Snack Fund" widget (Feature 8) both read the same monthly limit instead
// of each hardcoding their own copy that could drift apart.
export const MONTHLY_BUDGET_LIMIT = 5000;
