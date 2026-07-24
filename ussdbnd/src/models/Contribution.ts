import { Schema, model, Document, Types } from 'mongoose';

export interface IContribution extends Document {
  member: Types.ObjectId;      
  circle: Types.ObjectId;     
  cycleNumber: number;
  amount: number;
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

const contributionSchema = new Schema<IContribution>({
  member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },  
  circle: { type: Schema.Types.ObjectId, ref: 'Circle', required: true },
  cycleNumber: { type: Number, required: true },
  amount: { type: Number, required: true },
  reference: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
}, { timestamps: true });

export default model<IContribution>('Contribution', contributionSchema);