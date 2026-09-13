import 'server-only';
import { readGuestId } from '@/lib/guest';
import { readWishlist } from '@/lib/db/wishlists';

/** รายการโปรดของเบราว์เซอร์นี้ — ไม่มี guest id = ยังไม่เคยกดหัวใจ */
export async function readMyWishlist(): Promise<string[]> {
  const guestId = await readGuestId();
  return guestId ? readWishlist(guestId) : [];
}
