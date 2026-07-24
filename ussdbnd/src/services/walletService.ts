import { Types } from 'mongoose';
import WalletTransaction, { WalletType } from '../models/WalletTransaction';

export async function getWalletBalance(memberId: string, walletType: WalletType): Promise<number> {
  const result = await WalletTransaction.aggregate([
    { $match: { member: new Types.ObjectId(memberId), walletType } },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $cond: [{ $eq: ['$direction', 'credit'] }, '$amount', { $multiply: ['$amount', -1] }],
          },
        },
      },
    },
  ]);
  return result[0]?.total ?? 0;
}