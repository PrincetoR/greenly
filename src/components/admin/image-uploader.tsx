'use client';

import { useRef, useState, useTransition } from 'react';
import { uploadImage } from '@/lib/actions/upload';
import { ProductImage } from '@/components/product-image';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Trash2 } from 'lucide-react';

/**
 * อัปโหลดรูปหลายรูป — รูปแรกในลิสต์คือรูปปก
 * ส่งค่ากลับให้ฟอร์มผ่าน <input type="hidden" name="images"> หลายตัว
 */
export function ImageUploader({ initial, max = 6, name = 'images' }: { initial: string[]; max?: number; /** ชื่อ field ใน FormData */ name?: string }) {
  const [images, setImages] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = max - images.length;
    const picked = Array.from(files).slice(0, Math.max(room, 0));
    if (picked.length < files.length) setError(`ใส่รูปได้สูงสุด ${max} รูป`);
    else setError(null);

    start(async () => {
      for (const file of picked) {
        const fd = new FormData();
        fd.set('file', file);
        const res = await uploadImage(fd);
        if (res.ok) setImages((prev) => [...prev, res.path]);
        else setError(res.error);
      }
      if (inputRef.current) inputRef.current.value = '';
    });
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  return (
    <div>
      {images.map((src) => (
        <input key={src} type="hidden" name={name} value={src} />
      ))}

      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {images.map((src, i) => (
          <li key={src} className="group relative overflow-hidden rounded-lg border border-line">
            <ProductImage src={src} alt={`รูปที่ ${i + 1}`} />
            {i === 0 && max > 1 && (
              <span className="absolute top-1 left-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">รูปปก</span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-ink/60 p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <IconBtn label="เลื่อนไปซ้าย" onClick={() => move(i, i - 1)} disabled={i === 0}>
                <ChevronLeft className="size-4" aria-hidden />
              </IconBtn>
              <IconBtn label="ลบรูป" onClick={() => setImages((p) => p.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" aria-hidden />
              </IconBtn>
              <IconBtn label="เลื่อนไปขวา" onClick={() => move(i, i + 1)} disabled={i === images.length - 1}>
                <ChevronRight className="size-4" aria-hidden />
              </IconBtn>
            </div>
          </li>
        ))}

        {images.length < max && (
          <li>
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line text-muted transition-colors hover:border-brand hover:text-brand">
              <span aria-hidden>{pending ? <Loader2 className="size-7 animate-spin" /> : <ImagePlus className="size-7" />}</span>
              <span className="text-xs">{pending ? 'กำลังอัปโหลด' : 'เพิ่มรูป'}</span>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="sr-only"
                disabled={pending}
                onChange={(e) => onFiles(e.target.files)}
              />
            </label>
          </li>
        )}
      </ul>

      <p className="mt-2 text-xs text-muted">
        JPG / PNG / WebP / GIF ไม่เกิน 5 MB{max > 1 ? ` · สูงสุด ${max} รูป · รูปแรกจะเป็นรูปปก (ชี้ที่รูปเพื่อจัดลำดับ)` : ' · 1 รูป (สี่เหลี่ยมจัตุรัสจะพอดีที่สุด)'}
      </p>
      {error && (
        <p className="mt-1 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button size="sm" variant="ghost" aria-label={label} onClick={onClick} disabled={disabled} className="h-7 px-2 text-white hover:bg-white/20">
      {children}
    </Button>
  );
}
