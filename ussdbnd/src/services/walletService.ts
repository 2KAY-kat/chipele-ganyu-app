import { eq, and, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { walletTransactions } from '../db/schema';

export async function getWalletBalance(memberId: number, walletType: string): Promise<number> {
  const result = db.select({
    total: sql<number>`COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0)`,
  })
    .from(walletTransactions)
    .where(and(
      eq(walletTransactions.memberId, memberId),
      eq(walletTransactions.walletType, walletType)
    ))
    .get();
  return result?.total ?? 0;
}