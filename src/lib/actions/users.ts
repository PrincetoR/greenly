'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { createUser, findUser, findUserByUsername, listUsers, updateUser } from '@/lib/db/users';
import { userSchema } from '@/lib/validation/user';
import { fieldErrors, formValues, type FormState } from '@/lib/validation/common';

export async function addUser(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission('user.manage');
  const parsed = userSchema.safeParse({
    username: formData.get('username'),
    name: formData.get('name'),
    role: formData.get('role'),
    password: formData.get('password'),
    active: formData.get('active') ?? 'on',
  });
  const values = formValues(formData);
  delete values.password;
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  if (await findUserByUsername(parsed.data.username)) return { errors: { username: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' }, values };

  const { password, ...rest } = parsed.data;
  await createUser({ ...rest, passwordHash: await hashPassword(password) });
  revalidatePath('/admin/users');
  redirect('/admin/users?saved=1');
}

export async function toggleUserActive(formData: FormData): Promise<void> {
  const session = await requirePermission('user.manage');
  const id = String(formData.get('id') ?? '');
  if (id === session.user.id) redirect('/admin/users?error=self');
  const user = await findUser(id);
  if (!user) redirect('/admin/users');
  // ห้ามปิด admin คนสุดท้าย ไม่งั้นไม่มีใครเข้าจัดการผู้ใช้ได้อีก
  if (user.active && user.role === 'admin') {
    const admins = (await listUsers()).filter((u) => u.role === 'admin' && u.active);
    if (admins.length <= 1) redirect('/admin/users?error=lastadmin');
  }
  await updateUser(id, { active: !user.active });
  revalidatePath('/admin/users');
  redirect('/admin/users');
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission('user.manage');
  const id = String(formData.get('id') ?? '');
  const password = String(formData.get('password') ?? '');
  if (password.length < 8) return { errors: { [`password-${id}`]: 'รหัสผ่านอย่างน้อย 8 ตัวอักษร' } };
  await updateUser(id, { passwordHash: await hashPassword(password) });
  revalidatePath('/admin/users');
  return { ok: true, message: 'เปลี่ยนรหัสผ่านแล้ว' };
}
