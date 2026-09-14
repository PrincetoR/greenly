/** เปลือกหน้าพิมพ์ (ใบปะหน้า) — ไม่มี header/aside ของหลังบ้าน ให้พิมพ์ได้สะอาด · สิทธิ์ตรวจในหน้าเอง (proxy กันชั้นแรกแล้ว) */
export default function PrintLayout({ children }: LayoutProps<'/admin'>) {
  return <div className="min-h-dvh bg-page print:bg-white">{children}</div>;
}
