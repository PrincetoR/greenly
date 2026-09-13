'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { ProductImage } from '@/components/product-image';

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];

  return (
    <div>
      <div className="overflow-hidden rounded-card border border-line">
        <ProductImage src={current} alt={alt} priority />
      </div>
      {images.length > 1 && (
        <ul className="-mx-1 mt-2 flex gap-2 overflow-x-auto p-1 scrollbar-none">
          {images.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`รูปที่ ${i + 1}`}
                aria-current={i === index}
                className={cn('block size-16 overflow-hidden rounded-lg ring-2 transition-colors', i === index ? 'ring-brand' : 'ring-line hover:ring-muted')}
              >
                <ProductImage src={src} alt="" className="size-16" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
