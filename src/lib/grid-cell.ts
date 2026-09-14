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
