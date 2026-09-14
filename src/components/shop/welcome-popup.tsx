'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { HomePopup } from '@/lib/types';

const KEY = 'ec_popup_seen';

function remember(version: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

/**
 * ป๊อปอัปตอนเข้าหน้าแรก — จำว่าปิดแล้วใน localStorage (ตาม version ของป๊อปอัป: แก้ในหลังบ้านแล้วโชว์ใหม่)
 * once = จำตลอด · daily = จำถึงสิ้นวัน · always = ไม่จำ · ?popup=1 = บังคับโชว์ (ดูตัวอย่างจากหลังบ้าน)
 * ความกว้างจากตั้งค่า แต่ไม่เกินจอ − 32px
 */
export function WelcomePopup({ popup, force = false }: { popup: HomePopup; force?: boolean }) {
  const [open, setOpen] = useState(false);

  // ตัดสินใจหลัง mount (ต้องอ่าน localStorage) — หน่วง 400ms ให้หน้าวาดเสร็จก่อนค่อยเด้ง
  useEffect(() => {
    if (!popup.enabled) return;
    if (!force && popup.frequency !== 'always') {
      try {
        const raw = localStorage.getItem(KEY);
        const seen = raw ? (JSON.parse(raw) as { version: string; at: number }) : null;
        const sameVersion = seen?.version === popup.version;
        const seenToday = seen ? new Date(seen.at).toDateString() === new Date().toDateString() : false;
        if (sameVersion && (popup.frequency === 'once' || seenToday)) return;
      } catch {
        /* private mode ฯลฯ — โชว์ไปเลย */
      }
    }
    const t = setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(t);
  }, [popup.enabled, popup.frequency, popup.version, force]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        remember(popup.version);
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, popup.version]);

  const close = () => {
    setOpen(false);
    remember(popup.version);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button type="button" aria-label="ปิดป๊อปอัป" onClick={close} className="absolute inset-0 bg-ink/60" />
      <div role="dialog" aria-modal="true" aria-labelledby="welcome-popup-title" className="relative w-full overflow-hidden rounded-card bg-surface shadow-xl" style={{ maxWidth: `min(${popup.width}px, calc(100vw - 32px))` }}>
        <button type="button" onClick={close} aria-label="ปิด" className="absolute top-2 right-2 z-10 flex size-9 items-center justify-center rounded-full bg-surface/90 text-ink shadow hover:bg-surface">
          <X className="size-5" aria-hidden />
        </button>
        {/* ทั้งรูปและข้อความคลิกได้ถ้ามี href (ไม่มีปุ่ม — พี่ต่อสั่ง) · ปิดด้วยกากบาท/คลิกนอก/Esc */}
        <Clickable href={popup.href} onClick={close}>
          {popup.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={popup.image} alt="" className="block w-full object-cover" />
          )}
          {(popup.title || popup.body) && (
            <div className="flex flex-col gap-2 p-5 sm:p-6">
              {popup.title && (
                <p id="welcome-popup-title" className="text-xl font-bold sm:text-2xl">
                  {popup.title}
                </p>
              )}
              {popup.body && <p className="text-sm whitespace-pre-line text-muted sm:text-base">{popup.body}</p>}
            </div>
          )}
        </Clickable>
        {!popup.title && !popup.body && popup.image && <span className="sr-only" id="welcome-popup-title">ประกาศ</span>}
      </div>
    </div>
  );
}

/** ครอบเนื้อหาด้วยลิงก์เมื่อมี href — path ในเว็บใช้ Link, URL นอกเปิดแท็บใหม่ */
function Clickable({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  if (!href) return <div>{children}</div>;
  const cls = 'block transition-opacity hover:opacity-95';
  return href.startsWith('/') ? (
    <Link href={href} onClick={onClick} className={cls} aria-label="เปิดรายละเอียด">
      {children}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noreferrer" onClick={onClick} className={cls} aria-label="เปิดรายละเอียด">
      {children}
    </a>
  );
}
