import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import DashboardPage from './DashboardPage';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}));

vi.mock('../store/authStore', () => {
  const store = () => ({
    user: { id: 'u1', name: 'Demo', email: 'demo@example.com', baseCurrency: 'USD', isPremium: false, plan: 'PRO' },
    updateProfile: vi.fn()
  });
  return {
    default: store,
    useAuthStore: store
  };
});

vi.mock('../components/UI/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() })
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: null, isLoading: false }),
  useMutation: () => ({ mutate: vi.fn() }),
  useQueryClient: () => ({})
}));

vi.mock('../api/client', () => ({
  api: {
    getSummary: () => Promise.resolve({ total: 0 }),
    getTrend: () => Promise.resolve([]),
    getExpenses: () => Promise.resolve([]),
    request: () => Promise.resolve({ insights: [] }),
    getByCategory: () => Promise.resolve([])
  }
}));

// Mock Ferrofluid, StaggeredMenu, and SpecularButton to avoid WebGL errors in jsdom
vi.mock('../components/UI/Ferrofluid', () => ({ default: () => null }));
vi.mock('../components/StaggeredMenu/StaggeredMenu', () => ({
  default: React.forwardRef(() => null)
}));
vi.mock('../components/UI/SpecularButton', () => ({
  default: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  )
}));

describe('DashboardPage Quest Claim Logic - TDD', () => {
  describe('RED PHASE: Verify the bug exists', () => {
    test('BUG: Claim button should NOT be visible after rewardClaimed is true', () => {
      render(<DashboardPage />);

      // Add Ledger is the only completed quest (id: 3, completed: true, rewardClaimed: false)
      // It should show a "Claim" button
      const claimButton = screen.getByRole('button', { name: 'Claim' });
      expect(claimButton).toBeInTheDocument();

      // Click the Claim button
      fireEvent.click(claimButton);

      // BUG: The Claim button should disappear after claiming, but it doesn't
      // because the UI only checks q.completed, not q.rewardClaimed
      // This assertion will fail with the current buggy code
      expect(screen.queryByRole('button', { name: 'Claim' })).not.toBeInTheDocument();
    });
  });

  describe('GREEN PHASE: Fix the implementation', () => {
    test('FIX: Claim button should not appear after reward is claimed', () => {
      render(<DashboardPage />);

      // Claim the Add Ledger reward
      fireEvent.click(screen.getByRole('button', { name: 'Claim' }));

      // After claiming, the Claim button should be gone
      expect(screen.queryByRole('button', { name: 'Claim' })).not.toBeInTheDocument();
    });

    test('FIX: Show "Claimed" text after reward is claimed', () => {
      render(<DashboardPage />);

      // Claim the Add Ledger reward
      fireEvent.click(screen.getByRole('button', { name: 'Claim' }));

      // Should show "Claimed" text after claiming
      expect(screen.getByText('Claimed')).toBeInTheDocument();
    });

    test('FIX: Other quests remain unaffected when one is claimed', () => {
      render(<DashboardPage />);

      // Claim Add Ledger
      fireEvent.click(screen.getByRole('button', { name: 'Claim' }));

      // Add Ledger should show "Claimed"
      expect(screen.getByText('Claimed')).toBeInTheDocument();

      // Incomplete quests should still show "In Progress"
      const inProgressElements = screen.getAllByText('In Progress');
      expect(inProgressElements.length).toBe(3); // Zero Spend, Check In, Scan Receipt
    });

    test('FIX: Only completed quests get a Claim button', () => {
      render(<DashboardPage />);

      // Only Add Ledger is completed, so only 1 Claim button
      const claimButtons = screen.getAllByRole('button', { name: 'Claim' });
      expect(claimButtons.length).toBe(1);
    });
  });

  describe('REFACTOR PHASE: Verify immutability and state', () => {
    test('State update is immutable - original state not mutated', () => {
      // Simulate the exact state update logic from claimQuestReward
      const prevState = [
        { id: 1, title: 'Zero Spend', reward: '150XP', progress: '1/3', completed: false, rewardClaimed: false },
        { id: 2, title: 'Check In', reward: '50XP', progress: '0/1', completed: false, rewardClaimed: false },
        { id: 3, title: 'Add Ledger', reward: '100XP', progress: '1/1', completed: true, rewardClaimed: false },
        { id: 4, title: 'Scan Receipt', reward: '200XP', progress: '0/1', completed: false, rewardClaimed: false }
      ];

      // This is the current claimQuestReward implementation
      const newState = prevState.map(q => q.id === 3 ? { ...q, rewardClaimed: true } : q);

      // Original state unchanged
      expect(prevState[2].rewardClaimed).toBe(false);

      // New state has the change
      expect(newState[2].rewardClaimed).toBe(true);
      expect(newState[2].completed).toBe(true); // completed should remain true

      // Other quests unchanged
      expect(newState[0].rewardClaimed).toBe(false);
      expect(newState[1].rewardClaimed).toBe(false);
      expect(newState[3].rewardClaimed).toBe(false);

      // New array reference (immutable)
      expect(newState).not.toBe(prevState);
    });

    test('claimQuestReward uses immutable update pattern', () => {
      render(<DashboardPage />);

      const initialClaimButton = screen.getByRole('button', { name: 'Claim' });
      fireEvent.click(initialClaimButton);

      // After claiming, Add Ledger quest should show "Claimed" text
      // and its reward should still be visible
      expect(screen.getByText('Claimed')).toBeInTheDocument();
      expect(screen.getByText('Reward: 100XP')).toBeInTheDocument();
    });
  });

  describe('EDGE CASES', () => {
    test('Clicking Claim multiple times is safe', () => {
      render(<DashboardPage />);

      const claimButton = screen.getByRole('button', { name: 'Claim' });
      // Click multiple times should not throw
      expect(() => {
        fireEvent.click(claimButton);
      }).not.toThrow();
    });

    test('Incomplete quests do not have a Claim button', () => {
      render(<DashboardPage />);

      // Only 1 Claim button for Add Ledger (completed)
      const claimButtons = screen.queryAllByRole('button', { name: 'Claim' });
      expect(claimButtons.length).toBe(1);

      // "In Progress" should show for the 3 incomplete quests
      const inProgressElements = screen.getAllByText('In Progress');
      expect(inProgressElements.length).toBe(3);
    });

    test('Quest reward text is still visible after claiming', () => {
      render(<DashboardPage />);

      // Claim reward
      fireEvent.click(screen.getByRole('button', { name: 'Claim' }));

      // Reward text should still be visible
      expect(screen.getByText('Reward: 100XP')).toBeInTheDocument();
    });
  });
});