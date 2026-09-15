import 'server-only';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

/**
 * "ฐานข้อมูล" ของ prototype = collection JSON — ชั้นเดียวที่แตะที่เก็บข้อมูล โมดูลใน lib/db/ อื่น ๆ เรียกผ่านที่นี่เท่านั้น
 *
 * 2 driver เลือกอัตโนมัติ:
 *  - ไฟล์ `data/*.json` (รันในเครื่อง) — read-modify-write ต่อคิวต่อไฟล์ เขียน .tmp แล้ว rename กันไฟล์เสีย
 *  - Postgres (Neon, มี `DATABASE_URL`) — Vercel เขียนไฟล์ในโปรเจกต์ไม่ได้ (EROFS) จึงเก็บทั้ง collection เป็น jsonb แถวเดียวต่อชื่อ
 *    ตาราง `collections(name, data, updated_at)` สร้างเองครั้งแรก · **อ่านไม่เจอแถว = ใช้ไฟล์ seed ใน data/ แทน** (deploy ครั้งแรกมีข้อมูลสาธิตทันที
 *    เขียนครั้งแรกค่อยย้ายทั้ง collection ขึ้น DB) · cache ต่อ instance ตรวจด้วย updated_at (query เวอร์ชันเล็ก ๆ ครั้งเดียวต่อวินาที) — ดึง jsonb ก้อนใหญ่เฉพาะตอนเปลี่ยน
 */

const DATA_DIR = path.join(process.cwd(), 'data');
const queues = new Map<string, Promise<unknown>>();

function fileOf(name: string): string {
  return path.join(DATA_DIR, `${name}.json`);
}

/* ---------- driver: ไฟล์ ---------- */

async function readFileJson<T>(name: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(fileOf(name), 'utf8');
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw err;
  }
}

