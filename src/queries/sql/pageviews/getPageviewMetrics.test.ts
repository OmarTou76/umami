import { afterEach, describe, expect, test, vi } from 'vitest';

const parseFiltersResult = {
  queryParams: { websiteId: 'website-1' },
  filterQuery: '',
  joinSessionQuery: '',
  cohortQuery: '',
  excludeBounceQuery: '',
};

async function loadModule(mode: 'prisma' | 'clickhouse') {
  vi.resetModules();

  const rawQuery = vi.fn().mockResolvedValue([{}]);

  vi.doMock('@/lib/db', () => ({
    CLICKHOUSE: 'clickhouse',
    PRISMA: 'prisma',
    runQuery: vi.fn((queries: Record<string, () => unknown>) => queries[mode]()),
  }));

  vi.doMock('@/lib/prisma', () => ({
    default: { rawQuery, parseFilters: vi.fn().mockReturnValue(parseFiltersResult) },
  }));

  vi.doMock('@/lib/clickhouse', () => ({
    default: { rawQuery, parseFilters: vi.fn().mockReturnValue(parseFiltersResult) },
  }));

  const { getPageviewMetrics } = await import('./getPageviewMetrics');

  return { getPageviewMetrics, rawQuery };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('getPageviewMetrics', () => {
  test('groups PostgreSQL paths by hostname without changing the path value', async () => {
    const { getPageviewMetrics, rawQuery } = await loadModule('prisma');

    await getPageviewMetrics('website-1', { type: 'path' }, {} as any);

    const [query] = rawQuery.mock.calls[0];

    expect(query).toContain('select url_path x');
    expect(query).toContain('website_event.hostname as hostname');
    expect(query).toContain('group by 1, 2');
  });

  test('uses raw ClickHouse events and pairs exit path with exit hostname', async () => {
    const { getPageviewMetrics, rawQuery } = await loadModule('clickhouse');

    await getPageviewMetrics('website-1', { type: 'exit' }, {} as any);

    const [query] = rawQuery.mock.calls[0];

    expect(query).toContain('from website_event');
    expect(query).not.toContain('website_event_stats_hourly');
    expect(query).toContain('argMax(hostname, created_at) hostname');
    expect(query).toContain('x.hostname as hostname');
  });
});
