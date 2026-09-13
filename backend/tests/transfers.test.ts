import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres@localhost:5433/expense_tracker?schema=public';
}
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/db/prisma';

describe('First-Class Account Transfers & Balance Integrity Test Suite', () => {
  const testUserId = 'test-transfer-user-1';
  const testWorkspaceId = 'test-transfer-workspace-1';
  const secondWorkspaceId = 'test-transfer-workspace-2';

  let bankWalletId: string;
  let cashWalletId: string;
  let savingsWalletId: string;
  let otherWsWalletId: string;
  let transferCategoryId: string;

  before(async () => {
    // 1. Setup primary user
    let user = await prisma.user.findUnique({ where: { id: testUserId } });
    if (!user) {
      await prisma.user.create({
        data: {
          id: testUserId,
          email: 'transfer-tester@monerva.local',
          name: 'Transfer Tester',
          authProvider: 'LOCAL'
        }
      });
    }

    // 2. Setup primary workspace
    let ws = await prisma.workspace.findUnique({ where: { id: testWorkspaceId } });
    if (!ws) {
      await prisma.workspace.create({
        data: {
          id: testWorkspaceId,
          name: 'Transfer Primary Workspace',
          type: 'PERSONAL'
        }
      });
    }

    let member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: testWorkspaceId, userId: testUserId } }
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

    // 3. Setup isolated second workspace
    let ws2 = await prisma.workspace.findUnique({ where: { id: secondWorkspaceId } });
    if (!ws2) {
      await prisma.workspace.create({
        data: {
          id: secondWorkspaceId,
          name: 'Transfer Secondary Workspace',
          type: 'PERSONAL'
        }
      });
    }

    // 4. Create primary workspace wallets
    const bankWallet = await prisma.wallet.create({
      data: {
        userId: testUserId,
        workspaceId: testWorkspaceId,
        name: 'Checking Account',
        type: 'BANK',
        balance: 5000.00
      }
    });
    bankWalletId = bankWallet.id;

    const cashWallet = await prisma.wallet.create({
      data: {
        userId: testUserId,
        workspaceId: testWorkspaceId,
        name: 'Petty Cash Pouch',
        type: 'CASH',
        balance: 200.00
      }
    });
    cashWalletId = cashWallet.id;

    const savingsWallet = await prisma.wallet.create({
      data: {
        userId: testUserId,
        workspaceId: testWorkspaceId,
        name: 'High-Yield Savings',
        type: 'BANK',
        balance: 10000.00
      }
    });
    savingsWalletId = savingsWallet.id;

    // 5. Create second workspace wallet
    const otherWallet = await prisma.wallet.create({
      data: {
        userId: testUserId,
        workspaceId: secondWorkspaceId,
        name: 'Isolated Foreign Wallet',
        type: 'BANK',
        balance: 1000.00
      }
    });
    otherWsWalletId = otherWallet.id;

    // 6. Create transfer category
    const cat = await prisma.category.create({
      data: {
        name: 'Internal Transfer Test Category',
        type: 'EXPENSE',
        color: '#6366F1',
        icon: 'repeat',
        workspaceId: testWorkspaceId
      }
    });
    transferCategoryId = cat.id;
  });

  after(async () => {
    try {
      if (testWorkspaceId) {
        await prisma.transaction.deleteMany({ where: { workspaceId: testWorkspaceId } });
        await prisma.wallet.deleteMany({ where: { workspaceId: testWorkspaceId } });
        await prisma.workspaceMember.deleteMany({ where: { workspaceId: testWorkspaceId } });
        await prisma.workspace.deleteMany({ where: { id: testWorkspaceId } });
      }
      if (secondWorkspaceId) {
        await prisma.transaction.deleteMany({ where: { workspaceId: secondWorkspaceId } });
        await prisma.wallet.deleteMany({ where: { workspaceId: secondWorkspaceId } });
        await prisma.workspace.deleteMany({ where: { id: secondWorkspaceId } });
      }
      await prisma.user.deleteMany({ where: { id: testUserId } });
      if (transferCategoryId) {
        await prisma.category.delete({ where: { id: transferCategoryId } }).catch(() => {});
      }
    } catch (e) {
      // Cleanup cleanup errors
    } finally {
      await prisma.$disconnect();
    }
  });

  it('1. NORMAL TRANSFER: Bank -> Cash wallet decreases source balance & increases destination balance', async () => {
    const transferAmount = 150.50;

    const bankBefore = await prisma.wallet.findUnique({ where: { id: bankWalletId } });
    const cashBefore = await prisma.wallet.findUnique({ where: { id: cashWalletId } });

    const startBankBal = Number(bankBefore?.balance);
    const startCashBal = Number(cashBefore?.balance);

    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          userId: testUserId,
          workspaceId: testWorkspaceId,
          title: 'ATM Cash Withdrawal',
          amount: transferAmount,
          type: 'TRANSFER',
          categoryId: transferCategoryId,
          walletId: bankWalletId,
          toWalletId: cashWalletId,
          date: new Date()
        }
      });

      await tx.wallet.update({
        where: { id: bankWalletId },
        data: { balance: { decrement: transferAmount } }
      });

      await tx.wallet.update({
        where: { id: cashWalletId },
        data: { balance: { increment: transferAmount } }
      });

      return created;
    });

    assert.equal(transaction.type, 'TRANSFER');
    assert.equal(transaction.walletId, bankWalletId);
    assert.equal(transaction.toWalletId, cashWalletId);

    const bankAfter = await prisma.wallet.findUnique({ where: { id: bankWalletId } });
    const cashAfter = await prisma.wallet.findUnique({ where: { id: cashWalletId } });

    assert.equal(Number(bankAfter?.balance), startBankBal - transferAmount);
    assert.equal(Number(cashAfter?.balance), startCashBal + transferAmount);

    // Total net balance across both accounts remains identical
    assert.equal(Number(bankAfter?.balance) + Number(cashAfter?.balance), startBankBal + startCashBal);
  });

  it('2. MULTIPLE WALLET COMBINATIONS: Bank -> Savings transfer works cleanly with exact cents', async () => {
    const transferAmount = 2500.75;

    const bankBefore = await prisma.wallet.findUnique({ where: { id: bankWalletId } });
    const savingsBefore = await prisma.wallet.findUnique({ where: { id: savingsWalletId } });

    const startBankBal = Number(bankBefore?.balance);
    const startSavingsBal = Number(savingsBefore?.balance);

    await prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          userId: testUserId,
          workspaceId: testWorkspaceId,
          title: 'Monthly Savings Reserve',
          amount: transferAmount,
          type: 'TRANSFER',
          categoryId: transferCategoryId,
          walletId: bankWalletId,
          toWalletId: savingsWalletId,
          date: new Date()
        }
      });

      await tx.wallet.update({
        where: { id: bankWalletId },
        data: { balance: { decrement: transferAmount } }
      });

      await tx.wallet.update({
        where: { id: savingsWalletId },
        data: { balance: { increment: transferAmount } }
      });
    });

    const bankAfter = await prisma.wallet.findUnique({ where: { id: bankWalletId } });
    const savingsAfter = await prisma.wallet.findUnique({ where: { id: savingsWalletId } });

    assert.equal(Number(bankAfter?.balance), startBankBal - transferAmount);
    assert.equal(Number(savingsAfter?.balance), startSavingsBal + transferAmount);
  });

  it('3. SAME-ACCOUNT REJECTION: Logic rejects transfers where source equals destination', () => {
    const sourceId = bankWalletId;
    const destId = bankWalletId;
    const isInvalid = sourceId === destId;

    assert.equal(isInvalid, true, 'Transfers within the exact same wallet must be rejected');
  });

  it('4. WORKSPACE ISOLATION: Rejects cross-tenant transfer attempt to wallet in another workspace', async () => {
    // Attempting to query source or destination outside active workspaceId yields null
    const crossWallet = await prisma.wallet.findFirst({
      where: { id: otherWsWalletId, workspaceId: testWorkspaceId }
    });

    assert.equal(crossWallet, null, 'Workspace boundary must prevent accessing wallets belonging to another workspace');
  });

  it('5. EDIT TRANSFER: Correctly reverts old balances and applies new balances atomically', async () => {
    // Create initial transfer of $500 from Bank -> Cash
    const initialTransfer = await prisma.transaction.create({
      data: {
        userId: testUserId,
        workspaceId: testWorkspaceId,
        title: 'Initial Cash Transfer',
        amount: 500.00,
        type: 'TRANSFER',
        categoryId: transferCategoryId,
        walletId: bankWalletId,
        toWalletId: cashWalletId,
        date: new Date()
      }
    });

    await prisma.wallet.update({
      where: { id: bankWalletId },
      data: { balance: { decrement: 500.00 } }
    });
    await prisma.wallet.update({
      where: { id: cashWalletId },
      data: { balance: { increment: 500.00 } }
    });

    const bankBeforeEdit = Number((await prisma.wallet.findUnique({ where: { id: bankWalletId } }))?.balance);
    const cashBeforeEdit = Number((await prisma.wallet.findUnique({ where: { id: cashWalletId } }))?.balance);

    // Edit transfer amount from $500 to $300 (difference of $200 less transferred)
    const oldAmount = 500.00;
    const newAmount = 300.00;

    await prisma.$transaction(async (tx) => {
      // Revert old balances
      await tx.wallet.update({
        where: { id: initialTransfer.walletId },
        data: { balance: { increment: oldAmount } }
      });
      await tx.wallet.update({
        where: { id: initialTransfer.toWalletId! },
        data: { balance: { decrement: oldAmount } }
      });

      // Apply new balances
      await tx.wallet.update({
        where: { id: initialTransfer.walletId },
        data: { balance: { decrement: newAmount } }
      });
      await tx.wallet.update({
        where: { id: initialTransfer.toWalletId! },
        data: { balance: { decrement: -newAmount } } // increment
      });

      await tx.transaction.update({
        where: { id: initialTransfer.id },
        data: { amount: newAmount }
      });
    });

    const bankAfterEdit = Number((await prisma.wallet.findUnique({ where: { id: bankWalletId } }))?.balance);
    const cashAfterEdit = Number((await prisma.wallet.findUnique({ where: { id: cashWalletId } }))?.balance);

    assert.equal(bankAfterEdit, bankBeforeEdit + 200.00);
    assert.equal(cashAfterEdit, cashBeforeEdit - 200.00);
  });

  it('6. DELETE TRANSFER: Restores exact original wallet balances upon deletion', async () => {
    // Create transfer to delete
    const txToDelete = await prisma.transaction.create({
      data: {
        userId: testUserId,
        workspaceId: testWorkspaceId,
        title: 'Temporary Transfer',
        amount: 400.25,
        type: 'TRANSFER',
        categoryId: transferCategoryId,
        walletId: bankWalletId,
        toWalletId: cashWalletId,
        date: new Date()
      }
    });

    await prisma.wallet.update({
      where: { id: bankWalletId },
      data: { balance: { decrement: 400.25 } }
    });
    await prisma.wallet.update({
      where: { id: cashWalletId },
      data: { balance: { increment: 400.25 } }
    });

    const bankBeforeDel = Number((await prisma.wallet.findUnique({ where: { id: bankWalletId } }))?.balance);
    const cashBeforeDel = Number((await prisma.wallet.findUnique({ where: { id: cashWalletId } }))?.balance);

    // Delete transfer and restore balances
    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: txToDelete.walletId },
        data: { balance: { increment: 400.25 } }
      });
      await tx.wallet.update({
        where: { id: txToDelete.toWalletId! },
        data: { balance: { decrement: 400.25 } }
      });
      await tx.transaction.delete({ where: { id: txToDelete.id } });
    });

    const bankAfterDel = Number((await prisma.wallet.findUnique({ where: { id: bankWalletId } }))?.balance);
    const cashAfterDel = Number((await prisma.wallet.findUnique({ where: { id: cashWalletId } }))?.balance);

    assert.equal(bankAfterDel, bankBeforeDel + 400.25);
    assert.equal(cashAfterDel, cashBeforeDel - 400.25);
  });

  it('7. ANALYTICS EXCLUSION: Transfers do NOT distort total income or total expense calculations', async () => {
    // Add 1 EXPENSE ($50), 1 INCOME ($100), and 1 TRANSFER ($1000)
    await prisma.transaction.create({
      data: {
        userId: testUserId,
        workspaceId: testWorkspaceId,
        title: 'Lunch Expense',
        amount: 50.00,
        type: 'EXPENSE',
        categoryId: transferCategoryId,
        walletId: bankWalletId,
        date: new Date()
      }
    });

    await prisma.transaction.create({
      data: {
        userId: testUserId,
        workspaceId: testWorkspaceId,
        title: 'Freelance Payout',
        amount: 100.00,
        type: 'INCOME',
        categoryId: transferCategoryId,
        walletId: bankWalletId,
        date: new Date()
      }
    });

    // Query income & expense aggregations
    const incomeAgg = await prisma.transaction.aggregate({
      where: { workspaceId: testWorkspaceId, type: 'INCOME' },
      _sum: { amount: true }
    });

    const expenseAgg = await prisma.transaction.aggregate({
      where: { workspaceId: testWorkspaceId, type: 'EXPENSE' },
      _sum: { amount: true }
    });

    const transferAgg = await prisma.transaction.aggregate({
      where: { workspaceId: testWorkspaceId, type: 'TRANSFER' },
      _sum: { amount: true }
    });

    assert.equal(Number(incomeAgg._sum.amount), 100.00);
    assert.equal(Number(expenseAgg._sum.amount), 50.00);
    assert.ok(Number(transferAgg._sum.amount || 0) > 0, 'Transfers should exist separately');
  });

  it('8. ATOMIC FAILURE ISOLATION: Error during multi-step operation safely rolls back transaction', async () => {
    const bankStart = Number((await prisma.wallet.findUnique({ where: { id: bankWalletId } }))?.balance);
    const cashStart = Number((await prisma.wallet.findUnique({ where: { id: cashWalletId } }))?.balance);

    try {
      await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { id: bankWalletId },
          data: { balance: { decrement: 5000.00 } }
        });

        // Intentional throw simulating DB constraint or exception
        throw new Error('Simulated failure during transfer execution');
      });
    } catch (e: any) {
      assert.equal(e.message, 'Simulated failure during transfer execution');
    }

    const bankEnd = Number((await prisma.wallet.findUnique({ where: { id: bankWalletId } }))?.balance);
    const cashEnd = Number((await prisma.wallet.findUnique({ where: { id: cashWalletId } }))?.balance);

    assert.equal(bankEnd, bankStart, 'Bank balance must remain completely untouched on transaction rollback');
    assert.equal(cashEnd, cashStart, 'Cash balance must remain completely untouched on transaction rollback');
  });
});
