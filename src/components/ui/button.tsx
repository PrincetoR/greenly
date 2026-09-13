import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover',
  accent: 'bg-accent text-white hover:brightness-95',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-alt',
  ghost: 'text-ink hover:bg-surface-alt',
  danger: 'bg-danger-soft text-danger hover:bg-danger hover:text-white',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

/** ใช้กับ <Link> หรือ element อื่นที่อยากให้หน้าตาเป็นปุ่ม */
export function buttonStyles(opts: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    'inline-flex shrink-0 items-center justify-center rounded-lg font-semibold whitespace-nowrap transition-colors',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANT[opts.variant ?? 'primary'],
    SIZE[opts.size ?? 'md'],
    opts.className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant, size, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...rest} />;
}
