'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * dropdown แทน <select> ของเบราว์เซอร์ทุกที่ (พี่ต่อ: เมนู system ไม่สวย) — หน้าตาเดียวกับเมนูเรียงลำดับ:
 * ปุ่มขอบ line พื้น surface (เปิดแล้ว surface-alt) · เมนูการ์ดขาว เงา ติ๊กถูกที่ตัวที่เลือก
 * ใช้ในฟอร์มได้เหมือน select: `name` → hidden input ส่งค่าไปกับ form · `defaultValue` (uncontrolled) หรือ `value`+`onChange` (controlled)
 * เมนูวาดผ่าน portal ที่ body แบบ fixed — ไม่โดน overflow ของการ์ด/ตารางตัด และพลิกขึ้นบนเองถ้าที่ด้านล่างไม่พอ
 * คีย์บอร์ด: ↑↓ เลื่อน · Enter/Space เลือก · Esc ปิด · Home/End · พิมพ์ตัวแรกเพื่อกระโดด
 */
export function Select({
  options,
  value,
  defaultValue,
  onChange,
  name,
  id,
  size = 'md',
  fit = false,
  align = 'start',
  placeholder,
  disabled,
  autoSubmit,
  className,
  menuClassName,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
}: {
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  id?: string;
  /** md = สูงเท่าช่องกรอกในฟอร์ม · sm = 36px (ตารางคิว) · bar = 40px text-sm (แถบเครื่องมือ/ตัวกรอง) */
  size?: 'md' | 'sm' | 'bar';
  /** จองความกว้างเท่าข้อความยาวสุด (ปุ่มไม่เปลี่ยนขนาดตอนสลับ) — ใช้กับเมนูสั้น ๆ เช่น เรียงลำดับ */
  fit?: boolean;
  /** เมนูชิดซ้ายหรือขวาของปุ่ม */
  align?: 'start' | 'end';
  placeholder?: string;
  disabled?: boolean;
  /** เลือกแล้ว submit ฟอร์มทันที (แทน AutoSubmitSelect) */
  autoSubmit?: boolean;
  className?: string;
  menuClassName?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
}) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue ?? '');
  const val = controlled ? value : inner;
  const current = options.find((o) => o.value === val);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const commit = (v: string) => {
    if (!controlled) setInner(v);
    setOpen(false);
    btnRef.current?.focus();
    onChange?.(v);
    if (autoSubmit && hiddenRef.current) {
      // เขียนค่าลง hidden input ก่อน submit — ไม่รอ React render รอบถัดไป
      hiddenRef.current.value = v;
      hiddenRef.current.form?.requestSubmit();
    }
  };

  const openMenu = () => {
    if (disabled) return;
    const i = options.findIndex((o) => o.value === val);
    setActive(i >= 0 ? i : options.findIndex((o) => !o.disabled));
    setOpen(true);
  };

  // วางเมนูใต้ปุ่ม (fixed) — ที่ด้านล่างไม่พอและด้านบนมีมากกว่า → พลิกขึ้น
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const btn = btnRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const h = listRef.current?.offsetHeight ?? 0;
      const below = window.innerHeight - r.bottom;
      const up = h + 8 > below && r.top > below;
      setPos({
        ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
        ...(align === 'end' ? { right: window.innerWidth - r.right } : { left: r.left }),
        width: r.width,
      });
    };
    place();
    listRef.current?.focus({ preventScroll: true });
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, align]);

  // ปิดเมื่อคลิกนอกปุ่ม/เมนู (เมนูอยู่ใน portal เลยต้องเช็คทั้งสอง ref)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // เลื่อนเมนูให้เห็นตัวที่ active เสมอ
  useEffect(() => {
    if (!open) return;
    (listRef.current?.children[active] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const move = (from: number, dir: 1 | -1) => {
    let i = from;
    for (let n = 0; n < options.length; n += 1) {
      i = (i + dir + options.length) % options.length;
      if (!options[i].disabled) return i;
    }
    return from;
  };

  const onButtonKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openMenu();
    }
  };

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => move(a, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => move(a, -1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(move(-1, 1));
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(move(0, -1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const o = options[active];
      if (o && !o.disabled) commit(o.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    } else if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) {
      // พิมพ์ตัวแรกแล้วกระโดดไปตัวเลือกถัดไปที่ขึ้นต้นด้วยตัวนั้น
      const ch = e.key.toLowerCase();
      for (let n = 1; n <= options.length; n += 1) {
        const i = (active + n) % options.length;
        if (!options[i].disabled && options[i].label.toLowerCase().startsWith(ch)) {
          setActive(i);
          break;
        }
      }
    }
  };

  const sizeClass = size === 'sm' ? 'h-9 px-3 text-sm' : size === 'bar' ? 'h-10 px-3 text-sm font-medium' : 'px-3 py-2 leading-[1.6]';

  return (
    <>
      {name && <input ref={hiddenRef} type="hidden" name={name} value={val} />}
      <button
        ref={btnRef}
        type="button"
        id={id}
        disabled={disabled}
        // แบบ "select-only combobox" ของ WAI-ARIA — รองรับ aria-invalid/expanded
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid || undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onButtonKey}
        className={cn(
          // border จริง (ไม่ใช่ ring) ให้สูงเท่าช่องกรอกข้าง ๆ เป๊ะ
          'flex items-center gap-2 rounded-lg border text-left transition-colors',
          sizeClass,
          open ? 'bg-surface-alt' : 'bg-surface hover:bg-surface-alt',
          ariaInvalid ? 'border-danger' : 'border-line',
          disabled && 'cursor-not-allowed bg-surface-alt text-muted hover:bg-surface-alt',
          // ค่าเริ่มต้นกว้างเต็มช่องเหมือน input — ส่ง className มาเองถ้าอยากให้กว้างตามเนื้อหา (เช่น เรียงลำดับ)
          className ?? 'w-full',
        )}
      >
        {fit ? (
          // จองความกว้างเท่าข้อความยาวสุด (ซ่อนไว้) ให้ปุ่มไม่เปลี่ยนขนาดตอนสลับตัวเลือก
          <span className="grid">
            {options.map((o) => (
              <span key={o.value} aria-hidden={o.value !== val} className={cn('col-start-1 row-start-1 whitespace-nowrap', o.value !== val && 'invisible')}>
                {o.label}
              </span>
            ))}
          </span>
        ) : (
          <span className={cn('min-w-0 flex-1 truncate', !current && 'text-muted')}>{current?.label ?? placeholder ?? ''}</span>
        )}
        <ChevronDown className={cn('ml-auto size-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-label={ariaLabel}
            aria-activedescendant={`${listId}-${active}`}
            onKeyDown={onListKey}
            style={{ position: 'fixed', ...(pos ?? { top: -9999, left: 0, width: 0 }), minWidth: pos?.width }}
            className={cn('z-70 max-h-72 overflow-y-auto rounded-card bg-surface p-1.5 shadow-lg outline-none border border-line', menuClassName)}
          >
            {options.map((o, i) => {
              const on = o.value === val;
              return (
                <li
                  key={o.value}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={on}
                  aria-disabled={o.disabled || undefined}
                  onPointerMove={() => !o.disabled && setActive(i)}
                  onClick={() => !o.disabled && commit(o.value)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap',
                    i === active && !o.disabled && 'bg-surface-alt',
                    on && 'text-brand',
                    o.disabled && 'cursor-default text-muted opacity-60',
                  )}
                >
                  <span className="flex-1">{o.label}</span>
                  {on && <Check className="size-4 shrink-0" aria-hidden />}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}
