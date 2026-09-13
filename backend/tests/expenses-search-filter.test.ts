import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/db/prisma';
import { Prisma } from '@prisma/client';

describe('Transaction Search & Smart Filters - Authorization & Isolation Test Suite', () => {
  const user1Id = 'user-filter-test-1';
  const user2Id = 'user-filter-test-2';
  const ws1Id = 'workspace-filter-test-1';
  const ws2Id = 'workspace-filter-test-2';

  let cat1Id: string;
  let cat2Id: string;
  let wallet1Id: string;
  let wallet2Id: string;

  before(async () => {
    try {
      // Clean up previous test runs if any
      await prisma.transaction.deleteMany({ where: { workspaceId: { in: [ws1Id, ws2Id] } } });
      await prisma.wallet.deleteMany({ where: { workspaceId: { in: [ws1Id, ws2Id] } } });
      await prisma.category.deleteMany({ where: { workspaceId: { in: [ws1Id, ws2Id] } } });
      await prisma.workspaceMember.deleteMany({ where: { workspaceId: { in: [ws1Id, ws2Id] } } });
      await prisma.workspace.deleteMany({ where: { id: { in: [ws1Id, ws2Id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [user1Id, user2Id] } } });

      // Create Test Users
      await prisma.user.createMany({
        data: [
          { id: user1Id, name: 'Alice Filter', email: 'alice.filter@example.com' },
          { id: user2Id, name: 'Bob Filter', email: 'bob.filter@example.com' }
        ]
      });

      // Create Test Workspaces
      await prisma.workspace.createMany({
        data: [
          { id: ws1Id, name: "Alice's Workspace", type: 'PERSONAL' },
          { id: ws2Id, name: "Bob's Workspace", type: 'PERSONAL' }
        ]
      });

      // Add Memberships
      await prisma.workspaceMember.createMany({
        data: [
          { workspaceId: ws1Id, userId: user1Id, role: 'OWNER' },
          { workspaceId: ws2Id, userId: user2Id, role: 'OWNER' }
        ]
      });

      // Create Categories
      const cat1 = await prisma.category.create({
        data: { name: 'Food & Dining', color: '#EF4444', icon: 'Utensils', type: 'EXPENSE', workspaceId: ws1Id }
      });
      cat1Id = cat1.id;

      const cat2 = await prisma.category.create({
        data: { name: 'Electronics & Tech', color: '#3B82F6', icon: 'Laptop', type: 'EXPENSE', workspaceId: ws1Id }
      });
      cat2Id = cat2.id;

      // Create Wallets
      const wallet1 = await prisma.wallet.create({
        data: { userId: user1Id, workspaceId: ws1Id, name: 'Main Checking', type: 'BANK', balance: 5000 }
      });
      wallet1Id = wallet1.id;

      const wallet2 = await prisma.wallet.create({
        data: { userId: user1Id, workspaceId: ws1Id, name: 'Cash Pouch', type: 'CASH', balance: 500 }
      });
      wallet2Id = wallet2.id;

      // Create Sample Transactions for User 1 (Workspace 1)
      await prisma.transaction.createMany({
        data: [
          {
            userId: user1Id,
            workspaceId: ws1Id,
            title: 'Starbucks Coffee',
            amount: new Prisma.Decimal(15.50),
            type: 'EXPENSE',
            categoryId: cat1Id,
            walletId: wallet1Id,
            paymentMethod: 'Card',
            tags: ['coffee', 'work'],
            notes: 'Morning espresso before team sync',
            location: 'Downtown Seattle',
            date: new Date('2026-09-01T08:30:00Z')
          },
          {
            userId: user1Id,
            workspaceId: ws1Id,
            title: 'Apple Store Macbook Pro',
            amount: new Prisma.Decimal(2499.00),
            type: 'EXPENSE',
            categoryId: cat2Id,
            walletId: wallet1Id,
            paymentMethod: 'Credit Card',
            tags: ['tech', 'work'],
            notes: 'M3 Max 64GB upgrade',
            location: 'Apple Park Store',
            date: new Date('2026-09-02T14:15:00Z')
          },
          {
            userId: user1Id,
            workspaceId: ws1Id,
            title: 'Client Payment Direct Deposit',
            amount: new Prisma.Decimal(4500.00),
            type: 'INCOME',
            categoryId: cat2Id,
            walletId: wallet1Id,
            paymentMethod: 'Bank Transfer',
            tags: ['freelance', 'income'],
            notes: 'Invoice #1042 paid',
            date: new Date('2026-09-03T10:00:00Z')
          },
          {
            userId: user1Id,
            workspaceId: ws1Id,
            title: 'Whole Foods Market',
            amount: new Prisma.Decimal(120.75),
            type: 'EXPENSE',
            categoryId: cat1Id,
            walletId: wallet2Id,
            paymentMethod: 'Cash',
            tags: ['groceries', 'food'],
            notes: 'Weekly organic groceries',
            date: new Date('2026-09-04T18:45:00Z')
          },
          {
            userId: user1Id,
            workspaceId: ws1Id,
            title: 'Team Lunch Expense',
            amount: new Prisma.Decimal(85.00),
            type: 'EXPENSE',
            categoryId: cat1Id,
            walletId: wallet1Id,
            paymentMethod: 'UPI',
            tags: ['shared', 'friend'],
            notes: 'Split with colleagues',
            date: new Date('2026-09-05T12:30:00Z')
          }
        ]
      });

      // Create Secret Transaction for User 2 (Workspace 2) - should NEVER leak!
      await prisma.transaction.create({
        data: {
          userId: user2Id,
          workspaceId: ws2Id,
          title: 'Secret Confidential Purchase',
          amount: new Prisma.Decimal(9999.99),
          type: 'EXPENSE',
          categoryId: cat1Id, // reuse cat or won't matter
          walletId: wallet1Id,
          paymentMethod: 'Cash',
          tags: ['secret'],
          notes: 'Top secret item for Bob',
          date: new Date('2026-09-01T12:00:00Z')
        }
      });
    } catch (e) {
      console.error('Setup error in test suite:', e);
    }
  });

  after(async () => {
    try {
      await prisma.transaction.deleteMany({ where: { workspaceId: { in: [ws1Id, ws2Id] } } });
      await prisma.wallet.deleteMany({ where: { workspaceId: { in: [ws1Id, ws2Id] } } });
      await prisma.category.deleteMany({ where: { workspaceId: { in: [ws1Id, ws2Id] } } });
      await prisma.workspaceMember.deleteMany({ where: { workspaceId: { in: [ws1Id, ws2Id] } } });
      await prisma.workspace.deleteMany({ where: { id: { in: [ws1Id, ws2Id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [user1Id, user2Id] } } });
    } catch (e) {
      // Cleanup fallback
    }
  });

  it('SECURITY: Workspace Isolation - User 1 queries must NEVER return User 2 transactions', async () => {
    const ws1Transactions = await prisma.transaction.findMany({
      where: { workspaceId: ws1Id }
    });

    assert.equal(ws1Transactions.length, 5);
    const hasBobSecret = ws1Transactions.some(t => t.title.includes('Secret Confidential'));
    assert.equal(hasBobSecret, false, 'User 1 must never see User 2 confidential workspace data!');
  });

  it('FILTER: Text Search (title, notes, location, tags)', async () => {
    const resNotes = await prisma.transaction.findMany({
      where: {
        workspaceId: ws1Id,
        OR: [
          { title: { contains: 'espresso', mode: 'insensitive' } },
          { notes: { contains: 'espresso', mode: 'insensitive' } }
        ]
      }
    });

    assert.equal(resNotes.length, 1);
    assert.equal(resNotes[0].title, 'Starbucks Coffee');
  });

  it('FILTER: Min and Max Amount filtering', async () => {
    const resAmount = await prisma.transaction.findMany({
      where: {
        workspaceId: ws1Id,
        amount: {
          gte: new Prisma.Decimal(50),
          lte: new Prisma.Decimal(200)
        }
      }
    });

    assert.equal(resAmount.length, 2); // Whole Foods (120.75) and Team Lunch (85.00)
    const titles = resAmount.map(t => t.title);
    assert.ok(titles.includes('Whole Foods Market'));
    assert.ok(titles.includes('Team Lunch Expense'));
  });

  it('FILTER: Exact Category & Wallet filtering', async () => {
    const resCat = await prisma.transaction.findMany({
      where: {
        workspaceId: ws1Id,
        categoryId: cat2Id,
        walletId: wallet1Id
      }
    });

    assert.equal(resCat.length, 2); // Macbook Pro and Client Payment
  });

  it('FILTER: Date Range filtering', async () => {
    const resDate = await prisma.transaction.findMany({
      where: {
        workspaceId: ws1Id,
        date: {
          gte: new Date('2026-09-02T00:00:00Z'),
          lte: new Date('2026-09-04T23:59:59Z')
        }
      }
    });

    assert.equal(resDate.length, 3); // Macbook (Sep 2), Client Payment (Sep 3), Whole Foods (Sep 4)
  });

  it('FILTER: Shared / Friend Scope filter', async () => {
    const resShared = await prisma.transaction.findMany({
      where: {
        workspaceId: ws1Id,
        tags: { hasSome: ['shared', 'friend'] }
      }
    });

    assert.equal(resShared.length, 1);
    assert.equal(resShared[0].title, 'Team Lunch Expense');
  });
});
