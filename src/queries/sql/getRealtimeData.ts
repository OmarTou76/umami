import type { QueryFilters } from '@/lib/types';
import { getRealtimeActivity } from '@/queries/sql/getRealtimeActivity';
import { getPageviewStats } from '@/queries/sql/pageviews/getPageviewStats';
import { getSessionStats } from '@/queries/sql/sessions/getSessionStats';

function increment(data: object, key: string) {
  if (key) {
    if (!data[key]) {
      data[key] = 1;
    } else {
      data[key] += 1;
    }
  }
}

function incrementUrl(
  data: Record<string, { hostname: string; urlPath: string; count: number }>,
  hostname: string,
  urlPath: string,
) {
  if (!urlPath) {
    return;
  }

  const key = JSON.stringify([hostname || '', urlPath]);

  if (!data[key]) {
    data[key] = { hostname, urlPath, count: 1 };
  } else {
    data[key].count += 1;
  }
}

export async function getRealtimeData(websiteId: string, filters: QueryFilters) {
  const [activity, pageviews, sessions] = await Promise.all([
    getRealtimeActivity(websiteId, filters),
    getPageviewStats(websiteId, filters),
    getSessionStats(websiteId, filters),
  ]);

  const uniques = new Set();

  const { countries, urls, pages, referrers, events } = activity.reverse().reduce(
    (
      obj: { countries: any; urls: any; pages: any; referrers: any; events: any },
      event: {
        sessionId: string;
        urlPath: string;
        referrerDomain: string;
        country: string;
        eventName: string;
        hostname: string;
      },
    ) => {
      const { countries, urls, pages, referrers, events } = obj;
      const { sessionId, urlPath, referrerDomain, country, eventName, hostname } = event;

      if (!uniques.has(sessionId)) {
        uniques.add(sessionId);
        increment(countries, country);

        events.push({ __type: 'session', ...event });
      }

      increment(urls, urlPath);
      incrementUrl(pages, hostname, urlPath);
      increment(referrers, referrerDomain);

      events.push({ __type: eventName ? 'event' : 'pageview', ...event });

      return obj;
    },
    {
      countries: {},
      urls: {},
      pages: {},
      referrers: {},
      events: [],
    },
  );

  return {
    countries,
    urls,
    pages: Object.values(pages),
    referrers,
    events: events.reverse(),
    series: {
      views: pageviews,
      visitors: sessions,
    },
    totals: {
      views: pageviews.reduce((sum: number, { y }: { y: number }) => Number(sum) + Number(y), 0),
      visitors: sessions.reduce((sum: number, { y }: { y: number }) => Number(sum) + Number(y), 0),
      events: activity.filter(e => e.eventName).length,
      countries: Object.keys(countries).length,
    },
    timestamp: Date.now(),
  };
}
