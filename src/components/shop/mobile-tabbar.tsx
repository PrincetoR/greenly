"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Package, Search, Tag, User } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/", label: "หน้าแรก", icon: Home, active: (p: string) => p === "/" },
  {
    href: "/products",
    label: "สินค้าทั้งหมด",
    icon: Package,
    active: (p: string) =>
      p.startsWith("/products") ||
      p.startsWith("/category/") ||
      p.startsWith("/product/") ||
      p.startsWith("/search"),
  },
  {
    href: "/promotions",
    label: "โปรโมชัน",
    icon: Tag,
    active: (p: string) => p.startsWith("/promotions"),
  },
  {
    href: "/account",
    label: "โปรไฟล์",
    icon: User,
    active: (p: string) =>
      p.startsWith("/account") ||
      p.startsWith("/orders") ||
      p.startsWith("/order/") ||
      p.startsWith("/wishlist"),
  },
];

/**
 * แถบเมนูล่างบนมือถือ (พี่ต่อสั่ง 2026-09-15): หน้าแรก · สินค้าทั้งหมด · [ค้นหา] · โปรโมชัน · โปรไฟล์ — ไอคอนล้วนไม่มีชื่อ
 * ปุ่มค้นหาตรงกลางเป็นวงกลมนูนขึ้นเหนือเส้นแถบครึ่งวง (ring สีพื้นหน้าเว็บทำเป็นรอยเว้าบนเส้น)
 * ค้นหา: ถ้าหน้านี้มีช่องค้นหาอยู่แล้ว (หน้ารายการ) โฟกัสเลย · ไม่มีก็ไป /products?focus=1 ให้แถบเครื่องมือโฟกัสให้
 * หน้าสินค้าไม่แสดง — มีแถบ [ใส่ตะกร้า · หัวใจ] ติดล่างแทน (แบบ Shopee/Lazada) ไม่งั้นวงกลมค้นหาทับปุ่ม
 * ตัวเว้นที่ (spacer) สูงเท่าแถบอยู่ท้าย layout ให้ footer ไม่ถูกทับ
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname.startsWith("/product/")) return null;

  const search = () => {
    const input = document.querySelector<HTMLInputElement>(
      'main input[aria-label="ค้นหา"]',
    );
    if (input) {
      input.scrollIntoView({ block: "center" });
      input.focus();
    } else {
      router.push("/products?focus=1");
    }
  };

  const item = (t: (typeof TABS)[number]) => {
    const on = t.active(pathname);
    return (
      <Link
        key={t.href}
        href={t.href}
        aria-label={t.label}
        aria-current={on ? "page" : undefined}
        className={cn(
          "flex h-14 items-center justify-center",
          on ? "text-brand" : "text-muted",
        )}
      >
        <t.icon className="size-6" aria-hidden />
      </Link>
    );
  };

  return (
    <>
      <div
        className="h-[calc(3.5rem+env(safe-area-inset-bottom))] md:hidden"
        aria-hidden
      />
      <nav
        aria-label="เมนูมือถือ"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="grid grid-cols-5">
          {TABS.slice(0, 2).map(item)}
          <div className="relative">
            {/* ครึ่งบนของวงกลม (28px) โผล่เหนือเส้นแถบ · ring 4px สีพื้นหน้าเว็บ = รอยเว้าตัดเส้นให้ดูนูน */}
            <button
              type="button"
              onClick={search}
              aria-label="ค้นหา"
              className="absolute left-1/2 -top-7 flex size-14 -translate-x-1/2 items-center justify-center rounded-full bg-brand text-white shadow-lg ring-4 ring-page transition-colors hover:bg-brand-hover active:scale-95"
            >
              <Search className="size-6" aria-hidden />
            </button>
          </div>
          {TABS.slice(2).map(item)}
        </div>
      </nav>
    </>
  );
}
