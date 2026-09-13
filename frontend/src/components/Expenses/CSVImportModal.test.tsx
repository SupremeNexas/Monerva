import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import CSVImportModal from './CSVImportModal';

const mockPreviewResponse = {
  totalRows: 2,
  validRowsCount: 1,
  duplicateRowsCount: 1,
  invalidRowsCount: 0,
  detectedHeaders: ['Date', 'Merchant / Title', 'Amount', 'Type', 'Category', 'Wallet'],
  columnMapping: {
    date: 'Date',
    title: 'Merchant / Title',
    amount: 'Amount',
    type: 'Type',
    category: 'Category',
    wallet: 'Wallet'
  },
  categories: [{ id: 'cat-1', name: 'Food' }],
  wallets: [{ id: 'wall-1', name: 'Main Account' }],
  rows: [
    {
      rowIndex: 1,
      status: 'valid',
      errors: [],
      warnings: [],
      data: {
        date: '2026-09-01',
        title: 'Starbucks Coffee',
        amount: 15.50,
        type: 'EXPENSE',
        categoryName: 'Food',
        walletName: 'Main Account',
        paymentMethod: 'Card',
        tags: ['coffee'],
        notes: 'Morning coffee'
      },
      duplicateDetails: null
    },
    {
      rowIndex: 2,
      status: 'duplicate',
      errors: [],
      warnings: [],
      data: {
        date: '2026-09-01',
        title: 'Starbucks Coffee',
        amount: 15.50,
        type: 'EXPENSE',
        categoryName: 'Food',
        walletName: 'Main Account',
        paymentMethod: 'Card',
        tags: ['coffee'],
        notes: 'Morning coffee'
      },
      duplicateDetails: 'Matches existing database transaction'
    }
  ]
};

// Mock Dependencies
vi.mock('../UI/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('../../api/client', () => ({
  api: {
    previewCSVImport: vi.fn().mockImplementation(() => Promise.resolve(mockPreviewResponse)),
    commitCSVImport: vi.fn().mockImplementation(() => Promise.resolve({
      success: true,
      summary: {
        total: 2,
        imported: 1,
        skipped: 1,
        duplicates: 1,
        invalid: 0
      }
    }))
  }
}));

describe('CSVImportModal Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Renders Step 1 upload dropzone when open', () => {
    render(<CSVImportModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText(/Import Transactions from CSV/i)).toBeInTheDocument();
    expect(screen.getByText(/Drag & drop your CSV file here/i)).toBeInTheDocument();
    expect(screen.getByText(/Download Sample CSV/i)).toBeInTheDocument();
  });

  test('Upload file triggers preview API and displays Step 2 mapping & table', async () => {
    const { container } = render(<CSVImportModal isOpen={true} onClose={vi.fn()} />);

    const file = new File(
      ['Date,Merchant / Title,Amount\n2026-09-01,Starbucks,15.50'],
      'test_transactions.csv',
      { type: 'text/csv' }
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    // Simulate selecting file
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Map CSV Columns to Finova Fields/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText('Starbucks Coffee').length).toBeGreaterThan(0);
    expect(screen.getByText(/Skip duplicate transactions/i)).toBeInTheDocument();
  });

  test('Navigates through confirmation step to final results step', async () => {
    const { container } = render(<CSVImportModal isOpen={true} onClose={vi.fn()} />);

    const file = new File(
      ['Date,Merchant / Title,Amount\n2026-09-01,Starbucks,15.50'],
      'test_transactions.csv',
      { type: 'text/csv' }
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Continue to Confirmation/i)).toBeInTheDocument();
    });

    // Click Continue to Confirmation
    fireEvent.click(screen.getByText(/Continue to Confirmation/i));

    expect(screen.getByText(/Confirm Database Write/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirm & Import/i)).toBeInTheDocument();

    // Click Confirm & Import
    fireEvent.click(screen.getByText(/Confirm & Import/i));

    await waitFor(() => {
      expect(screen.getByText(/CSV Import Completed!/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Done')).toBeInTheDocument();
  });
});
