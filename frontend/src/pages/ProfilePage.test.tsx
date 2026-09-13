import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ProfilePage from './ProfilePage';

// Mock dependencies
const mockShowToast = vi.fn();
vi.mock('../components/UI/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast })
}));

const mockUpdateProfile = vi.fn();
const mockDeleteAccount = vi.fn();
const mockUser = {
  id: 'completed-user-id',
  name: 'Completed User',
  displayName: 'Completed Display Name',
  email: 'completed@gmail.com',
  avatar: 'https://avatar-url.com/me.png',
  authProvider: 'email',
  baseCurrency: 'INR',
  country: 'IN',
  timezone: 'Asia/Kolkata',
  monthlyIncome: 'HIGH',
  preferredGoal: 'INVESTING',
  shortTermGoal: 'Save 10k',
  longTermGoal: 'Retire Early',
  onboardingComplete: true
};

vi.mock('../store/authStore', () => ({
  default: () => ({
    user: mockUser,
    updateProfile: mockUpdateProfile,
    deleteAccount: mockDeleteAccount
  })
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('ProfilePage Settings Editing Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Loads and displays all user database fields correctly', () => {
    renderWithRouter(<ProfilePage />);

    expect(screen.getByText('Personal Profile')).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue('Completed User') as HTMLInputElement;
    expect(nameInput).toBeInTheDocument();

    const displayNameInput = screen.getByDisplayValue('Completed Display Name') as HTMLInputElement;
    expect(displayNameInput).toBeInTheDocument();

    const avatarInput = screen.getByPlaceholderText('https://example.com/pic.jpg') as HTMLInputElement;
    expect(avatarInput.value).toBe('https://avatar-url.com/me.png');

    const selectElements = screen.getAllByRole('combobox');
    const currencySelect = selectElements[0] as HTMLSelectElement;
    expect(currencySelect.value).toBe('INR');

    const countrySelect = selectElements[1] as HTMLSelectElement;
    expect(countrySelect.value).toBe('IN');

    const incomeSelect = selectElements[2] as HTMLSelectElement;
    expect(incomeSelect.value).toBe('HIGH');

    const goalSelect = selectElements[3] as HTMLSelectElement;
    expect(goalSelect.value).toBe('INVESTING');

    const shortGoalInput = screen.getByDisplayValue('Save 10k') as HTMLInputElement;
    expect(shortGoalInput).toBeInTheDocument();

    const longGoalInput = screen.getByDisplayValue('Retire Early') as HTMLInputElement;
    expect(longGoalInput).toBeInTheDocument();
  });

  test('Validates input rules and blocks updates with clean warnings', async () => {
    renderWithRouter(<ProfilePage />);

    const nameInput = screen.getByDisplayValue('Completed User') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /Save Profile/i });
    fireEvent.click(submitBtn);

    expect(mockShowToast).toHaveBeenCalledWith('Full name is required.', 'error');
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  test('Submits structural modifications correctly to authStore API endpoints', async () => {
    renderWithRouter(<ProfilePage />);

    const displayNameInput = screen.getByDisplayValue('Completed Display Name') as HTMLInputElement;
    fireEvent.change(displayNameInput, { target: { value: 'New Alias' } });

    const submitBtn = screen.getByRole('button', { name: /Save Profile/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        name: 'Completed User',
        displayName: 'New Alias',
        avatar: 'https://avatar-url.com/me.png',
        baseCurrency: 'INR',
        country: 'IN',
        timezone: 'Asia/Kolkata',
        monthlyIncome: 'HIGH',
        preferredGoal: 'INVESTING',
        shortTermGoal: 'Save 10k',
        longTermGoal: 'Retire Early'
      });
      expect(mockShowToast).toHaveBeenCalledWith('Profile updated successfully!', 'success');
    });
  });
});
