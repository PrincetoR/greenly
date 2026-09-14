'use client';

import { useActionState } from 'react';
import { addUser, resetPassword } from '@/lib/actions/users';
import { ROLE_LABEL, ROLES } from '@/lib/auth/roles';
import type { FormState } from '@/lib/validation/common';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';

export function AddUserForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addUser, {});
  const errors = state.errors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="ชื่อผู้ใช้ (login)" htmlFor="u-username" error={errors.username} required>
        <input id="u-username" name="username" defaultValue={v.username} autoComplete="off" required aria-invalid={Boolean(errors.username)} />
      </Field>
      <Field label="ชื่อที่แสดง" htmlFor="u-name" error={errors.name} required>
        <input id="u-name" name="name" defaultValue={v.name} required aria-invalid={Boolean(errors.name)} />
      </Field>
      <Field label="สิทธิ์" htmlFor="u-role" error={errors.role} required>
        <Select id="u-role" name="role" defaultValue={v.role ?? 'staff'} options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
      </Field>
      <Field label="รหัสผ่าน" htmlFor="u-password" error={errors.password} required hint="อย่างน้อย 8 ตัวอักษร">
        <input id="u-password" name="password" type="password" autoComplete="new-password" required aria-invalid={Boolean(errors.password)} />
      </Field>
      <div className="sm:col-span-2 lg:col-span-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'กำลังเพิ่ม…' : 'เพิ่มผู้ใช้'}
        </Button>
      </div>
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPassword, {});
  const error = state.errors?.[`password-${userId}`];
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={userId} />
      <input name="password" type="password" placeholder="รหัสผ่านใหม่" aria-label="รหัสผ่านใหม่" autoComplete="new-password" className="w-40!" aria-invalid={Boolean(error)} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        ตั้งรหัสใหม่
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
      {state.ok && <span className="text-xs text-ok">{state.message}</span>}
    </form>
  );
}
