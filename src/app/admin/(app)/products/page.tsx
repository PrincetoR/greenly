import Link from 'next/link';
import { requirePermission } from '@/lib/auth/session';
import { listCategories } from '@/lib/db/categories';
import { listProducts } from '@/lib/db/products';
import { getSettings } from '@/lib/db/settings';
import { toggleProductActive } from '@/lib/actions/catalog';
import { formatBaht } from '@/lib/money';
import { PageHeader } from '@/components/admin/page-header';
import { ProductImage } from '@/components/product-image';
import { Table, Td, Th } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Button, buttonStyles } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Package, Plus } from 'lucide-react';

export const metadata = { title: 'สินค้า' };

export default async function ProductsPage({ searchParams }: PageProps<'/admin/products'>) {
  await requirePermission('catalog.manage');
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : '';
  const categoryId = typeof sp.category === 'string' ? sp.category : '';
  const status = typeof sp.status === 'string' ? sp.status : '';

  const [all, categories, settings] = await Promise.all([
    listProducts({ q, categoryId: categoryId || undefined, sort: 'newest' }),
    listCategories(),
    getSettings(),
  ]);
  const products = all.filter((p) => {
    if (status === 'active') return p.active;
    if (status === 'inactive') return !p.active;
    if (status === 'low') return p.stock <= settings.lowStockThreshold;
    return true;
  });
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div>
      <PageHeader
        title="สินค้า"
        description={`ทั้งหมด ${all.length} รายการ`}
        action={
          <Link href="/admin/products/new" className={buttonStyles()}>
            <Plus className="size-4" aria-hidden />
            เพิ่มสินค้า
          </Link>
        }
      />

      {sp.saved && <Alert tone="ok" className="mb-4">บันทึกสินค้าแล้ว</Alert>}

      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_180px_160px_auto]">
        <input type="search" name="q" defaultValue={q} placeholder="ค้นหาชื่อ / SKU" aria-label="ค้นหาสินค้า" />
        <select name="category" defaultValue={categoryId} aria-label="กรองหมวดหมู่">
          <option value="">ทุกหมวดหมู่</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} aria-label="กรองสถานะ">
          <option value="">ทุกสถานะ</option>
          <option value="active">เปิดขาย</option>
          <option value="inactive">ปิดขาย</option>
          <option value="low">ใกล้หมด (≤ {settings.lowStockThreshold})</option>
        </select>
        <Button type="submit" variant="secondary">
          กรอง
        </Button>
      </form>

      {products.length === 0 ? (
        <EmptyState
          icon={<Package />}
          title="ไม่พบสินค้า"
          description={q || categoryId || status ? 'ลองเปลี่ยนคำค้นหรือตัวกรอง' : 'เริ่มจากเพิ่มสินค้าชิ้นแรก'}
          action={
            <Link href="/admin/products/new" className={buttonStyles()}>
              เพิ่มสินค้า
            </Link>
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th className="w-16" />
                  <Th>สินค้า</Th>
                  <Th>หมวดหมู่</Th>
                  <Th className="text-right">ราคา</Th>
                  <Th className="text-right">คงเหลือ</Th>
                  <Th>สถานะ</Th>
                  <Th className="w-44" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-alt/50">
                    <Td>
                      <ProductImage src={p.images[0]} alt="" className="size-12 rounded-md" />
                    </Td>
                    <Td>
                      <Link href={`/admin/products/${p.id}`} className="font-medium hover:text-brand">
                        {p.name}
                      </Link>
                      <p className="font-mono text-xs text-muted">{p.sku}</p>
                    </Td>
                    <Td className="text-muted">{catName.get(p.categoryId) ?? '—'}</Td>
                    <Td className="text-right font-medium">{formatBaht(p.price)}</Td>
                    <Td className="text-right">
                      <StockCell stock={p.stock} threshold={settings.lowStockThreshold} />
                    </Td>
                    <Td>
                      <StatusBadges product={p} />
                    </Td>
                    <Td>
                      <RowActions id={p.id} active={p.active} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          <ul className="flex flex-col gap-2 md:hidden">
            {products.map((p) => (
              <li key={p.id} className="flex gap-3 rounded-card bg-surface p-3 border border-line">
                <ProductImage src={p.images[0]} alt="" className="size-20 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/products/${p.id}`} className="line-clamp-2 font-medium hover:text-brand">
                    {p.name}
                  </Link>
                  <p className="text-xs text-muted">
                    {p.sku} · {catName.get(p.categoryId) ?? '—'}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm">
                    <span className="font-semibold">{formatBaht(p.price)}</span>
                    <StockCell stock={p.stock} threshold={settings.lowStockThreshold} />
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <StatusBadges product={p} />
                    <RowActions id={p.id} active={p.active} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function StockCell({ stock, threshold }: { stock: number; threshold: number }) {
  if (stock === 0) return <span className="font-semibold text-danger">หมด</span>;
  if (stock <= threshold) return <span className="font-semibold text-warn">{stock} ใกล้หมด</span>;
  return <span>{stock}</span>;
}

function StatusBadges({ product }: { product: { active: boolean; featured: boolean } }) {
  return (
    <span className="flex flex-wrap gap-1">
      {product.active ? <Badge tone="ok">เปิดขาย</Badge> : <Badge>ปิดขาย</Badge>}
      {product.featured && <Badge tone="brand">แนะนำ</Badge>}
    </span>
  );
}

function RowActions({ id, active }: { id: string; active: boolean }) {
  return (
    <div className="flex justify-end gap-1">
      <Link href={`/admin/products/${id}`} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
        แก้ไข
      </Link>
      <form action={toggleProductActive}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="ghost" size="sm">
          {active ? 'ปิดขาย' : 'เปิดขาย'}
        </Button>
      </form>
    </div>
  );
}
