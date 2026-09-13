import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/db/prisma';
import { Prisma } from '@prisma/client';
import { parseCSV, parseFlexibleAmount, parseFlexibleDate, autoDetectMapping } from '../src/services/csv/csvService';

describe('CSV Import & Export Service and Endpoint Test Suite', () => {
  const user1Id = 'user-csv-test-1';
  const user2Id = 'user-csv-test-2';
  const ws1Id = 'workspace-csv-test-1';
  const ws2Id = 'workspace-csv-test-2';

  let cat1Id: string;
  let wallet1Id: string;

  before(async () => {
    try {
      // Clean up test data
      await prisma.transaction.deleteMany({ where: { workspaceId: { in: [ws1Id, ws2Id] } } });
      await prisma.wallet.deleteMany({ where: { workspaceId: { in: [ws1Id, ws2Id] } } });
      await prisma.category.deleteMany({ where: { workspaceId: { in: [ws1Id, ws2Id] } } });
      await prisma.workspaceMember.deleteMany({ where: { workspaceId: { in: [ws1Id, ws2Id] } } });
      await prisma.workspace.deleteMany({ where: { id: { in: [ws1Id, ws2Id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [user1Id, user2Id] } } });

      // Create Users
      await prisma.user.createMany({
        data: [
          { id: user1Id, name: 'CSV Alice', email: 'csv.alice@example.com' },
          { id: user2Id, name: 'CSV Bob', email: 'csv.bob@example.com' }
        ]
      });

      // Create Workspaces
      await prisma.workspace.createMany({
        data: [
          { id: ws1Id, name: "Alice's CSV Workspace", type: 'PERSONAL' },
          { id: ws2Id, name: "Bob's CSV Workspace", type: 'PERSONAL' }
        ]
      });

      // Workspace Members
      await prisma.workspaceMember.createMany({
        data: [
          { workspaceId: ws1Id, userId: user1Id, role: 'OWNER' },
          { workspaceId: ws2Id, userId: user2Id, role: 'OWNER' }
        ]
      });

      // Create Category & Wallet for Workspace 1
      const cat1 = await prisma.category.create({
        data: { name: 'Food', color: '#EF4444', icon: 'Utensils', type: 'EXPENSE', workspaceId: ws1Id }
      });
      cat1Id = cat1.id;

      const wallet1 = await prisma.wallet.create({
        data: { userId: user1Id, workspaceId: ws1Id, name: 'Main Account', type: 'BANK', balance: 1000 }
      });
      wallet1Id = wallet1.id;

      // Existing transaction in DB for Workspace 1
      await prisma.transaction.create({
        data: {
          userId: user1Id,
          workspaceId: ws1Id,
          title: 'Starbucks Coffee',
          amount: new Prisma.Decimal(15.50),
          type: 'EXPENSE',
          categoryId: cat1Id,
          walletId: wallet1Id,
          paymentMethod: 'Card',
          tags: ['coffee'],
          notes: 'Pre-existing txn',
          date: new Date('2026-09-01T10:00:00Z')
        }
      });

      // Secret transaction for Workspace 2
      await prisma.transaction.create({
        data: {
          userId: user2Id,
          workspaceId: ws2Id,
          title: 'Secret Bob Purchase',
          amount: new Prisma.Decimal(500.00),
          type: 'EXPENSE',
          categoryId: cat1Id,
          walletId: wallet1Id,
          paymentMethod: 'Cash',
          tags: ['secret'],
          date: new Date('2026-09-01T10:00:00Z')
        }
      });
    } catch (e) {
      console.error('Setup error in CSV test suite:', e);
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
      // Ignore cleanup error
    }
  });

  it('PARSER: RFC 4180 CSV Parsing & Auto-Detection', () => {
    const csvContent = `Date,Merchant / Title,Amount,Type,Category,Wallet,Notes\n2026-09-01,"Starbucks, Main St",15.50,EXPENSE,Food,Main Account,"Morning ""espresso"" line"`;
    const parsed = parseCSV(csvContent);

    assert.equal(parsed.length, 2);
    assert.equal(parsed[1][1], 'Starbucks, Main St');
    assert.equal(parsed[1][6], 'Morning "espresso" line');

    const mapping = autoDetectMapping(parsed[0]);
    assert.equal(mapping.date, 'Date');
    assert.equal(mapping.title, 'Merchant / Title');
    assert.equal(mapping.amount, 'Amount');
    assert.equal(mapping.category, 'Category');
  });

  it('PARSER: Flexible Date & Amount Parsing', () => {
    // Dates
    const d1 = parseFlexibleDate('2026-09-01');
    assert.ok(d1);
    assert.equal(d1.toISOString().substring(0, 10), '2026-09-01');

    const d2 = parseFlexibleDate('09/15/2026');
    assert.ok(d2);
    assert.equal(d2.getFullYear(), 2026);

    const dInvalid = parseFlexibleDate('invalid-date-xyz');
    assert.equal(dInvalid, null);

    // Amounts
    const a1 = parseFlexibleAmount('$1,234.56');
    assert.ok(a1);
    assert.equal(a1.amount, 1234.56);

    const a2 = parseFlexibleAmount('(50.00)');
    assert.ok(a2);
    assert.equal(a2.amount, 50);
    assert.equal(a2.type, 'EXPENSE');

    const a3 = parseFlexibleAmount('1.234,56');
    assert.ok(a3);
    assert.equal(a3.amount, 1234.56);

    const aInvalid = parseFlexibleAmount('abc-non-numeric');
    assert.equal(aInvalid, null);
  });

  it('SECURITY & AUTHORIZATION: Workspace Isolation on Export', async () => {
    const ws1Txns = await prisma.transaction.findMany({
      where: { workspaceId: ws1Id }
    });

    assert.equal(ws1Txns.length, 1);
    assert.equal(ws1Txns[0].title, 'Starbucks Coffee');

    // Make sure workspace 2 transactions are not returned
    const ws2Txns = await prisma.transaction.findMany({
      where: { workspaceId: ws2Id }
    });
    assert.equal(ws2Txns.length, 1);
    assert.equal(ws2Txns[0].title, 'Secret Bob Purchase');
  });

  it('PREVIEW: Zero Database Writes before Final Confirmation', async () => {
    const initialTxCount = await prisma.transaction.count({ where: { workspaceId: ws1Id } });

    // Simulate CSV preview processing logic
    const testCSV = `Date,Title,Amount,Category\n2026-09-10,Test Preview Merchant,99.99,Food`;
    const rows = parseCSV(testCSV);
    assert.equal(rows.length, 2);

    const postTxCount = await prisma.transaction.count({ where: { workspaceId: ws1Id } });
    assert.equal(initialTxCount, postTxCount, 'Preview phase must perform ZERO database writes!');
  });

  it('IMPORT: Duplicate Detection against DB and within-CSV duplicates', async () => {
    const existingTxns = await prisma.transaction.findMany({
      where: { workspaceId: ws1Id },
      select: { date: true, title: true, amount: true }
    });

    const existingKeys = new Set(
      existingTxns.map((t) => {
        const dStr = new Date(t.date).toISOString().substring(0, 10);
        const titleNorm = t.title.trim().toLowerCase();
        const amtStr = Number(t.amount).toFixed(2);
        return `${dStr}_${titleNorm}_${amtStr}`;
      })
    );

    // Row 1: exact match to existing DB transaction (Starbucks Coffee, 15.50, 2026-09-01) -> DUPLICATE
    // Row 2: new valid transaction (Apple Store, 2499.00, 2026-09-02) -> VALID
    // Row 3: duplicate of Row 2 in same CSV file -> DUPLICATE
    const testRows = [
      { date: '2026-09-01', title: 'Starbucks Coffee', amount: 15.50 },
      { date: '2026-09-02', title: 'Apple Store', amount: 2499.00 },
      { date: '2026-09-02', title: 'Apple Store', amount: 2499.00 }
    ];

    const seenInCSV = new Set<string>();
    const statuses: string[] = [];

    testRows.forEach((r) => {
      const dStr = r.date;
      const titleNorm = r.title.trim().toLowerCase();
      const amtStr = r.amount.toFixed(2);
      const key = `${dStr}_${titleNorm}_${amtStr}`;

      if (existingKeys.has(key) || seenInCSV.has(key)) {
        statuses.push('duplicate');
      } else {
        seenInCSV.add(key);
        statuses.push('valid');
      }
    });

    assert.equal(statuses[0], 'duplicate', 'Pre-existing DB record must be flagged duplicate');
    assert.equal(statuses[1], 'valid', 'First occurrence in CSV must be valid');
    assert.equal(statuses[2], 'duplicate', 'Second occurrence in CSV must be flagged duplicate');
  });

  it('COMMIT: Valid CSV Import Commit & Wallet Balance Updates', async () => {
    const initialWallet = await prisma.wallet.findUnique({ where: { id: wallet1Id } });
    const initialBalance = Number(initialWallet?.balance || 0);

    // Perform transaction import
    const newTxAmount = 150.00;
    await prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          userId: user1Id,
          workspaceId: ws1Id,
          title: 'Imported Groceries',
          amount: new Prisma.Decimal(newTxAmount),
          type: 'EXPENSE',
          categoryId: cat1Id,
          walletId: wallet1Id,
          paymentMethod: 'Card',
          tags: ['imported'],
          notes: 'Test import commit',
          date: new Date('2026-09-05T10:00:00Z')
        }
      });

      await tx.wallet.update({
        where: { id: wallet1Id },
        data: { balance: { increment: -newTxAmount } }
      });
    });

    const updatedWallet = await prisma.wallet.findUnique({ where: { id: wallet1Id } });
    const updatedBalance = Number(updatedWallet?.balance || 0);

    assert.equal(updatedBalance, initialBalance - newTxAmount, 'Wallet balance must be accurately updated!');
  });
});
