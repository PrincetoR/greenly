import Link from 'next/link';
import { requirePermission } from '@/lib/auth/session';
import { listCategories } from '@/lib/db/categories';
import { listProducts } from '@/lib/db/products';
import { deleteCategory } from '@/lib/actions/catalog';
import { PageHeader } from '@/components/admin/page-header';
import { CategoryForm } from '@/components/admin/category-form';
import { Card, CardHeader } from '@/components/ui/card';
import { Table, Td, Th } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { buttonStyles } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { CategoryIcon } from '@/components/category-icon';
import { ProductImage } from '@/components/product-image';

export const metadata = { title: 'หมวดหมู่' };

export default async function CategoriesPage({ searchParams }: PageProps<'/admin/categories'>) {
  await requirePermission('catalog.manage');
  const { edit, error, count } = await searchParams;
  const [categories, products] = await Promise.all([listCategories(), listProducts()]);
  const editing = typeof edit === 'string' ? categories.find((c) => c.id === edit) : undefined;
  const countOf = (id: string) => products.filter((p) => p.categoryId === id).length;

  return (
    <div>
      <PageHeader title="หมวดหมู่" description="จัดกลุ่มสินค้าและลำดับการแสดงบนหน้าร้าน" />

      {error === 'inuse' && (
        <Alert tone="warn" className="mb-4">
          ลบไม่ได้ — มีสินค้า {count} รายการอยู่ในหมวดนี้ ย้ายสินค้าออกก่อน
        </Alert>
      )}

      <Card className="mb-4">
        <CardHeader title={editing ? `แก้ไข "${editing.name}"` : 'เพิ่มหมวดหมู่ใหม่'} />
        <div className="p-5">
          <CategoryForm key={editing?.id ?? 'new'} category={editing} />
        </div>
      </Card>

      {/* ตารางบน desktop */}
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th className="w-16">ลำดับ</Th>
              <Th>ชื่อ</Th>
              <Th>slug</Th>
              <Th className="text-right">สินค้า</Th>
              <Th>สถานะ</Th>
              <Th className="w-40" />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-surface-alt/50">
                <Td className="text-muted">{c.sortOrder}</Td>
                <Td className="font-medium">
                  <span className="flex items-center gap-3">
                    {c.image ? (
                      <ProductImage src={c.image} alt="" className="size-9 rounded-md" />
                    ) : (
                      <span className="flex size-9 items-center justify-center rounded-md bg-brand-soft text-brand" aria-hidden>
                        <CategoryIcon icon={c.icon} className="size-5" />
                      </span>
                    )}
                    {c.name}
                  </span>
                </Td>
                <Td className="font-mono text-xs text-muted">{c.slug}</Td>
                <Td className="text-right">{countOf(c.id)}</Td>
                <Td>{c.active ? <Badge tone="ok">แสดง</Badge> : <Badge>ซ่อน</Badge>}</Td>
                <Td>
                  <RowActions id={c.id} name={c.name} inUse={countOf(c.id) > 0} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* card list บนมือถือ */}
      <ul className="flex flex-col gap-3 sm:gap-4 md:hidden">
        {categories.map((c) => (
          <li key={c.id} className="rounded-card bg-surface p-4 border border-line">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{c.name}</p>
                <p className="font-mono text-xs text-muted">{c.slug}</p>
              </div>
              {c.active ? <Badge tone="ok">แสดง</Badge> : <Badge>ซ่อน</Badge>}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted">
                ลำดับ {c.sortOrder} · สินค้า {countOf(c.id)}
              </span>
              <RowActions id={c.id} name={c.name} inUse={countOf(c.id) > 0} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RowActions({ id, name, inUse }: { id: string; name: string; inUse: boolean }) {
  return (
    <div className="flex justify-end gap-1">
      <Link href={`/admin/categories?edit=${id}`} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
        แก้ไข
      </Link>
      <form action={deleteCategory}>
        <input type="hidden" name="id" value={id} />
        <ConfirmButton
          variant="danger"
          size="sm"
          disabled={inUse}
          title={inUse ? 'ย้ายสินค้าออกจากหมวดก่อน' : undefined}
          message={`ลบหมวดหมู่ "${name}" ?`}
        >
          ลบ
        </ConfirmButton>
      </form>
    </div>
  );
}
