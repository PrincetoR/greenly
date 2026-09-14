'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { writeCart, writeCoupon } from '@/lib/cart/storage';
import { loadCart } from '@/lib/cart/service';
import { ensureGuestId } from '@/lib/guest';
import { createOrder } from '@/lib/db/orders';
import { startBeamPayment } from '@/lib/payments/service';
import { decrementStock, findProductsByIds } from '@/lib/db/products';
import { formatBaht } from '@/lib/money';
import { normalizeCustomerKey } from '@/lib/pricing/usage';
import { checkoutSchema } from '@/lib/validation/order';
import { fieldErrors, formValues } from '@/lib/validation/common';
import type { OrderLine } from '@/lib/types';

export interface CheckoutState {
  errors?: Record<string, string>;
  values?: Record<string, string>;
  message?: string;
  /** ยอด/ของแถมใหม่หลังคิดสิทธิ์ต่อลูกค้าจากเบอร์โทร — ให้ลูกค้าเห็นแล้วกดยืนยันอีกครั้ง */
  newTotal?: number;
  newGifts?: number;
  warnings?: string[];
}

/**
 * สั่งซื้อ — คิดราคาใหม่ฝั่ง server ด้วยเบอร์โทร (perCustomer มีผลตรงนี้)
 * ถ้ายอดต่างจากที่ลูกค้าเห็นบนหน้า checkout จะไม่สร้าง order ทันที แต่ส่งยอดใหม่กลับไปให้ยืนยันก่อน
 */
export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const parsed = checkoutSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email') ?? '',
    address: formData.get('address'),
    paymentMethod: formData.get('paymentMethod'),
    note: formData.get('note') ?? '',
  });
  const values = formValues(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values, message: 'กรุณาตรวจสอบข้อมูลที่กรอก' };
  const customer = parsed.data;
  const expectedTotal = Number(formData.get('expectedTotal'));
  const expectedGifts = Number(formData.get('expectedGifts'));

  const cart = await loadCart(normalizeCustomerKey(customer.phone));
  if (cart.lines.length === 0) return { message: 'ตะกร้าว่างเปล่า' };
  const { quote } = cart;

  if (quote.coupon && quote.coupon.status !== 'applied') {
    return { values, message: `คูปอง ${quote.coupon.code} ใช้ไม่ได้: ${quote.coupon.message} — นำคูปองออกที่หน้าตะกร้าก่อน` };
  }
  // ของแถมฟรีอยู่แล้ว ยอดจึงไม่เปลี่ยนแม้ถูกตัดสิทธิ์ → ต้องเทียบจำนวนของแถมแยกต่างหาก
  const gifts = quote.lines.filter((l) => l.isGift).reduce((s, l) => s + l.qty, 0);
  const totalChanged = Number.isFinite(expectedTotal) && expectedTotal !== quote.total;
  const giftsChanged = Number.isFinite(expectedGifts) && expectedGifts !== gifts;
  if (totalChanged || giftsChanged) {
    const what = [
      totalChanged ? `ยอดรวมเปลี่ยนเป็น ${formatBaht(quote.total)}` : null,
      giftsChanged ? `ของแถมเปลี่ยนเป็น ${gifts} ชิ้น` : null,
    ]
      .filter(Boolean)
      .join(' และ ');
    return {
      values,
      message: `${what} หลังตรวจสอบสิทธิ์ของเบอร์ ${customer.phone} (สิทธิ์ต่อลูกค้าถูกใช้ไปแล้ว) — กรุณาตรวจสอบแล้วกดยืนยันอีกครั้ง`,
      newTotal: quote.total,
      newGifts: gifts,
      warnings: quote.warnings,
    };
  }

  // ตัด stock รวมของแถมด้วย — ของแถมก็ออกจากคลังเหมือนกัน
  const need = new Map<string, number>();
  for (const l of quote.lines) need.set(l.productId, (need.get(l.productId) ?? 0) + l.qty);
  const shortage = await decrementStock([...need].map(([productId, qty]) => ({ productId, qty })));
  if (shortage.length > 0) {
    const names = (await findProductsByIds(shortage)).map((p) => p.name).join(', ');
    return { values, message: `สินค้าไม่พอ: ${names} — กรุณาปรับจำนวนในตะกร้า` };
  }

  const lines: OrderLine[] = quote.lines.map((l) => ({
    productId: l.productId,
    name: l.name,
    image: l.image,
    unitPrice: l.unitPrice,
    qty: l.qty,
    discount: l.discount,
    promotionId: l.promotionId,
    isGift: l.isGift,
  }));

  // ผูก order กับเบราว์เซอร์นี้ → กลับมาดูได้ที่ "คำสั่งซื้อของฉัน" โดยไม่ต้อง login
  const guestId = await ensureGuestId();
  const order = await createOrder({
    status: 'pending',
    guestIds: [guestId],
    customer: { name: customer.name, phone: customer.phone, email: customer.email, address: customer.address },
    lines,
    subtotal: quote.subtotal,
    discountTotal: quote.discountTotal,
    shippingFee: quote.shippingFee,
    total: quote.total,
    couponCode: quote.coupon?.status === 'applied' ? quote.coupon.code : null,
    promotionUsages: quote.usages,
    paymentMethod: customer.paymentMethod,
    // COD: รอร้านยืนยัน เก็บเงินตอนส่งถึง · Beam: สร้างรายการชำระด้านล่างแล้วพาไปหน้า Beam
    payment: customer.paymentMethod === 'cod' ? { provider: 'cod', channel: 'cod', paymentId: null, status: 'pending', amount: quote.total, fee: 0, paidAt: null, refundedAmount: 0 } : null,
    shipment: null,
    history: [{ at: new Date().toISOString(), type: 'pending', by: 'customer', note: `ลูกค้าสั่งซื้อ · ${customer.paymentMethod === 'cod' ? 'เก็บเงินปลายทาง' : 'ชำระออนไลน์ผ่าน Beam'}` }],
    note: customer.note,
  });

  await writeCart([]);
  await writeCoupon(null);
  revalidatePath('/', 'layout');
  if (customer.paymentMethod === 'beam') {
    const payment = await startBeamPayment(order);
    redirect(`/pay/${payment.id}`);
  }
  redirect(`/order/${order.orderNo}?new=1`);
}
