import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/queries/sql/getRealtimeActivity', () => ({
  getRealtimeActivity: vi.fn().mockResolvedValue([
    {
      sessionId: 'session-1',
      hostname: 'shop.example.com',
      urlPath: '/menu',
      country: 'FR',
    },
    {
      sessionId: 'session-2',
      hostname: 'restaurant.example.net',
      urlPath: '/menu',
      country: 'FR',
    },
  ]),
}));

vi.mock('@/queries/sql/pageviews/getPageviewStats', () => ({
  getPageviewStats: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/queries/sql/sessions/getSessionStats', () => ({
  getSessionStats: vi.fn().mockResolvedValue([]),
}));

import { getRealtimeData } from './getRealtimeData';

afterEach(() => {
  vi.clearAllMocks();
});

describe('getRealtimeData', () => {
  test('keeps identical paths separate across hostnames', async () => {
    const data = await getRealtimeData('website-1', {});

    expect(data.urls).toEqual({ '/menu': 2 });
    expect(data.pages).toEqual([
      { hostname: 'restaurant.example.net', urlPath: '/menu', count: 1 },
      { hostname: 'shop.example.com', urlPath: '/menu', count: 1 },
    ]);
  });
});
