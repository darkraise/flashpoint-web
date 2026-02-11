import { describe, it, expect } from 'vitest';
import { createPaginatedResponse, calculateOffset } from './pagination';

describe('createPaginatedResponse', () => {
  it('should create paginated response with normal inputs', () => {
    const data = [1, 2, 3, 4, 5];
    const result = createPaginatedResponse(data, 50, 1, 10);

    expect(result).toEqual({
      data: [1, 2, 3, 4, 5],
      pagination: {
        total: 50,
        page: 1,
        limit: 10,
        totalPages: 5,
      },
    });
  });

  it('should handle limit=0 by using safeLimit=1', () => {
    const data = [1];
    const result = createPaginatedResponse(data, 10, 1, 0);

    expect(result.pagination.limit).toBe(1);
    expect(result.pagination.totalPages).toBe(10); // 10 items / 1 per page = 10 pages
  });

  it('should handle negative limit by using safeLimit=1', () => {
    const data = [1];
    const result = createPaginatedResponse(data, 10, 1, -5);

    expect(result.pagination.limit).toBe(1);
    expect(result.pagination.totalPages).toBe(10);
  });

  it('should calculate correct totalPages with remainder', () => {
    const data = [1, 2, 3];
    const result = createPaginatedResponse(data, 25, 1, 10);

    expect(result.pagination.totalPages).toBe(3); // 25 items / 10 per page = 2.5 -> 3 pages
  });

  it('should handle empty data', () => {
    const data: number[] = [];
    const result = createPaginatedResponse(data, 0, 1, 10);

    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });

  it('should handle single page of data', () => {
    const data = [1, 2, 3];
    const result = createPaginatedResponse(data, 3, 1, 10);

    expect(result.pagination.totalPages).toBe(1);
  });

  it('should preserve data type', () => {
    interface TestItem {
      id: number;
      name: string;
    }

    const data: TestItem[] = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ];

    const result = createPaginatedResponse(data, 2, 1, 10);

    expect(result.data).toEqual(data);
    expect(result.data[0].id).toBe(1);
    expect(result.data[0].name).toBe('Item 1');
  });
});

describe('calculateOffset', () => {
  it('should calculate offset for page 1', () => {
    expect(calculateOffset(1, 10)).toBe(0);
  });

  it('should calculate offset for page 2', () => {
    expect(calculateOffset(2, 10)).toBe(10);
  });

  it('should calculate offset for page 3 with limit 20', () => {
    expect(calculateOffset(3, 20)).toBe(40);
  });

  it('should handle page 1 with limit 1', () => {
    expect(calculateOffset(1, 1)).toBe(0);
  });

  it('should handle page 10 with limit 5', () => {
    expect(calculateOffset(10, 5)).toBe(45);
  });

  it('should handle large page numbers', () => {
    expect(calculateOffset(100, 25)).toBe(2475);
  });
});
