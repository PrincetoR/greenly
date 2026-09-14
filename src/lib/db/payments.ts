import 'server-only';
import type { Payment, PaymentStatus } from '@/lib/types';
import { newId, nowIso, readCollection, updateCollection } from './store';

const NAME = 'payments';

/** รายการชำระเงินฝั่ง Beam (mock) — ledger แยกจาก orders เพื่อทำหน้า "การชำระเงิน" และเก็บประวัติลองจ่ายซ้ำ */
export async function listPayments(opts: { status?: PaymentStatus } = {}): Promise<Payment[]> {
  return (await readCollection<Payment>(NAME)).filter((p) => !opts.status || p.status === opts.status).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function findPayment(id: string): Promise<Payment | undefined> {
  return (await readCollection<Payment>(NAME)).find((p) => p.id === id);
}

export async function listPaymentsByOrder(orderId: string): Promise<Payment[]> {
  return (await readCollection<Payment>(NAME)).filter((p) => p.orderId === orderId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createPayment(input: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment> {
  const now = nowIso();
  const payment: Payment = { id: newId('pay'), ...input, createdAt: now, updatedAt: now };
  await updateCollection<Payment>(NAME, (items) => [...items, payment]);
  return payment;
}

export async function updatePayment(id: string, fn: (p: Payment) => Payment): Promise<Payment | undefined> {
  let updated: Payment | undefined;
  await updateCollection<Payment>(NAME, (items) =>
    items.map((p) => {
      if (p.id !== id) return p;
      updated = { ...fn(p), updatedAt: nowIso() };
      return updated;
    }),
  );
  return updated;
}
