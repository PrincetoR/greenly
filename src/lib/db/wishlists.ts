import 'server-only';
import { readDocument, updateDocument } from './store';

/** รายการโปรดผูก guest id — เก็บแค่ productId เรียงตามเวลาที่กด */
type WishlistsDoc = Record<string, string[]>;
const NAME = 'wishlists';

export async function readWishlist(guestId: string): Promise<string[]> {
  const doc = await readDocument<WishlistsDoc>(NAME, {});
  return doc[guestId] ?? [];
}

/** สลับสถานะ — คืน true ถ้าตอนนี้อยู่ในรายการโปรด */
export async function toggleWishlistItem(guestId: string, productId: string): Promise<boolean> {
  let saved = false;
  await updateDocument<WishlistsDoc>(NAME, {}, (doc) => {
    const cur = doc[guestId] ?? [];
    const next = cur.includes(productId) ? cur.filter((id) => id !== productId) : [...cur, productId];
    saved = next.includes(productId);
    if (next.length === 0) {
      const rest = { ...doc };
      delete rest[guestId];
      return rest;
    }
    return { ...doc, [guestId]: next };
  });
  return saved;
}
