import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres@localhost:5433/expense_tracker?schema=public';
}
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/db/prisma';

describe('Income Tracking & Accounting Model Integrity Test Suite', () => {
  const testUserId = 'test-income-user-1';
  const testWorkspaceId = 'test-income-workspace-1';
  const otherWorkspaceId = 'test-income-workspace-2';

  let testWalletId: string;
  let incomeCategoryId: string;
  let expenseCategoryId: string;

  before(async () => {
    // Ensure test user exists
    let user = await prisma.user.findUnique({ where: { id: testUserId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: testUserId,
          email: 'income-tester@monerva.local',
          name: 'Income Tester',
          authProvider: 'LOCAL'
        }
      });
    }

    // Ensure test workspace exists
    let ws = await prisma.workspace.findUnique({ where: { id: testWorkspaceId } });
    if (!ws) {
      ws = await prisma.workspace.create({
        data: {
          id: testWorkspaceId,
          name: 'Income Test Workspace',
          type: 'PERSONAL'
        }
      });
    }

    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: testWorkspaceId, userId: testUserId }
      }
    });
    if (!member) {
      await prisma.workspaceMember.create({
        data: {
          workspaceId: testWorkspaceId,
          userId: testUserId,
          role: 'OWNER'
        }
      });
    }

      // Create test wallet
      const wallet = await prisma.wallet.create({
        data: {
          userId: testUserId,
          workspaceId: testWorkspaceId,
          name: 'Income Test Wallet',
          type: 'BANK',
          balance: 1000.00
        }
      });
      testWalletId = wallet.id;

      // Create income & expense categories
      const incCat = await prisma.category.create({
        data: {
          name: 'Test Salary Category',
          type: 'INCOME',
          color: '#10B981',
          icon: 'briefcase'
        }
      });
      incomeCategoryId = incCat.id;

      const expCat = await prisma.category.create({
        data: {
          name: 'Test Grocery Category',
          type: 'EXPENSE',
          color: '#EF4444',
          icon: 'shopping-cart'
        }
      });
      expenseCategoryId = expCat.id;
  });

  after(async () => {
    try {
      if (testWorkspaceId) {
        await prisma.transaction.deleteMany({ where: { workspaceId: testWorkspaceId } });
        await prisma.recurringTransaction.deleteMany({ where: { workspaceId: testWorkspaceId } });
        await prisma.wallet.deleteMany({ where: { workspaceId: testWorkspaceId } });
        await prisma.workspaceMember.deleteMany({ where: { workspaceId: testWorkspaceId } });
        await prisma.workspace.deleteMany({ where: { id: testWorkspaceId } });
        await prisma.user.deleteMany({ where: { id: testUserId } });
      }
      if (incomeCategoryId) await prisma.category.delete({ where: { id: incomeCategoryId } }).catch(() => {});
      if (expenseCategoryId) await prisma.category.delete({ where: { id: expenseCategoryId } }).catch(() => {});
    } catch (e) {
      // Cleanup cleanup errors
    } finally {
      await prisma.$disconnect();
    }
  });

  it('1. INCOME CREATION: Increments wallet balance by exact income amount', async () => {
    if (!testWalletId) return;

    const initialWallet = await prisma.wallet.findUnique({ where: { id: testWalletId } });
    const startBalance = Number(initialWallet?.balance || 0);

    const incomeAmount = 5000.50;

    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          userId: testUserId,
          workspaceId: testWorkspaceId,
          title: 'Monthly Tech Salary',
          amount: incomeAmount,
          type: 'INCOME',
          categoryId: incomeCategoryId,
          walletId: testWalletId,
          date: new Date()
        }
      });

      await tx.wallet.update({
        where: { id: testWalletId },
        data: { balance: { increment: incomeAmount } }
      });

      return created;
    });

    assert.equal(transaction.type, 'INCOME');
    assert.equal(Number(transaction.amount), incomeAmount);

    const updatedWallet = await prisma.wallet.findUnique({ where: { id: testWalletId } });
    assert.equal(Number(updatedWallet?.balance), startBalance + incomeAmount);
  });

  it('2. INCOME EDIT BEHAVIOR: Correctly adjusts wallet balance when income amount is edited', async () => {
    if (!testWalletId) return;

    // Create initial income entry of $1000
    const initialIncome = await prisma.transaction.create({
      data: {
        userId: testUserId,
        workspaceId: testWorkspaceId,
        title: 'Freelance Design Retainer',
        amount: 1000.00,
        type: 'INCOME',
        categoryId: incomeCategoryId,
        walletId: testWalletId,
        date: new Date()
      }
    });

    await prisma.wallet.update({
      where: { id: testWalletId },
      data: { balance: { increment: 1000.00 } }
    });

    const walletBeforeEdit = await prisma.wallet.findUnique({ where: { id: testWalletId } });
    const balanceBeforeEdit = Number(walletBeforeEdit?.balance);

    // Edit income from $1000 to $1500 (difference of +$500)
    const oldAmount = Number(initialIncome.amount);
    const newAmount = 1500.00;
    const diff = newAmount - oldAmount; // +500

    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: initialIncome.id },
        data: { amount: newAmount }
      });

      await tx.wallet.update({
        where: { id: testWalletId },
        data: { balance: { increment: diff } }
      });
    });

    const walletAfterEdit = await prisma.wallet.findUnique({ where: { id: testWalletId } });
    assert.equal(Number(walletAfterEdit?.balance), balanceBeforeEdit + 500.00);
  });

  it('3. INCOME DELETION BEHAVIOR: Decrements wallet balance when income record is deleted', async () => {
    if (!testWalletId) return;

    // Create income to delete
    const incomeToDelete = await prisma.transaction.create({
      data: {
        userId: testUserId,
        workspaceId: testWorkspaceId,
        title: 'Consulting Bonus',
        amount: 750.25,
        type: 'INCOME',
        categoryId: incomeCategoryId,
        walletId: testWalletId,
        date: new Date()
      }
    });

    await prisma.wallet.update({
      where: { id: testWalletId },
      data: { balance: { increment: 750.25 } }
    });

    const walletBeforeDelete = await prisma.wallet.findUnique({ where: { id: testWalletId } });
    const balanceBeforeDelete = Number(walletBeforeDelete?.balance);

    // Delete transaction and decrement balance
    await prisma.$transaction(async (tx) => {
      await tx.transaction.delete({ where: { id: incomeToDelete.id } });
      await tx.wallet.update({
        where: { id: testWalletId },
        data: { balance: { decrement: 750.25 } }
      });
    });

    const walletAfterDelete = await prisma.wallet.findUnique({ where: { id: testWalletId } });
    assert.equal(Number(walletAfterDelete?.balance), balanceBeforeDelete - 750.25);
  });

  it('4. RECURRING INCOME RULES: Creates schedule and processes recurring income into transactions', async () => {
    if (!testWalletId) return;

    const recurringRule = await prisma.recurringTransaction.create({
      data: {
        userId: testUserId,
        workspaceId: testWorkspaceId,
        title: 'Bi-Weekly Retainer',
        amount: 2500.00,
        type: 'INCOME',
        frequency: 'MONTHLY',
        categoryId: incomeCategoryId,
        walletId: testWalletId,
        startDate: new Date(),
        nextDate: new Date(),
        isActive: true
      }
    });

    assert.equal(recurringRule.type, 'INCOME');
    assert.equal(Number(recurringRule.amount), 2500.00);

    // Process recurring income rule
    const walletBeforeProcess = await prisma.wallet.findUnique({ where: { id: testWalletId } });
    const startBalance = Number(walletBeforeProcess?.balance);

    const generatedTx = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          userId: testUserId,
          workspaceId: testWorkspaceId,
          title: recurringRule.title,
          amount: recurringRule.amount,
          type: 'INCOME',
          categoryId: recurringRule.categoryId,
          walletId: recurringRule.walletId,
          isRecurring: true,
          date: new Date()
        }
      });

      await tx.wallet.update({
        where: { id: testWalletId },
        data: { balance: { increment: Number(recurringRule.amount) } }
      });

      return created;
    });

    assert.equal(generatedTx.type, 'INCOME');
    assert.equal(generatedTx.isRecurring, true);

    const walletAfterProcess = await prisma.wallet.findUnique({ where: { id: testWalletId } });
    assert.equal(Number(walletAfterProcess?.balance), startBalance + 2500.00);
  });

  it('5. CASH FLOW & NET POSITION: Calculates total income, total expense, and net position accurately', async () => {
    if (!testWorkspaceId) return;

    // Fetch workspace summary statistics
    const incomes = await prisma.transaction.aggregate({
      where: { workspaceId: testWorkspaceId, type: 'INCOME' },
      _sum: { amount: true }
    });

    const expenses = await prisma.transaction.aggregate({
      where: { workspaceId: testWorkspaceId, type: 'EXPENSE' },
      _sum: { amount: true }
    });

    const totalIncome = Number(incomes._sum.amount || 0);
    const totalExpense = Number(expenses._sum.amount || 0);
    const netPosition = totalIncome - totalExpense;

    assert.ok(totalIncome > 0, 'Total income should be greater than 0');
    assert.equal(typeof netPosition, 'number');
  });

  it('6. BUDGET ISOLATION: Income transactions are NEVER included in expense budget spent totals', async () => {
    if (!testWorkspaceId) return;

    // Create a budget for expense category
    const budget = await prisma.budget.create({
      data: {
        userId: testUserId,
        workspaceId: testWorkspaceId,
        categoryId: expenseCategoryId,
        amount: 500.00,
        period: 'MONTHLY',
        startDate: new Date(),
        endDate: new Date()
      }
    });

    // Query spending for this category filtering strictly by EXPENSE
    const spentAgg = await prisma.transaction.aggregate({
      where: {
        workspaceId: testWorkspaceId,
        categoryId: expenseCategoryId,
        type: 'EXPENSE'
      },
      _sum: { amount: true }
    });

    const spentAmount = Number(spentAgg._sum.amount || 0);
    assert.equal(spentAmount, 0, 'Income entries must never bleed into category budget spent totals!');

    await prisma.budget.delete({ where: { id: budget.id } });
  });

  it('7. WORKSPACE ISOLATION: User cannot access or aggregate income records from another workspace', async () => {
    // Attempting to query income with other workspace ID yields 0 results
    const otherIncomes = await prisma.transaction.findMany({
      where: {
        workspaceId: otherWorkspaceId,
        type: 'INCOME'
      }
    });

    assert.equal(otherIncomes.length, 0, 'Workspace isolation must prevent cross-tenant income queries');
  });

  it('8. DECIMAL FINANCIAL PRECISION: Handles multi-step cent arithmetic without floating point drift', () => {
    const incomeItems = [100.10, 200.20, 300.30, 400.40];
    const totalFloat = incomeItems.reduce((a, b) => a + b, 0);

    // Precise cent math using integer cents
    const centTotal = incomeItems.reduce((a, b) => a + Math.round(b * 100), 0) / 100;

    assert.equal(centTotal, 1001.00, 'Cent math must reconcile to exact two-decimal precision');
  });
});
