import { firstBy } from 'thenby';
import { useMessages } from '@/components/hooks';
import { ListTable } from '@/components/metrics/ListTable';
import { percentFilter } from '@/lib/filters';
import { formatPageUrl, getPageHref } from '@/lib/url';

export function RealtimePaths({ data }: { data: any }) {
  const { t, labels } = useMessages();
  const { pages: pageData, urls = {} } = data || {};
  const limit = 15;
  const pageRows =
    pageData ?? Object.entries(urls).map(([urlPath, count]) => ({ hostname: '', urlPath, count }));

  const renderLink = ({ label, hostname }: { label: string; hostname?: string }) => {
    const href = getPageHref(hostname, label);

    if (!href) {
      return formatPageUrl(hostname, label);
    }

    return (
      <a href={href} target="_blank" rel="noreferrer noopener">
        {formatPageUrl(hostname, label)}
      </a>
    );
  };

  const pages = percentFilter(
    pageRows
      .map(({ hostname, urlPath, count }) => ({ x: urlPath, y: count, hostname }))
      .sort(firstBy('y', -1))
      .slice(0, limit),
  );

  return (
    <ListTable
      title={t(labels.pages)}
      metric={t(labels.views)}
      renderLabel={renderLink}
      data={pages.map(
        ({ x, y, z, hostname }: { x: string; y: number; z: number; hostname: string }) => ({
          label: x,
          hostname,
          count: y,
          percent: z,
        }),
      )}
    />
  );
}
