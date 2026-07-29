import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const members = sqliteTable('members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  memberId: text('member_id').notNull().unique(),
  fullName: text('full_name').notNull(),
  nationalId: text('national_id').notNull().unique(),
  mobileMoneyNumber: text('mobile_money_number').notNull(),
  pinHash: text('pin_hash').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const circles = sqliteTable('circles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  code: text('code').unique(),
  cycleNumber: integer('cycle_number').notNull().default(1),
  contributionAmount: integer('contribution_amount').notNull(),
  currentPayoutIndex: integer('current_payout_index').notNull().default(0),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const circleMembers = sqliteTable('circle_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  circleId: integer('circle_id').notNull().references(() => circles.id),
  memberId: integer('member_id').notNull().references(() => members.id),
  payoutOrderIndex: integer('payout_order_index'),
  joinedAt: text('joined_at').default(sql`(datetime('now'))`),
});

export const contributions = sqliteTable('contributions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  memberId: integer('member_id').notNull().references(() => members.id),
  circleId: integer('circle_id').notNull().references(() => circles.id),
  cycleNumber: integer('cycle_number').notNull(),
  amount: integer('amount').notNull(),
  reference: text('reference').notNull().unique(),
  status: text('status').notNull().default('pending'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const walletTransactions = sqliteTable('wallet_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  memberId: integer('member_id').notNull().references(() => members.id),
  walletType: text('wallet_type').notNull(),
  direction: text('direction').notNull(),
  amount: integer('amount').notNull(),
  reference: text('reference').notNull().unique(),
  relatedContributionId: integer('related_contribution_id').references(() => contributions.id),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});