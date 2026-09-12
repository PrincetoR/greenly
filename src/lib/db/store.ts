import 'server-only';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

/**
 * "ฐานข้อมูล" ของ prototype = ไฟล์ JSON ใน data/
 * ไฟล์นี้เป็นชั้นเดียวที่แตะ filesystem — โมดูลใน lib/db/ อื่น ๆ เรียกผ่านที่นี่เท่านั้น
 * วันที่ย้ายไป DB จริง แก้เฉพาะโฟลเดอร์ lib/db/ ส่วน UI/actions ไม่ต้องเปลี่ยน
 *
 * การเขียนทำแบบ read-modify-write ต่อคิวต่อไฟล์ เพื่อไม่ให้สอง action ที่มาพร้อมกันเขียนทับกัน
 * และเขียนลง .tmp ก่อนแล้ว rename เพื่อไม่ให้ไฟล์เสียถ้าโปรเซสตายกลางทาง
 */

const DATA_DIR = path.join(process.cwd(), 'data');

const queues = new Map<string, Promise<unknown>>();

function fileOf(name: string): string {
  return path.join(DATA_DIR, `${name}.json`);
}

async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(fileOf(name), 'utf8');
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw err;
  }
}

async function writeJson(name: string, value: unknown): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const target = fileOf(name);
  const tmp = `${target}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8');
  await rename(tmp, target);
}

/** ต่อคิวงานเขียนของไฟล์เดียวกันให้ทำทีละงาน */
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
 * ใช้กับทุกการเขียน (เพิ่ม/แก้/ลบ) เพื่อให้ผ่านคิวเดียวกันเสมอ
 */
export async function updateCollection<T>(
  name: string,
  fn: (items: T[]) => T[] | Promise<T[]>,
): Promise<T[]> {
  return enqueue(name, async () => {
    const items = await readJson<T[]>(name, []);
    const next = await fn(items);
    await writeJson(name, next);
    return next;
  });
}

/** เอกสารเดี่ยว (เช่น settings) */
export async function readDocument<T>(name: string, fallback: T): Promise<T> {
  return readJson<T>(name, fallback);
}

export async function updateDocument<T>(
  name: string,
  fallback: T,
  fn: (doc: T) => T | Promise<T>,
): Promise<T> {
  return enqueue(name, async () => {
    const doc = await readJson<T>(name, fallback);
    const next = await fn(doc);
    await writeJson(name, next);
    return next;
  });
}

/** id อ่านง่ายในไฟล์ JSON: "p-k3j9x2ab" */
export function newId(prefix: string): string {
  return `${prefix}-${randomBytes(5).toString('base64url').toLowerCase().slice(0, 8)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
