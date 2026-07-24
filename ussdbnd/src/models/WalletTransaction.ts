import { Schema, model, Document, Types } from 'mongoose';

export type WalletType = 'contribution' | 'disbursement' | 'fee';
export type TxDirection = 'credit' | 'debit';

export interface IWalletTransaction extends Document {
  member: Types.ObjectId;                   
  walletType: WalletType;
  direction: TxDirection;
  amount: number;
  reference: string;
  relatedContribution?: Types.ObjectId;      
  createdAt: Date;
}

const walletTransactionSchema = new Schema<IWalletTransaction>({
  member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  walletType: { type: String, enum: ['contribution', 'disbursement', 'fee'], required: true },
  direction: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true },
  reference: { type: String, required: true, unique: true },
  relatedContribution: { type: Schema.Types.ObjectId, ref: 'Contribution' },
}, { timestamps: true });

export default model<IWalletTransaction>('WalletTransaction', walletTransactionSchema);