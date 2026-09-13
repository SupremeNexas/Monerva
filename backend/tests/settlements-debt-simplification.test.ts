import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSplits, calculateNetPositions, simplifyGroupDebts } from '../src/services/splits/splitEngine';

describe('Splitwise Settlement & Debt Simplification Unit Test Suite', () => {

  describe('1. Split Engine Calculations', () => {
    it('Equal Split: 100 divided 3 ways reconciles exact cent total (33.34, 33.33, 33.33)', () => {
      const participants = ['user-a', 'user-b', 'user-c'];
      const splits = calculateSplits(100, 'user-a', participants, 'equal');

      assert.equal(splits.length, 3);
      assert.equal(splits[0].amountOwed, 33.34);
      assert.equal(splits[1].amountOwed, 33.33);
      assert.equal(splits[2].amountOwed, 33.33);

      const total = splits.reduce((sum, s) => sum + Math.round(s.amountOwed * 100), 0) / 100;
      assert.equal(total, 100.00);
    });

    it('Exact Split: Validates exact split totals and throws on mismatch', () => {
      const participants = ['user-a', 'user-b'];
      const validSplits = calculateSplits(50, 'user-a', participants, 'exact', [
        { userId: 'user-a', amount: 30 },
        { userId: 'user-b', amount: 20 },
      ]);
      assert.equal(validSplits[0].amountOwed, 30);
      assert.equal(validSplits[1].amountOwed, 20);

      assert.throws(
        () => calculateSplits(50, 'user-a', participants, 'exact', [
          { userId: 'user-a', amount: 30 },
          { userId: 'user-b', amount: 10 },
        ]),
        /Exact splits sum/
      );
    });

    it('Percentage Split: Distributes percentages (50%, 25%, 25%) and sums to 100%', () => {
      const participants = ['user-a', 'user-b', 'user-c'];
      const splits = calculateSplits(100, 'user-a', participants, 'percentage', [
        { userId: 'user-a', percentage: 50 },
        { userId: 'user-b', percentage: 25 },
        { userId: 'user-c', percentage: 25 },
      ]);

      assert.equal(splits[0].amountOwed, 50.00);
      assert.equal(splits[1].amountOwed, 25.00);
      assert.equal(splits[2].amountOwed, 25.00);

      const total = splits.reduce((sum, s) => sum + s.amountOwed, 0);
      assert.equal(total, 100.00);
    });

    it('Shares Split: Distributes according to share proportions (2 shares vs 1 share)', () => {
      const participants = ['user-a', 'user-b'];
      const splits = calculateSplits(90, 'user-a', participants, 'shares', [
        { userId: 'user-a', shares: 2 },
        { userId: 'user-b', shares: 1 },
      ]);

      assert.equal(splits[0].amountOwed, 60.00);
      assert.equal(splits[1].amountOwed, 30.00);
    });
  });

  describe('2. Net Positions & Debt Simplification Algorithm', () => {
    it('calculateNetPositions: accurately nets expenses and settlements across members', () => {
      const members = [
        { id: 'user-a', name: 'User A' },
        { id: 'user-b', name: 'User B' },
      ];

      const expenses = [
        {
          paidById: 'user-a',
          amount: 100,
          splits: [
            { userId: 'user-a', amountOwed: 50 },
            { userId: 'user-b', amountOwed: 50 },
          ],
        },
      ];

      const settlements = [
        {
          paidById: 'user-b',
          paidToId: 'user-a',
          amount: 20,
        },
      ];

      const netPositions = calculateNetPositions(members, expenses, settlements);
      // User A paid 100 - 50 share = +50 credit. User B settled 20 to User A -> User A net = +30.
      // User B owes 50 - 20 paid = -30 debt.
      assert.equal(netPositions.get('user-a'), 30.00);
      assert.equal(netPositions.get('user-b'), -30.00);
    });

    it('simplifyGroupDebts: optimizes 3-member circular debts into minimum transfers', () => {
      // Scenario:
      // A, B, C
      // Expense 1: A pays 60 for A, B, C (share 20 each) -> B owes A 20, C owes A 20
      // Expense 2: B pays 60 for A, B, C (share 20 each) -> A owes B 20, C owes B 20
      // Net position A = +20, B = +20, C = -40
      // Simplified: C pays A 20, C pays B 20 (2 transfers instead of 4 transactions)
      const members = [
        { id: 'A', name: 'Alice' },
        { id: 'B', name: 'Bob' },
        { id: 'C', name: 'Charlie' },
      ];

      const expenses = [
        {
          paidById: 'A',
          amount: 60,
          splits: [
            { userId: 'A', amountOwed: 20 },
            { userId: 'B', amountOwed: 20 },
            { userId: 'C', amountOwed: 20 },
          ],
        },
        {
          paidById: 'B',
          amount: 60,
          splits: [
            { userId: 'A', amountOwed: 20 },
            { userId: 'B', amountOwed: 20 },
            { userId: 'C', amountOwed: 20 },
          ],
        },
      ];

      const simplified = simplifyGroupDebts(members, expenses, []);
      assert.equal(simplified.length, 2);

      const fromCharlie = simplified.filter(t => t.paidBy === 'C');
      assert.equal(fromCharlie.length, 2);

      const toA = fromCharlie.find(t => t.paidTo === 'A');
      const toB = fromCharlie.find(t => t.paidTo === 'B');

      assert.equal(toA?.amount, 20.00);
      assert.equal(toB?.amount, 20.00);
    });
  });
});
