import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clockCountdown, humanCountdown } from './datetime';

const NOW = new Date('2026-09-14T05:00:00Z');
const after = (sec: number) => new Date(NOW.getTime() + sec * 1000).toISOString();

describe('clockCountdown', () => {
  it('มีวัน → "N วัน HH:MM:SS"', () => {
    assert.equal(clockCountdown(after(86400 * 13 + 3600 * 23 + 60 * 59 + 59), NOW), '13 วัน 23:59:59');
  });
  it('ต่ำกว่าวัน → "HH:MM:SS" เติมศูนย์', () => {
    assert.equal(clockCountdown(after(3600 * 5 + 60 * 7 + 9), NOW), '05:07:09');
    assert.equal(clockCountdown(after(1), NOW), '00:00:01');
  });
  it('ถึงเวลาแล้ว → null (เหมือน humanCountdown)', () => {
    assert.equal(clockCountdown(after(0), NOW), null);
    assert.equal(humanCountdown(after(0), NOW), null);
  });
});
