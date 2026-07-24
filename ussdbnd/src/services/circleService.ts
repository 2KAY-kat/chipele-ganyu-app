
import Circle, { ICircle } from '../models/Circle';
import Contribution from '../models/Contribution';
import WalletTransaction from '../models/WalletTransaction';
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
    const exists = await Circle.findOne({ name: def.name });
    if (!exists) {
      await Circle.create({
        name: def.name,
        cycleNumber: 1,
        contributionAmount: def.contributionAmount,
        members: [],
        payoutOrder: [],
        currentPayoutIndex: 0,
        status: 'active',
      });
      console.log(`Created default circle: ${def.name} (MK${def.contributionAmount})`);
    }
  }
}

export async function findCircleById(circleId: string): Promise<ICircle | null> {
  return Circle.findById(circleId);
}

export async function getAllCircles(): Promise<ICircle[]> {
  return Circle.find().sort({ contributionAmount: 1 });
}

export async function getCircleWithPayoutOrder(circle: ICircle): Promise<ICircle> {
  await circle.populate('payoutOrder');
  return circle;
}

export async function countCompletedContributions(
  circleId: string,
  cycleNumber: number
): Promise<number> {
  return Contribution.countDocuments({
    circle: circleId,
    cycleNumber,
    status: 'completed',
  });
}

export async function isMemberInCircle(circle: ICircle, memberObjectId: any): Promise<boolean> {
  return circle.members.some((id: any) => id.equals(memberObjectId));
}


export async function joinCircle(circle: ICircle, memberObjectId: any): Promise<void> {
  if (await isMemberInCircle(circle, memberObjectId)) return;
  circle.members.push(memberObjectId);
  circle.payoutOrder.push(memberObjectId);
  await circle.save();
}


export async function checkAndProcessPayout(
  circleId: string
): Promise<{ recipientMemberId: string; amount: number; reference: string } | null> {
  const circle = await Circle.findById(circleId);
  if (!circle || circle.members.length === 0) return null;

  const paidCount = await countCompletedContributions(circle._id.toString(), circle.cycleNumber);
  if (paidCount < circle.members.length) return null;

  await circle.populate('payoutOrder');
  const recipient: any = circle.payoutOrder[circle.currentPayoutIndex];
  if (!recipient) return null;

  const pool = await Contribution.aggregate([
    { $match: { circle: circle._id, cycleNumber: circle.cycleNumber, status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const poolAmount = pool[0]?.total ?? 0;

  const reference = await generateReference();

  await WalletTransaction.create({
    member: recipient._id,
    walletType: 'disbursement',
    direction: 'credit',
    amount: poolAmount,
    reference,
  });

  circle.currentPayoutIndex = (circle.currentPayoutIndex + 1) % circle.payoutOrder.length;
  circle.cycleNumber += 1;
  await circle.save();
  return { recipientMemberId: recipient.memberId, amount: poolAmount, reference };
}