import Link from 'next/link';
import { requirePermission } from '@/lib/auth/session';
import { getHomepage } from '@/lib/db/homepage';
import { deleteSlide, updateAutoplay } from '@/lib/actions/homepage';
import { PageHeader } from '@/components/admin/page-header';
import { PopupForm, SlideForm } from '@/components/admin/homepage-forms';
import { ProductImage } from '@/components/product-image';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Button, buttonStyles } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { formatDateTime } from '@/lib/datetime';

export const metadata = { title: 'หน้าแรก' };

const SAVED: Record<string, string> = { slide: 'บันทึกสไลด์แล้ว', deleted: 'ลบสไลด์แล้ว', autoplay: 'บันทึกเวลาเลื่อนสไลด์แล้ว', popup: 'บันทึกป๊อปอัปแล้ว' };

/** หน้าแรก = สไลด์แบนเนอร์ด้านบน + ป๊อปอัปตอนเข้าเว็บ — ทั้งหมดมีผลทันทีที่บันทึก */
export default async function HomepageAdminPage({ searchParams }: PageProps<'/admin/homepage'>) {
  await requirePermission('settings.manage');
  const sp = await searchParams;
  const home = await getHomepage();
  const editing = typeof sp.edit === 'string' ? home.slides.find((s) => s.id === sp.edit) : undefined;

  return (
    <div>
      <PageHeader
        title="หน้าแรก"
        description="สไลด์แบนเนอร์ด้านบนของหน้าแรก และป๊อปอัปที่เด้งตอนลูกค้าเข้าเว็บ"
        action={
          <Link href="/" target="_blank" className={buttonStyles({ variant: 'secondary' })}>
            เปิดหน้าแรก
          </Link>
        }
      />
      {typeof sp.saved === 'string' && SAVED[sp.saved] && <Alert tone="ok" className="mb-4">{SAVED[sp.saved]}</Alert>}

      <div className="flex flex-col gap-3">
        <Card>
          <CardHeader
            title={`สไลด์แบนเนอร์ (${home.slides.length})`}
            description="แบบ Shopee: card ขาวเต็มความกว้าง ซ้ายสไลด์ใหญ่เลื่อนเอง ขวาภาพเล็ก 2 ช่อง · ไม่มีสไลด์ = แสดงชื่อร้านกับสโลแกนแทน"
            action={
              <form action={updateAutoplay} className="flex flex-wrap items-center gap-2 text-sm">
                <label htmlFor="autoplaySeconds" className="text-muted whitespace-nowrap">
                  เลื่อนทุก
                </label>
                <input id="autoplaySeconds" name="autoplaySeconds" type="number" min={0} max={60} defaultValue={home.autoplaySeconds} className="h-9! w-20!" />
                <span className="text-muted">วินาที (0 = ไม่เลื่อนเอง)</span>
                <Button type="submit" variant="secondary" size="sm">
                  บันทึก
                </Button>
              </form>
            }
          />
          {home.slides.length === 0 ? (
            <p className="p-5 text-sm text-muted">ยังไม่มีสไลด์ — เพิ่มด้านล่าง</p>
          ) : (
            <ul className="divide-y divide-line">
              {home.slides.map((s, i) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3 sm:gap-4">
                  <span className="w-5 text-center text-sm font-bold text-muted tabular-nums">{i + 1}</span>
                  <ProductImage src={s.image} alt="" className="h-12 w-28 shrink-0 rounded-md aspect-auto! sm:h-14 sm:w-36" />
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="truncate font-medium">{s.title || <span className="text-muted">(ไม่มีหัวข้อ)</span>}</p>
                    <p className="truncate text-xs text-muted">
                      {s.subtitle && `${s.subtitle} · `}
                      {s.href ? (
                        <>
                          คลิกไป <span className="font-mono">{s.href}</span>
                          {s.buttonLabel && ` · ปุ่ม "${s.buttonLabel}"`}
                        </>
                      ) : (
                        'ไม่มีลิงก์'
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-muted">ลำดับ {s.sortOrder}</span>
                  <Badge tone={s.slot === 'side' ? 'info' : 'brand'}>{s.slot === 'side' ? 'ภาพเล็กขวา' : 'สไลด์ใหญ่'}</Badge>
                  {s.active ? <Badge tone="ok">แสดง</Badge> : <Badge>ซ่อน</Badge>}
                  <Link href={`/admin/homepage?edit=${s.id}`} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                    แก้ไข
                  </Link>
                  <form action={deleteSlide}>
                    <input type="hidden" name="id" value={s.id} />
                    <ConfirmButton variant="danger" size="sm" message={`ลบสไลด์ "${s.title || s.id}"?`}>
                      ลบ
                    </ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title={editing ? `แก้ไขสไลด์ "${editing.title || editing.id}"` : 'เพิ่มสไลด์ใหม่'} />
          <div className="p-5">
            <SlideForm key={editing?.id ?? 'new'} slide={editing} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="ป๊อปอัปตอนเข้าเว็บ"
            description={home.popup.enabled ? `เปิดอยู่ · กว้าง ${home.popup.width}px · ${home.popup.frequency === 'once' ? 'ครั้งเดียว' : home.popup.frequency === 'daily' ? 'วันละครั้ง' : 'ทุกครั้ง'}${home.popup.version ? ` · แก้ล่าสุด ${formatDateTime(home.popup.version)}` : ''}` : 'ปิดอยู่'}
          />
          <div className="p-5">
            <PopupForm popup={home.popup} />
          </div>
        </Card>
      </div>
    </div>
  );
}
