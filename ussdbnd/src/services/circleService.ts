import { eq, and, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { circles, circleMembers, contributions, walletTransactions, members } from '../db/schema';
import { generateReference } from '../utils/referenceGenerator';

export const DEFAULT_CIRCLES = [
  { name: 'Circle A', contributionAmount: 500 },
  { name: 'Circle B', contributionAmount: 1000 },
  { name: 'Circle C', contributionAmount: 2000 },
  { name: 'Circle D', contributionAmount: 5000 },
  { name: 'Circle E', contributionAmount: 10000 },
];

export async function ensureDefaultCircles(): Promise<void> {
  for (const def of DEFAULT_CIRCLES) {
    const exists = db.select().from(circles).where(eq(circles.name, def.name)).get();
    if (!exists) {
      db.insert(circles).values({
        name: def.name,
        cycleNumber: 1,
        contributionAmount: def.contributionAmount,
        currentPayoutIndex: 0,
        status: 'active',
      }).run();
      console.log(`Created default circle: ${def.name} (MK${def.contributionAmount})`);
    }
  }
}

export async function findCircleById(circleId: number) {
  return db.select().from(circles).where(eq(circles.id, circleId)).get();
}

export async function getAllCircles() {
  return db.select().from(circles).orderBy(circles.contributionAmount).all();
}

export async function getCircleWithPayoutOrder(circleId: number) {
  const circle = db.select().from(circles).where(eq(circles.id, circleId)).get();
  if (!circle) return null;

  const payoutOrder = db.select({
    id: members.id,
    memberId: members.memberId,
    fullName: members.fullName,
  })
    .from(circleMembers)
    .innerJoin(members, eq(circleMembers.memberId, members.id))
    .where(eq(circleMembers.circleId, circleId))
    .orderBy(circleMembers.payoutOrderIndex)
    .all();

  return { ...circle, payoutOrder };
}

export async function getMemberCount(circleId: number): Promise<number> {
  const result = db.select({ count: sql<number>`COUNT(*)` })
    .from(circleMembers)
    .where(eq(circleMembers.circleId, circleId))
    .get();
  return result?.count ?? 0;
}

export async function countCompletedContributions(
  circleId: number,
  cycleNumber: number
): Promise<number> {
  const result = db.select({ count: sql<number>`COUNT(*)` })
    .from(contributions)
    .where(and(
      eq(contributions.circleId, circleId),
      eq(contributions.cycleNumber, cycleNumber),
      eq(contributions.status, 'completed')
    ))
    .get();
  return result?.count ?? 0;
}

export async function isMemberInCircle(circleId: number, memberId: number): Promise<boolean> {
  const row = db.select()
    .from(circleMembers)
    .where(and(
      eq(circleMembers.circleId, circleId),
      eq(circleMembers.memberId, memberId)
    ))
    .get();
  return !!row;
}

export async function joinCircle(circleId: number, memberId: number): Promise<void> {
  const already = await isMemberInCircle(circleId, memberId);
  if (already) return;

  const maxIndex = db.select({ max: sql<number>`COALESCE(MAX(payout_order_index), -1)` })
    .from(circleMembers)
    .where(eq(circleMembers.circleId, circleId))
    .get();

  db.insert(circleMembers).values({
    circleId,
    memberId,
    payoutOrderIndex: (maxIndex?.max ?? -1) + 1,
  }).run();
}

export async function checkAndProcessPayout(
  circleId: number
): Promise<{ recipientMemberId: string; amount: number; reference: string } | null> {
  const reference = await generateReference();

  return db.transaction((tx) => {
    const circle = tx.select().from(circles).where(eq(circles.id, circleId)).get();
    if (!circle) return null;

    const mCount = tx.select({ count: sql<number>`COUNT(*)` })
      .from(circleMembers)
      .where(eq(circleMembers.circleId, circleId))
      .get()?.count ?? 0;
    if (mCount === 0) return null;

    const paidCount = tx.select({ count: sql<number>`COUNT(*)` })
      .from(contributions)
      .where(and(
        eq(contributions.circleId, circleId),
        eq(contributions.cycleNumber, circle.cycleNumber),
        eq(contributions.status, 'completed')
      ))
      .get()?.count ?? 0;
    if (paidCount < mCount) return null;

    const payoutOrder = tx.select({
      id: members.id,
      memberId: members.memberId,
    })
      .from(circleMembers)
      .innerJoin(members, eq(circleMembers.memberId, members.id))
      .where(eq(circleMembers.circleId, circleId))
      .orderBy(circleMembers.payoutOrderIndex)
      .all();

    const recipient = payoutOrder[circle.currentPayoutIndex];
    if (!recipient) return null;

    const poolResult = tx.select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(contributions)
      .where(and(
        eq(contributions.circleId, circleId),
        eq(contributions.cycleNumber, circle.cycleNumber),
        eq(contributions.status, 'completed')
      ))
      .get();
    const poolAmount = poolResult?.total ?? 0;

    tx.insert(walletTransactions).values({
      memberId: recipient.id,
      walletType: 'disbursement',
      direction: 'credit',
      amount: poolAmount,
      reference,
    }).run();

    const newIndex = (circle.currentPayoutIndex + 1) % payoutOrder.length;
    tx.update(circles)
      .set({ currentPayoutIndex: newIndex, cycleNumber: circle.cycleNumber + 1 })
      .where(eq(circles.id, circleId))
      .run();

    return { recipientMemberId: recipient.memberId, amount: poolAmount, reference };
  });
}

export async function createCustomCycle(
  name: string,
  contributionAmount: number,
  code: string
): Promise<number> {
  const result = db.insert(circles).values({
    name,
    code,
    contributionAmount,
    cycleNumber: 1,
    currentPayoutIndex: 0,
    status: 'active',
  }).returning({ id: circles.id }).get();

  return result.id;
}

export async function findCircleByCode(code: string) {
  return db.select().from(circles).where(eq(circles.code, code)).get();
}
