import { eq, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { members, contributions } from '../db/schema';

export async function generateMemberId(): Promise<string> {
  const result = db.select({ count: sql<number>`COUNT(*)` }).from(members).get();
  const next = (result?.count ?? 0) + 1;
  const padded = String(next).padStart(3, '0');
  const candidate = `MEM${padded}`;

  const exists = db.select().from(members).where(eq(members.memberId, candidate)).get();
  if (exists) {
    return generateFallbackMemberId();
  }

  return candidate;
}

async function generateFallbackMemberId(): Promise<string> {
  let candidate: string;
  let exists;
  do {
    const rand = Math.floor(Math.random() * 9000 + 1000);
    candidate = `MEM${rand}`;
    exists = db.select().from(members).where(eq(members.memberId, candidate)).get();
  } while (exists);
  return candidate;
}

export async function generateReference(): Promise<string> {
  let candidate: string;
  let exists;
  do {
    const rand = Math.floor(Math.random() * 9000 + 1000);
    candidate = `RCC-${rand}`;
    exists = db.select().from(contributions).where(eq(contributions.reference, candidate)).get();
  } while (exists);
  return candidate;
}