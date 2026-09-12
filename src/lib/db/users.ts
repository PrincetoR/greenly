import 'server-only';
import type { User } from '@/lib/types';
import { newId, nowIso, readCollection, updateCollection } from './store';

const NAME = 'users';

export async function listUsers(): Promise<User[]> {
  const items = await readCollection<User>(NAME);
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function findUser(id: string): Promise<User | undefined> {
  return (await readCollection<User>(NAME)).find((u) => u.id === id);
}

export async function findUserByUsername(username: string): Promise<User | undefined> {
  const needle = username.trim().toLowerCase();
  return (await readCollection<User>(NAME)).find((u) => u.username.toLowerCase() === needle);
}

export async function createUser(input: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  const user: User = { id: newId('u'), ...input, createdAt: nowIso() };
  await updateCollection<User>(NAME, (items) => [...items, user]);
  return user;
}

export async function updateUser(
  id: string,
  patch: Partial<Omit<User, 'id' | 'createdAt'>>,
): Promise<User | undefined> {
  let updated: User | undefined;
  await updateCollection<User>(NAME, (items) =>
    items.map((u) => {
      if (u.id !== id) return u;
      updated = { ...u, ...patch };
      return updated;
    }),
  );
  return updated;
}
