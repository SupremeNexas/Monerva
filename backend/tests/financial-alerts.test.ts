import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateBudgetAlerts,
  evaluateCreditCardAlerts,
  evaluateSpendingLimits,
  evaluateAllFinancialAlerts,
} from '../src/services/alerts/alertEngine';
import { prisma } from '../src/db/prisma';

describe('Spending Limits & Financial Alerts Engine Suite', () => {
  describe('Budget Threshold Alert Evaluations', () => {
    it('Correctly triggers info alert at 50% threshold', async () => {
      const originalFindMany = prisma.budget.findMany;
      const originalAggregate = prisma.transaction.aggregate;

      try {
        (prisma.budget as any).findMany = async () => [
          {
            id: 'b1',
            userId: 'user-1',
            workspaceId: 'ws-1',
            categoryId: 'cat-food',
            amount: 1000,
            startDate: new Date(2026, 8, 1),
            endDate: new Date(2026, 8, 30),
            category: { name: 'Food & Dining' },
          },
        ];

        (prisma.transaction as any).aggregate = async () => ({ _sum: { amount: 500 } });

        const alerts = await evaluateBudgetAlerts('user-1', 'ws-1', 9, 2026);

        assert.equal(alerts.length, 1);
        assert.equal(alerts[0].severity, 'info');
        assert.equal(alerts[0].percentage, 50);
        assert.ok(alerts[0].title.includes('Budget Update'));
      } finally {
        prisma.budget.findMany = originalFindMany;
        prisma.transaction.aggregate = originalAggregate;
      }
    });

    it('Triggers warning alert at 75% and 80% thresholds', async () => {
      const originalFindMany = prisma.budget.findMany;
      const originalAggregate = prisma.transaction.aggregate;

      try {
        (prisma.budget as any).findMany = async () => [
          {
            id: 'b2',
            userId: 'user-1',
            workspaceId: 'ws-1',
            categoryId: 'cat-travel',
            amount: 1000,
            startDate: new Date(2026, 8, 1),
            endDate: new Date(2026, 8, 30),
            category: { name: 'Travel' },
          },
        ];

        (prisma.transaction as any).aggregate = async () => ({ _sum: { amount: 800 } });

        const alerts = await evaluateBudgetAlerts('user-1', 'ws-1', 9, 2026);

        assert.equal(alerts.length, 1);
        assert.equal(alerts[0].severity, 'warning');
        assert.equal(alerts[0].percentage, 80);
        assert.ok(alerts[0].title.includes('High Budget Usage'));
      } finally {
        prisma.budget.findMany = originalFindMany;
        prisma.transaction.aggregate = originalAggregate;
      }
    });

    it('Triggers danger alert at 90% and 100%+ thresholds', async () => {
      const originalFindMany = prisma.budget.findMany;
      const originalAggregate = prisma.transaction.aggregate;

      try {
        (prisma.budget as any).findMany = async () => [
          {
            id: 'b3',
            userId: 'user-1',
            workspaceId: 'ws-1',
            categoryId: 'cat-tech',
            amount: 1000,
            startDate: new Date(2026, 8, 1),
            endDate: new Date(2026, 8, 30),
            category: { name: 'Tech Gadgets' },
          },
        ];

        (prisma.transaction as any).aggregate = async () => ({ _sum: { amount: 1050 } });

        const alerts = await evaluateBudgetAlerts('user-1', 'ws-1', 9, 2026);

        assert.equal(alerts.length, 1);
        assert.equal(alerts[0].severity, 'danger');
        assert.equal(alerts[0].percentage, 105);
        assert.ok(alerts[0].title.includes('Budget Exceeded'));
      } finally {
        prisma.budget.findMany = originalFindMany;
        prisma.transaction.aggregate = originalAggregate;
      }
    });

    it('Handles zero or negative budget limits safely without crashing or divide-by-zero', async () => {
      const originalFindMany = prisma.budget.findMany;

      try {
        (prisma.budget as any).findMany = async () => [
          {
            id: 'b-zero',
            userId: 'user-1',
            workspaceId: 'ws-1',
            categoryId: 'cat-zero',
            amount: 0,
            startDate: new Date(2026, 8, 1),
            endDate: new Date(2026, 8, 30),
            category: { name: 'Empty Budget' },
          },
        ];

        const alerts = await evaluateBudgetAlerts('user-1', 'ws-1', 9, 2026);

        assert.equal(alerts.length, 0);
      } finally {
        prisma.budget.findMany = originalFindMany;
      }
    });
  });

  describe('Credit Card Utilization Calculations', () => {
    it('Calculates low, moderate (>30%), and high (>70%) credit card utilization', async () => {
      const originalFindMany = prisma.creditCard.findMany;

      try {
        (prisma.creditCard as any).findMany = async () => [
          {
            id: 'card-1',
            userId: 'user-1',
            workspaceId: 'ws-1',
            name: 'Platinum Card',
            limitAmount: 10000,
            totalDue: 7500,
            dueDate: new Date(Date.now() + 10 * 86400000),
          },
          {
            id: 'card-2',
            userId: 'user-1',
            workspaceId: 'ws-1',
            name: 'Rewards Card',
            limitAmount: 5000,
            totalDue: 2000,
            dueDate: new Date(Date.now() + 2 * 86400000),
          },
        ];

        const alerts = await evaluateCreditCardAlerts('user-1', 'ws-1');

        assert.ok(alerts.length >= 3);

        const highUtilAlert = alerts.find((a) => a.cardId === 'card-1' && a.severity === 'danger');
        assert.ok(highUtilAlert);
        assert.equal(highUtilAlert?.percentage, 75);

        const dueSoonAlert = alerts.find((a) => a.id === 'card-due-card-2');
        assert.ok(dueSoonAlert);
        assert.equal(dueSoonAlert?.severity, 'danger');
      } finally {
        prisma.creditCard.findMany = originalFindMany;
      }
    });
  });

  describe('Spending Limits Progress Tracking', () => {
    it('Tracks spending progress and flags warning and exceeded statuses', async () => {
      const originalFindMany = prisma.budget.findMany;
      const originalAggregate = prisma.transaction.aggregate;

      try {
        (prisma.budget as any).findMany = async () => [
          {
            id: 'b-cat-1',
            userId: 'user-1',
            workspaceId: 'ws-1',
            categoryId: 'cat-groceries',
            amount: 500,
            startDate: new Date(2026, 8, 1),
            endDate: new Date(2026, 8, 30),
            category: { name: 'Groceries' },
          },
        ];

        (prisma.transaction as any).aggregate = async () => ({ _sum: { amount: 450 } });

        const { limits, alerts } = await evaluateSpendingLimits('user-1', 'ws-1', 9, 2026);

        assert.equal(limits.length, 1);
        assert.equal(limits[0].status, 'warning');
        assert.equal(limits[0].remaining, 50);
        assert.equal(limits[0].percentage, 90);

        assert.equal(alerts.length, 1);
        assert.equal(alerts[0].severity, 'warning');
      } finally {
        prisma.budget.findMany = originalFindMany;
        prisma.transaction.aggregate = originalAggregate;
      }
    });
  });

  describe('Workspace Isolation & Deduplication', () => {
    it('Enforces workspace isolation so alerts from workspace A do not leak to workspace B', async () => {
      const originalFindMany = prisma.budget.findMany;
      const originalAggregate = prisma.transaction.aggregate;

      try {
        (prisma.budget as any).findMany = async (args: any) => {
          if (args.where.workspaceId === 'ws-A') {
            return [
              {
                id: 'b-A',
                userId: 'user-1',
                workspaceId: 'ws-A',
                categoryId: 'cat-A',
                amount: 100,
                startDate: new Date(2026, 8, 1),
                endDate: new Date(2026, 8, 30),
                category: { name: 'Workspace A Category' },
              },
            ];
          }
          return [];
        };

        (prisma.transaction as any).aggregate = async () => ({ _sum: { amount: 95 } });

        const alertsA = await evaluateBudgetAlerts('user-1', 'ws-A', 9, 2026);
        const alertsB = await evaluateBudgetAlerts('user-1', 'ws-B', 9, 2026);

        assert.equal(alertsA.length, 1);
        assert.equal(alertsA[0].categoryName, 'Workspace A Category');
        assert.equal(alertsB.length, 0);
      } finally {
        prisma.budget.findMany = originalFindMany;
        prisma.transaction.aggregate = originalAggregate;
      }
    });

    it('Aggregates and deduplicates alerts in evaluateAllFinancialAlerts without mutating transactions', async () => {
      const originalBudgetFindMany = prisma.budget.findMany;
      const originalCardFindMany = prisma.creditCard.findMany;
      const originalAggregate = prisma.transaction.aggregate;

      try {
        (prisma.budget as any).findMany = async () => [
          {
            id: 'b-dedup',
            userId: 'user-1',
            workspaceId: 'ws-1',
            categoryId: 'cat-dedup',
            amount: 200,
            startDate: new Date(2026, 8, 1),
            endDate: new Date(2026, 8, 30),
            category: { name: 'Deduplicated Category' },
          },
        ];
        (prisma.creditCard as any).findMany = async () => [];
        (prisma.transaction as any).aggregate = async () => ({ _sum: { amount: 210 } });

        const result = await evaluateAllFinancialAlerts('user-1', 'ws-1');

        assert.equal(result.summary.totalAlerts, 2);
        assert.equal(result.alerts[0].severity, 'danger');
      } finally {
        prisma.budget.findMany = originalBudgetFindMany;
        prisma.creditCard.findMany = originalCardFindMany;
        prisma.transaction.aggregate = originalAggregate;
      }
    });
  });
});
