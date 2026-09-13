import Link from 'next/link';

export function Section({
  title,
  description,
  href,
  hrefLabel = 'ดูทั้งหมด',
  children,
}: {
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto mt-10 max-w-6xl px-4">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
        {href && (
          <Link href={href} className="shrink-0 text-sm font-semibold text-brand hover:underline">
            {hrefLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
