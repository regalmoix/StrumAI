import { describe, it, expect, beforeEach } from 'vitest';
import { recordSKUVisit, getRecentSKUs } from '../lib/recentSKUs';

beforeEach(() => {
  localStorage.clear();
});

describe('recentSKUs', () => {
  it('records and retrieves a single visit', () => {
    recordSKUVisit('SKU_001');
    expect(getRecentSKUs()).toEqual(['SKU_001']);
  });

  it('most recent visit comes first', () => {
    recordSKUVisit('SKU_001');
    recordSKUVisit('SKU_002');
    expect(getRecentSKUs()).toEqual(['SKU_002', 'SKU_001']);
  });

  it('deduplicates and moves revisited SKU to front', () => {
    recordSKUVisit('SKU_001');
    recordSKUVisit('SKU_002');
    recordSKUVisit('SKU_001');
    expect(getRecentSKUs()).toEqual(['SKU_001', 'SKU_002']);
  });

  it('caps at 8 entries', () => {
    for (let i = 0; i < 12; i++) {
      recordSKUVisit(`SKU_${String(i).padStart(3, '0')}`);
    }
    const recent = getRecentSKUs();
    expect(recent).toHaveLength(8);
    expect(recent[0]).toBe('SKU_011');
  });

  it('returns empty array when localStorage is empty', () => {
    expect(getRecentSKUs()).toEqual([]);
  });
});
