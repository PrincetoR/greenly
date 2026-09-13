'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { DashboardRankKey } from '@/lib/types';
import { isValidRank, RANK_MAX, RANK_MIN, RANK_PRESETS } from '@/lib/analytics/ranks';
import { updateDashboardRank } from '@/lib/actions/settings';

/**
 * รูปเฟืองมุมขวาของการ์ดอันดับ (ไอคอนเปล่า บรรทัดเดียวกับหัวข้อ ชิดขอบขวา) — กดแล้วเปิดป๊อปอัปเลือกจำนวนอันดับ (ปุ่มลัด 5/10/20 หรือพิมพ์เอง 1–50)
 * บันทึกลง settings ผ่าน server action → หน้าถูก revalidate โหลดข้อมูลตามจำนวนใหม่ทันที
 */
export function RankSetting({ field, value, label }: { field: DashboardRankKey; value: number; label: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const submit = (next: number) => {
    if (!isValidRank(next)) {
      setError(`ต้องเป็นจำนวนเต็ม ${RANK_MIN}–${RANK_MAX}`);
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set('key', field);
    fd.set('value', String(next));
    startTransition(async () => {
      const r = await updateDashboardRank(fd);
      if (!r.ok) {
        setError(r.message ?? 'บันทึกไม่สำเร็จ');
        return;
      }
      setDraft(String(next));
      setOpen(false);
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setDraft(String(value));
          setError(null);
          setOpen((v) => !v);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`ตั้งค่าจำนวนอันดับ${label}`}
        title="ตั้งค่าจำนวนอันดับ"
        // ไอคอนเปล่า ไม่มีกล่อง ขนาดเท่าตัวอักษร (16px) · สูงเท่าบรรทัดหัวข้อ (line-height 1.6em) ให้กึ่งกลางตรง h2 · ขอบขวาไอคอนตรงขอบเนื้อหาการ์ด
        className={cn('flex h-[1.6em] items-center text-muted transition-colors hover:text-ink', open && 'text-ink')}
      >
        <Settings className="size-4" aria-hidden />
      </button>

      {open && (
        <form
          role="dialog"
          aria-label={`จำนวนอันดับ${label}`}
          // ตรวจเอง (ข้อความไทย ตำแหน่งเดียวกับ error ของ server) แทน tooltip ของเบราว์เซอร์
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit(Number(draft));
          }}
          className="absolute top-full right-0 z-30 mt-1 w-56 rounded-lg bg-surface p-3 shadow-lg border border-line"
        >
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">แสดงกี่อันดับ</p>
          <div className="mt-2 flex gap-1">
            {RANK_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                disabled={pending}
                onClick={() => submit(n)}
                className={cn('flex-1 rounded-lg py-1.5 text-sm font-medium border transition-colors', n === value ? 'bg-brand-soft text-brand border-brand-soft' : 'border-line hover:bg-surface-alt')}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              name="value"
              min={RANK_MIN}
              max={RANK_MAX}
              step={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="จำนวนอันดับ"
              className="h-9! min-w-0 flex-1"
              autoFocus
            />
            <button type="submit" disabled={pending} className="h-9 rounded-lg bg-brand px-3 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
              {pending ? 'กำลังบันทึก…' : 'ตกลง'}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-xs text-danger">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
