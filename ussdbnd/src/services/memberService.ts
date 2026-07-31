import { eq } from 'drizzle-orm';
import { db } from '../config/db';
import { members, circleMembers, circles } from '../db/schema';
import bcrypt from 'bcrypt';

export async function findMemberById(memberId: string) {
  return db.select().from(members).where(eq(members.memberId, memberId)).get();
}

export async function verifyMemberPin(member: typeof members.$inferSelect, pin: string): Promise<boolean> {
  return bcrypt.compare(pin, member.pinHash);
}

export async function createMember(data: {
  memberId: string;
  fullName: string;
  mobileMoneyNumber: string;
  pin: string;
}) {
  const pinHash = await bcrypt.hash(data.pin, 10);
  db.insert(members).values({
    memberId: data.memberId,
    fullName: data.fullName,
    mobileMoneyNumber: data.mobileMoneyNumber,
    pinHash,
  }).run();
  return db.select().from(members).where(eq(members.memberId, data.memberId)).get()!;
}

export async function getMemberWithCircles(memberId: string) {
  const member = db.select().from(members).where(eq(members.memberId, memberId)).get();
  if (!member) return null;

  const memberCircles = db.select({
    id: circles.id,
    name: circles.name,
    cycleNumber: circles.cycleNumber,
    contributionAmount: circles.contributionAmount,
    currentPayoutIndex: circles.currentPayoutIndex,
    status: circles.status,
    createdAt: circles.createdAt,
  })
    .from(circleMembers)
    .innerJoin(circles, eq(circleMembers.circleId, circles.id))
    .where(eq(circleMembers.memberId, member.id))
    .all();

  return { ...member, circles: memberCircles };
}