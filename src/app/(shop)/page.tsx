import { getSettings } from '@/lib/db/settings';

export default async function HomePage() {
  const { storeName, tagline } = await getSettings();
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-bold">{storeName}</h1>
      <p className="mt-2 text-muted">{tagline}</p>
    </section>
  );
}
