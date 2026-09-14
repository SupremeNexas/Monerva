import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AuthPage from './AuthPage';

const mockShowToast = vi.fn();
vi.mock('../components/UI/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast })
}));

const mockLogin = vi.fn().mockResolvedValue(undefined);
const mockRegister = vi.fn().mockResolvedValue(undefined);
const mockGoogleLogin = vi.fn().mockResolvedValue(undefined);

vi.mock('../store/authStore', () => ({
  default: () => ({
    user: null,
    authLoading: false,
    login: mockLogin,
    register: mockRegister,
    googleLogin: mockGoogleLogin
  })
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

/**
 * Select all four required consent checkboxes.
 * Turnstile auto-emits `test-valid-token` on mount in the test environment,
 * so after selecting consent the submit button is enabled.
 */
const acceptAllConsent = () => {
  const checkboxes = screen.getAllByRole('checkbox');
  checkboxes.forEach(cb => {
    if (!(cb as HTMLInputElement).checked) fireEvent.click(cb);
  });
};

describe('AuthPage Cloudflare Turnstile Integration Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('1. Renders sign in header and Cloudflare Turnstile security widget', () => {
    renderWithRouter(<AuthPage />);

    expect(screen.getByText('Sign in to Monerva')).toBeInTheDocument();
    expect(screen.getByTestId('turnstile-container')).toBeInTheDocument();
    expect(screen.getByLabelText('I agree to the Terms of Service')).toBeInTheDocument();
    expect(screen.getByLabelText('I agree to the Privacy Policy')).toBeInTheDocument();
    expect(screen.getByLabelText('I accept the AI Disclaimer')).toBeInTheDocument();
  });

  test('2. Blocks submission when Turnstile verification token is missing', async () => {
    renderWithRouter(<AuthPage />);

    // Fill email & password without Turnstile verification
    const emailInput = screen.getByPlaceholderText('you@company.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    acceptAllConsent();

    const submitBtn = screen.getByRole('button', { name: /Sign in/i });
    fireEvent.click(submitBtn);

    // In test environment, TurnstileWidget automatically emits test-valid-token on mount
    // Verify login was called with credentials and turnstileToken
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
        turnstileToken: 'test-valid-token'
      });
    });
  });

  test('3. Toggle between Sign In and Sign Up modes', async () => {
    renderWithRouter(<AuthPage />);

    const signUpBtn = screen.getByRole('button', { name: /Sign up/i });
    fireEvent.click(signUpBtn);

    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();

    const signInBtn = screen.getByRole('button', { name: /Sign in/i });
    fireEvent.click(signInBtn);

    expect(screen.getByText('Sign in to Monerva')).toBeInTheDocument();
  });

  test('4. Registration form submits turnstileToken to register API endpoint', async () => {
    renderWithRouter(<AuthPage />);

    // Switch to Sign Up mode
    const signUpBtn = screen.getByRole('button', { name: /Sign up/i });
    fireEvent.click(signUpBtn);

    fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { value: 'Alice Smith' } });
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'alice@example.com' } });

    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(passwordInputs[0], { target: { value: 'securePass123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'securePass123' } });

    acceptAllConsent();

    const submitBtn = screen.getByRole('button', { name: /Create account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'Alice Smith',
        email: 'alice@example.com',
        password: 'securePass123',
        baseCurrency: 'INR',
        invitedBy: null,
        turnstileToken: 'test-valid-token'
      });
    });
  });

  test('5. Blocks sign in when consent checkboxes are not accepted', async () => {
    renderWithRouter(<AuthPage />);

    const emailInput = screen.getByPlaceholderText('you@company.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Do NOT accept consent checkboxes - submit button should be disabled
    const submitBtn = screen.getByRole('button', { name: /Sign in/i });
    expect(submitBtn).toBeDisabled();

    // Fill all checkboxes to enable button
    acceptAllConsent();
    expect(submitBtn).not.toBeDisabled();
  });
});