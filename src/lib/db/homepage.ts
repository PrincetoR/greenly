import 'server-only';
import type { HeroSlide, HomePopup, Homepage } from '@/lib/types';
import { newId, nowIso, readDocument, updateDocument } from './store';

const NAME = 'homepage';

export const DEFAULT_POPUP: HomePopup = { enabled: false, image: null, title: '', body: '', href: '', width: 480, frequency: 'daily', version: '' };
export const DEFAULT_HOMEPAGE: Homepage = { slides: [], autoplaySeconds: 5, popup: DEFAULT_POPUP };

/** ผสาน default เผื่อไฟล์ยังไม่มี/ขาด field */
function merge(doc: Partial<Homepage>): Homepage {
  return {
    slides: (doc.slides ?? []).map((s) => ({ ...s, active: s.active ?? true, sortOrder: s.sortOrder ?? 0, slot: s.slot ?? 'main' })).sort((a, b) => a.sortOrder - b.sortOrder),
    autoplaySeconds: doc.autoplaySeconds ?? DEFAULT_HOMEPAGE.autoplaySeconds,
    popup: { ...DEFAULT_POPUP, ...doc.popup },
  };
}

export async function getHomepage(): Promise<Homepage> {
  return merge(await readDocument<Partial<Homepage>>(NAME, DEFAULT_HOMEPAGE));
}

export async function upsertSlide(input: Omit<HeroSlide, 'id'> & { id?: string }): Promise<HeroSlide> {
  let saved!: HeroSlide;
  await updateDocument<Homepage>(NAME, DEFAULT_HOMEPAGE, (doc) => {
    const d = merge(doc);
    if (input.id && d.slides.some((s) => s.id === input.id)) {
      saved = { ...input, id: input.id };
      return { ...d, slides: d.slides.map((s) => (s.id === input.id ? saved : s)) };
    }
    saved = { ...input, id: newId('slide') };
    return { ...d, slides: [...d.slides, saved] };
  });
  return saved;
}

export async function deleteSlide(id: string): Promise<void> {
  await updateDocument<Homepage>(NAME, DEFAULT_HOMEPAGE, (doc) => {
    const d = merge(doc);
    return { ...d, slides: d.slides.filter((s) => s.id !== id) };
  });
}

export async function saveAutoplay(seconds: number): Promise<void> {
  await updateDocument<Homepage>(NAME, DEFAULT_HOMEPAGE, (doc) => ({ ...merge(doc), autoplaySeconds: seconds }));
}

/** บันทึกป๊อปอัป — version ใหม่ทุกครั้ง ให้ลูกค้าที่เคยปิดเห็นอีกรอบ */
export async function savePopup(popup: Omit<HomePopup, 'version'>): Promise<void> {
  await updateDocument<Homepage>(NAME, DEFAULT_HOMEPAGE, (doc) => ({ ...merge(doc), popup: { ...popup, version: nowIso() } }));
}