async function writeFileJson(name: string, value: unknown): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const target = fileOf(name);
  const tmp = `${target}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8');
  await rename(tmp, target);
}

/* ---------- driver: Postgres (Neon HTTP) ---------- */

const DATABASE_URL = process.env.DATABASE_URL;
/** เวอร์ชัน (updated_at ทุก collection) จำไว้ 1 วินาที — หน้าเดียวอ่านหลาย collection พร้อมกันจะยิง query เวอร์ชันแค่ครั้งเดียว */
const VERSIONS_MS = 1000;
let sqlClient: ReturnType<typeof neon> | null = null;
let ready: Promise<void> | null = null;
/** ข้อมูลต่อ instance — ใช้ซ้ำได้ตราบใดที่ updated_at ใน DB ยังเท่าเดิม (ไม่ต้องดึง jsonb ก้อนใหญ่ทุก request) */
const cache = new Map<string, { data: unknown; updatedAt: string }>();
let versions: { at: number; map: Map<string, string> } | null = null;
const inflight = new Map<string, Promise<unknown>>();

function sql() {
  if (!sqlClient) sqlClient = neon(DATABASE_URL!);
  return sqlClient;
}

/** สร้างตารางครั้งแรก (idempotent) — memoize ให้ยิงครั้งเดียวต่อ instance */
function ensureTable(): Promise<void> {
  if (!ready) {
    ready = sql()`CREATE TABLE IF NOT EXISTS collections (name text PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`
      .then(() => undefined)
      .catch((e) => {
        ready = null;
        throw e;
      });
  }
  return ready;
}

/** updated_at ของทุก collection ใน query เดียว (แถวเล็ก ๆ ไม่กี่แถว) */
async function getVersions(fresh = false): Promise<Map<string, string>> {
  if (!fresh && versions && Date.now() - versions.at < VERSIONS_MS) return versions.map;
  const rows = (await sql()`SELECT name, updated_at FROM collections`) as { name: string; updated_at: string }[];
  versions = { at: Date.now(), map: new Map(rows.map((r) => [r.name, String(r.updated_at)])) };
  return versions.map;
}

async function readPgJson<T>(name: string, fallback: T, fresh = false): Promise<T> {
  await ensureTable();
  const ver = (await getVersions(fresh)).get(name);
  // ไม่มีแถว = ยังไม่เคยเขียน → ใช้ไฟล์ seed ที่ bundle มากับโปรเจกต์
  if (ver === undefined) return readFileJson(name, fallback);
  const hit = cache.get(name);
  if (hit && hit.updatedAt === ver) return hit.data as T;
  // หลายที่ในหน้าเดียวอ่าน collection เดียวกันพร้อมกัน (เช่น orders) → ดึงครั้งเดียวแล้วแบ่งกัน
  let job = inflight.get(name) as Promise<T> | undefined;
  if (!job) {
    job = (async () => {
      const rows = (await sql()`SELECT data, updated_at FROM collections WHERE name = ${name}`) as { data: T; updated_at: string }[];
      if (rows.length === 0) return readFileJson(name, fallback);
      cache.set(name, { data: rows[0].data, updatedAt: String(rows[0].updated_at) });
      return rows[0].data;
    })();
    inflight.set(name, job);
    job.finally(() => inflight.delete(name)).catch(() => undefined);
  }
  return job;
}

async function writePgJson(name: string, value: unknown): Promise<void> {
  await ensureTable();
  const json = JSON.stringify(value);
  const rows = (await sql()`INSERT INTO collections (name, data, updated_at) VALUES (${name}, ${json}::jsonb, now())
    ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data, updated_at = now() RETURNING updated_at`) as { updated_at: string }[];
  const updatedAt = String(rows[0]?.updated_at ?? new Date().toISOString());
  cache.set(name, { data: value, updatedAt });
  // เวอร์ชันที่จำไว้ล้าสมัยแล้ว — อ่านครั้งถัดไปดึงใหม่ (instance อื่นจะเห็นผ่าน updated_at เช่นกัน)
  if (versions) versions.map.set(name, updatedAt);
}

/* ---------- เลือก driver ---------- */

const readJson = <T,>(name: string, fallback: T, fresh = false): Promise<T> => (DATABASE_URL ? readPgJson(name, fallback, fresh) : readFileJson(name, fallback));
const writeJson = DATABASE_URL ? writePgJson : writeFileJson;

/** ต่อคิวงานเขียนของ collection เดียวกันให้ทำทีละงาน (ใน instance นี้) */
function enqueue<T>(name: string, job: () => Promise<T>): Promise<T> {
  const prev = queues.get(name) ?? Promise.resolve();
  const next = prev.then(job, job);
  queues.set(name, next.catch(() => undefined));
  return next;
}

export async function readCollection<T>(name: string): Promise<T[]> {
  return readJson<T[]>(name, []);
}

/**
 * แก้ไข collection แบบ atomic — fn รับ array ปัจจุบัน คืน array ใหม่
 * ใช้กับทุกการเขียน (เพิ่ม/แก้/ลบ) เพื่อให้ผ่านคิวเดียวกันเสมอ · บน DB อ่านสดก่อนเขียนเสมอ (ข้าม cache) กันทับของ instance อื่น
 */
export async function updateCollection<T>(name: string, fn: (items: T[]) => T[] | Promise<T[]>): Promise<T[]> {
  return enqueue(name, async () => {
    // fresh = เช็คเวอร์ชันสดจาก DB ก่อนเขียน (ข้าม cache 1 วิ) กันทับของ instance อื่น
    const items = await readJson<T[]>(name, [], true);
    const next = await fn(items);
    await writeJson(name, next);
    return next;
  });
}

/** เอกสารเดี่ยว (เช่น settings) */
export async function readDocument<T>(name: string, fallback: T): Promise<T> {
  return readJson<T>(name, fallback);
}

export async function updateDocument<T>(name: string, fallback: T, fn: (doc: T) => T | Promise<T>): Promise<T> {
  return enqueue(name, async () => {
    const doc = await readJson<T>(name, fallback, true);
    const next = await fn(doc);
    await writeJson(name, next);
    return next;
  });
}

/** ใช้ที่เก็บข้อมูลแบบไหนอยู่ — โชว์ในหลังบ้าน/ใช้ตัดสินใจเรื่องอัปโหลด */
export const STORAGE_DRIVER: 'file' | 'postgres' = DATABASE_URL ? 'postgres' : 'file';

/** id อ่านง่ายในไฟล์ JSON: "p-k3j9x2ab" */
export function newId(prefix: string): string {
  return `${prefix}-${randomBytes(5).toString('base64url').toLowerCase().slice(0, 8)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
