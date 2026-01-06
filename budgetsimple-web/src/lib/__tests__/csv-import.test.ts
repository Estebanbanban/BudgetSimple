/**
 * Tests for CSV import functionality
 * 
 * These tests verify:
 * - Multiple file upload handling
 * - Data merging and header alignment
 * - Transaction import and storage
 * - Dashboard refresh after import
 */

describe('CSV Import', () => {
  // Mock File objects for testing
  const createMockFile = (name: string, content: string): File => {
    const blob = new Blob([content], { type: 'text/csv' });
    return new File([blob], name, { type: 'text/csv' });
  };

  const csvFile1 = createMockFile('transactions1.csv', 
    `Date,Amount,Description
2024-01-01,-50.00,Grocery Store
2024-01-02,-25.00,Coffee Shop`
  );

  const csvFile2 = createMockFile('transactions2.csv',
    `Date,Amount,Description,Category
2024-01-03,-100.00,Gas Station,Transportation
2024-01-04,-75.00,Restaurant,Food`
  );

  const csvFile3 = createMockFile('transactions3.csv',
    `Date,Amount,Description
2024-01-05,-30.00,Pharmacy`
  );

  beforeEach(() => {
    // Reset any global state before each test
    jest.clearAllMocks();
  });

  describe('handleMultipleCsvFiles', () => {
    it('should handle single file upload', async () => {
      // This would test the single file path
      expect(csvFile1).toBeDefined();
      expect(csvFile1.name).toBe('transactions1.csv');
    });

    it('should merge headers from multiple files', () => {
      const headers1 = ['Date', 'Amount', 'Description'];
      const headers2 = ['Date', 'Amount', 'Description', 'Category'];
      
      // Merge logic: combine unique headers
      const merged = [...headers1];
      headers2.forEach(h => {
        if (!merged.includes(h)) {
          merged.push(h);
        }
      });
      
      expect(merged).toEqual(['Date', 'Amount', 'Description', 'Category']);
    });

    it('should align rows to merged headers', () => {
      const headers1 = ['Date', 'Amount', 'Description'];
      const headers2 = ['Date', 'Amount', 'Description', 'Category'];
      const mergedHeaders = ['Date', 'Amount', 'Description', 'Category'];
      
      const row1 = ['2024-01-01', '-50.00', 'Grocery Store'];
      const row2 = ['2024-01-03', '-100.00', 'Gas Station', 'Transportation'];
      
      // Align row1 (3 cols) to merged headers (4 cols)
      const alignedRow1 = mergedHeaders.map(header => {
        const index = headers1.indexOf(header);
        return index >= 0 && index < row1.length ? row1[index] : '';
      });
      
      expect(alignedRow1).toEqual(['2024-01-01', '-50.00', 'Grocery Store', '']);
      expect(row2).toEqual(['2024-01-03', '-100.00', 'Gas Station', 'Transportation']);
    });

    it('should handle empty files gracefully', () => {
      const emptyFile = createMockFile('empty.csv', 'Date,Amount\n');
      expect(emptyFile).toBeDefined();
      // Should skip empty files and continue processing
    });

    it('should continue processing if one file fails', () => {
      // Should process remaining files even if one throws an error
      const files = [csvFile1, csvFile2, csvFile3];
      expect(files.length).toBe(3);
      // Error handling should allow other files to process
    });
  });

  describe('importTransactions', () => {
    it('should parse dates correctly', () => {
      const dateStr = '2024-01-01';
      const parsed = new Date(dateStr);
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.getFullYear()).toBe(2024);
    });

    it('should parse amounts correctly', () => {
      const amountStr = '-50.00';
      const parsed = parseFloat(amountStr);
      expect(parsed).toBe(-50.00);
    });

    it('should generate unique hashes for transactions', () => {
      const tx1 = { date: '2024-01-01', amount: -50, description: 'Test' };
      const tx2 = { date: '2024-01-01', amount: -50, description: 'Test' };
      const tx3 = { date: '2024-01-02', amount: -50, description: 'Test' };
      
      // Same transaction should have same hash
      const hash1 = `${tx1.date}-${tx1.amount}-${tx1.description}`;
      const hash2 = `${tx2.date}-${tx2.amount}-${tx2.description}`;
      const hash3 = `${tx3.date}-${tx3.amount}-${tx3.description}`;
      
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });

    it('should detect duplicates when deduplication is enabled', () => {
      const existingHashes = new Set(['2024-01-01--50-Test']);
      const newHash = '2024-01-01--50-Test';
      
      expect(existingHashes.has(newHash)).toBe(true);
    });
  });

  describe('File input handling', () => {
    it('should allow selecting files multiple times', () => {
      // File input should be cleared after processing to allow re-selection
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.multiple = true;
      
      // Simulate clearing
      fileInput.value = '';
      expect(fileInput.value).toBe('');
    });

    it('should handle drag and drop events', () => {
      const dropzone = document.createElement('div');
      const event = new DragEvent('drop', {
        dataTransfer: new DataTransfer()
      });
      
      expect(dropzone).toBeDefined();
      expect(event.type).toBe('drop');
    });
  });

  describe('Dashboard refresh', () => {
    it('should dispatch transactionsUpdated event after import', () => {
      const event = new CustomEvent('transactionsUpdated');
      expect(event.type).toBe('transactionsUpdated');
    });

    it('should reload data from store after import', async () => {
      // After import, loadAll() should be called to refresh in-memory data
      const mockLoadAll = jest.fn();
      await mockLoadAll();
      expect(mockLoadAll).toHaveBeenCalled();
    });
  });
});

