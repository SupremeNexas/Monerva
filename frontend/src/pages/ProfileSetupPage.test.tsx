import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import ProfileSetupPage from './ProfileSetupPage';

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    form: React.forwardRef(({ children, ...props }: any, ref: any) => <form ref={ref} {...props}>{children}</form>),
    button: React.forwardRef(({ children, ...props }: any, ref: any) => <button ref={ref} {...props}>{children}</button>),
    span: React.forwardRef(({ children, ...props }: any, ref: any) => <span ref={ref} {...props}>{children}</span>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockUpdateProfile = vi.fn();
const mockShowToast = vi.fn();
const mockUser = {
  id: 'google-user-id',
  name: 'Google User',
  email: 'google@gmail.com',
  avatar: 'https://lh3.googleusercontent.com/pic',
  authProvider: 'google',
  baseCurrency: 'USD',
  onboardingComplete: false
};

vi.mock('../store/authStore', () => ({
  default: () => ({
    user: mockUser,
    updateProfile: mockUpdateProfile
  })
}));

vi.mock('../components/UI/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast })
}));

vi.mock('../components/UI/Carousel', () => ({
  default: ({ items }: any) => (
    <div data-testid="mock-carousel">
      {items.map((item: any) => (
        <div key={item.id}>
          <span>{item?.title}</span>
        </div>
      ))}
    </div>
  )
}));

describe('ProfileSetupPage Flow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Pre-fills Google profile details where available (name, email, avatar)', async () => {
    render(<ProfileSetupPage />);

    // Step 1 to Step 2
    fireEvent.click(screen.getByRole('button', { name: /Start Setup/i }));

    // Name input should pre-fill from user.name
    const nameInput = screen.getByPlaceholderText('e.g. Supriyo Sen') as HTMLInputElement;
    expect(nameInput.value).toBe('Google User');

    // Display name should pre-fill from user.displayName or fallback to name
    const displayNameInput = screen.getByPlaceholderText('e.g. Supriyo') as HTMLInputElement;
    expect(displayNameInput.value).toBe('Google User');

    // Avatar url input should pre-fill from user.avatar
    const avatarInput = screen.getByPlaceholderText('https://example.com/avatar.jpg') as HTMLInputElement;
    expect(avatarInput.value).toBe('https://lh3.googleusercontent.com/pic');
  });

  test('Validates required fields in Step 2 before allowing transition to Step 3', async () => {
    render(<ProfileSetupPage />);

    // Step 1 to Step 2
    fireEvent.click(screen.getByRole('button', { name: /Start Setup/i }));

    const nameInput = screen.getByPlaceholderText('e.g. Supriyo Sen') as HTMLInputElement;
    const displayNameInput = screen.getByPlaceholderText('e.g. Supriyo') as HTMLInputElement;

    // Clear name inputs
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.change(displayNameInput, { target: { value: '' } });

    // Submit step 2 form
    const nextButton = screen.getByRole('button', { name: /Configure Workspace/i });
    fireEvent.click(nextButton);

    // Should block and show warning toast
    expect(mockShowToast).toHaveBeenCalledWith('Full name is required.', 'error');
    expect(screen.queryByText(/Financial goals/i)).not.toBeInTheDocument();
  });

  test('Permits transition to Step 3 when required details are complete', async () => {
    render(<ProfileSetupPage />);

    // Step 1 to Step 2
    fireEvent.click(screen.getByRole('button', { name: /Start Setup/i }));

    // Transition to step 3
    const nextButton = screen.getByRole('button', { name: /Configure Workspace/i });
    fireEvent.click(nextButton);

    // Step 3 content: "baseCurrency", "Configure financial goals"
    expect(screen.getByText(/Configure financial goals/i)).toBeInTheDocument();
  });

  test('Saves onboarding goals details optionally and triggers redirect to dashboard', async () => {
    render(<ProfileSetupPage />);

    // Step 1 to Step 2
    fireEvent.click(screen.getByRole('button', { name: /Start Setup/i }));

    // Step 2 to Step 3
    fireEvent.click(screen.getByRole('button', { name: /Configure Workspace/i }));

    // Step 3: enter optional details
    const selectElements = screen.getAllByRole('combobox');
    const currencySelect = selectElements[0] as HTMLSelectElement;
    fireEvent.change(currencySelect, { target: { value: 'INR' } });

    const finishButton = screen.getByRole('button', { name: /Finish Setup/i });
    fireEvent.click(finishButton);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        name: 'Google User',
        displayName: 'Google User',
        avatar: 'https://lh3.googleusercontent.com/pic',
        baseCurrency: 'INR',
        country: 'US',
        timezone: expect.any(String),
        monthlyIncome: 'MEDIUM',
        preferredGoal: 'TRACKING',
        shortTermGoal: null,
        longTermGoal: null,
        onboardingComplete: true
      });
      expect(mockShowToast).toHaveBeenCalledWith('Profile completed successfully! Welcome to Monerva.', 'success');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});
