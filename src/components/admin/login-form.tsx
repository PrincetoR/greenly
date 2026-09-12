'use client';

import { useActionState } from 'react';
import { login, type LoginState } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Alert } from '@/components/ui/alert';

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <Field label="ชื่อผู้ใช้" htmlFor="username">
        <input id="username" name="username" autoComplete="username" required autoFocus />
      </Field>
      <Field label="รหัสผ่าน" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" size="lg" disabled={pending} className="mt-2">
        {pending ? 'กำลังตรวจสอบ…' : 'เข้าสู่ระบบ'}
      </Button>
    </form>
  );
}
