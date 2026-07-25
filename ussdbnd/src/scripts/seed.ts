import { db } from '../config/db';
import { members, circles, circleMembers } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

async function seed() {
  const member = db.select().from(members).where(eq(members.memberId, 'MEM001')).get();
  if (!member) {
    console.error('MEM001 not found — run registration first.');
    process.exit(1);
  }

  let circle = db.select().from(circles).where(eq(circles.name, 'Circle A')).get();
  if (!circle) {
    db.insert(circles).values({
      name: 'Circle A',
      cycleNumber: 3,
      contributionAmount: 500,
      currentPayoutIndex: 0,
      status: 'active',
    }).run();
    circle = db.select().from(circles).where(eq(circles.name, 'Circle A')).get()!;
    db.insert(circleMembers).values({
      circleId: circle.id,
      memberId: member.id,
      payoutOrderIndex: 0,
    }).run();
    console.log('Circle A created with member:', circle.id);
  } else {
    const existing = db.select()
      .from(circleMembers)
      .where(and(
        eq(circleMembers.circleId, circle.id),
        eq(circleMembers.memberId, member.id)
      ))
      .get();
    if (!existing) {
      const maxResult = db.select({ max: sql<number>`COALESCE(MAX(payout_order_index), -1)` })
        .from(circleMembers)
        .where(eq(circleMembers.circleId, circle.id))
        .get();
      db.insert(circleMembers).values({
        circleId: circle.id,
        memberId: member.id,
        payoutOrderIndex: (maxResult?.max ?? -1) + 1,
      }).run();
    }
    console.log('Circle A already existed, member attached.');
  }

  console.log('Seed complete. Member', member.memberId, 'is now in Circle A');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});