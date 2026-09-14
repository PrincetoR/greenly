import type { CSSProperties } from 'react';

/**
 * ตำแหน่งช่องในกริด 2 แถวที่เลื่อนข้างเป็นหน้า: เรียงซ้าย→ขวาแล้วลงแถวล่าง ทีละหน้า (หน้าละ cols×2)
 * คืน CSS vars ต่อ breakpoint (mobile / sm / lg) ให้ .hs-cell ใช้ · คอลัมน์นับต่อเนื่องข้ามหน้า (หน้า k เริ่มที่ k×cols+1)
 */
export function gridCell(i: number, cols: { m: number; s: number; l: number }): CSSProperties {
  const pos = (c: number) => {
    const page = Math.floor(i / (c * 2));
    const rem = i % (c * 2);
    return { r: Math.floor(rem / c) + 1, col: page * c + (rem % c) + 1 };
  };
  const m = pos(cols.m);
  const s = pos(cols.s);
  const l = pos(cols.l);
  return { '--r-m': m.r, '--c-m': m.col, '--r-s': s.r, '--c-s': s.col, '--r-l': l.r, '--c-l': l.col } as React.CSSProperties;
}

/** ต่อหน้า = cols × 2 แถว · snap เฉพาะช่องแรกของหน้า (ต่อ breakpoint) ให้เลื่อนทีละหน้าเต็ม ๆ ไม่ค้างครึ่งหน้า */
export function pageSnapClass(i: number, cols: { m: number; s: number; l: number }): string {
  const first = (c: number) => i % (c * 2) === 0;
  return [first(cols.m) ? 'max-sm:snap-start' : '', first(cols.s) ? 'sm:max-lg:snap-start' : '', first(cols.l) ? 'lg:snap-start' : ''].filter(Boolean).join(' ');
}

/**
 * ช่องว่างเติมหน้าสุดท้ายให้เต็ม (ไม่งั้นเลื่อนไปหน้าท้ายแล้วเห็นหน้าเดิมครึ่งหนึ่ง)
 * คืน index ของช่องเติม + class ซ่อนใน breakpoint ที่หน้าสุดท้ายเต็มอยู่แล้ว (จำนวนช่องต่อหน้าต่างกันแต่ละจอ)
 */
export function pageFillers(n: number, cols: { m: number; s: number; l: number }): { i: number; className: string }[] {
  const need = (c: number) => Math.ceil(n / (c * 2)) * (c * 2);
  const max = Math.max(need(cols.m), need(cols.s), need(cols.l));
  const out: { i: number; className: string }[] = [];
  for (let i = n; i < max; i++) {
    const cls = [i >= need(cols.m) ? 'max-sm:hidden' : '', i >= need(cols.s) ? 'sm:max-lg:hidden' : '', i >= need(cols.l) ? 'lg:hidden' : ''].filter(Boolean).join(' ');
    out.push({ i, className: cls });
  }
  return out;
}
