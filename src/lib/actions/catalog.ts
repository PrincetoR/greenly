'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import * as categories from '@/lib/db/categories';
import * as products from '@/lib/db/products';
import { categorySchema, productSchema } from '@/lib/validation/catalog';
import { fieldErrors, type FormState } from '@/lib/validation/common';

function revalidateCatalog() {
  // ทั้งหน้าร้านและหลังบ้านอ่านชุดข้อมูลเดียวกัน
  revalidatePath('/', 'layout');
}

/* ---------------- categories ---------------- */

export async function saveCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission('catalog.manage');
  const id = String(formData.get('id') ?? '');
  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    sortOrder: formData.get('sortOrder') ?? '0',
    active: formData.get('active'),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const dup = await categories.findCategoryBySlug(parsed.data.slug);
  if (dup && dup.id !== id) return { errors: { slug: 'slug นี้ถูกใช้แล้ว' } };

  if (id) await categories.updateCategory(id, parsed.data);
  else await categories.createCategory(parsed.data);
  revalidateCatalog();
  redirect('/admin/categories');
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requirePermission('catalog.manage');
  const id = String(formData.get('id') ?? '');
  const inUse = await products.listProducts({ categoryId: id });
  // มีสินค้าอยู่ในหมวด → ไม่ให้ลบ เพราะสินค้าจะกลายเป็นไม่มีหมวด
  if (inUse.length > 0) redirect(`/admin/categories?error=inuse&count=${inUse.length}`);
  await categories.deleteCategory(id);
  revalidateCatalog();
  redirect('/admin/categories');
}

/* ---------------- products ---------------- */

export async function saveProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission('catalog.manage');
  const id = String(formData.get('id') ?? '');
  const parsed = productSchema.safeParse({
    name: formData.get('name'),
    sku: formData.get('sku'),
    slug: formData.get('slug'),
    description: formData.get('description') ?? '',
    categoryId: formData.get('categoryId'),
    price: formData.get('price'),
    stock: formData.get('stock'),
    images: formData.getAll('images').map(String).filter(Boolean),
    active: formData.get('active'),
    featured: formData.get('featured'),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const dup = await products.findProductBySlug(parsed.data.slug);
  if (dup && dup.id !== id) return { errors: { slug: 'slug นี้ถูกใช้แล้ว' } };
  if (!(await categories.findCategory(parsed.data.categoryId))) return { errors: { categoryId: 'ไม่พบหมวดหมู่นี้' } };

  if (id) await products.updateProduct(id, parsed.data);
  else await products.createProduct(parsed.data);
  revalidateCatalog();
  redirect('/admin/products?saved=1');
}

export async function toggleProductActive(formData: FormData): Promise<void> {
  await requirePermission('catalog.manage');
  const id = String(formData.get('id') ?? '');
  const product = await products.findProduct(id);
  if (product) await products.updateProduct(id, { active: !product.active });
  revalidateCatalog();
}

export async function deleteProduct(formData: FormData): Promise<void> {
  await requirePermission('catalog.manage');
  await products.deleteProduct(String(formData.get('id') ?? ''));
  revalidateCatalog();
  redirect('/admin/products');
}
