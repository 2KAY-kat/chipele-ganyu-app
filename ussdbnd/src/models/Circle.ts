
import { Schema, model, Document, Types } from 'mongoose';
export interface ICircle extends Document {
  name: string;            
  cycleNumber: number;
  contributionAmount: number;
  members: Types.ObjectId[];
  payoutOrder: Types.ObjectId[]; 
  currentPayoutIndex: number;
  status: 'active' | 'completed';
}

const circleSchema = new Schema<ICircle>({
  name: { type: String, required: true },
  cycleNumber: { type: Number, default: 1 },
  contributionAmount: { type: Number, required: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'Member' }],
  payoutOrder: [{ type: Schema.Types.ObjectId, ref: 'Member' }],
  currentPayoutIndex: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
}, { timestamps: true });

export default model<ICircle>('Circle', circleSchema);