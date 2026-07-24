
import { Schema, model, Document, Types } from 'mongoose';


export interface IMember extends Document {
  memberId: string;
  fullName: string;
  nationalId: string;
  mobileMoneyNumber: string;
  pinHash: string;
  circles: Types.ObjectId[];   
  createdAt: Date;
}

const memberSchema = new Schema<IMember>({
  memberId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  nationalId: { type: String, required: true, unique: true },
  mobileMoneyNumber: { type: String, required: true },
  pinHash: { type: String, required: true },
  circles: [{ type: Schema.Types.ObjectId, ref: 'Circle' }], 
}, { timestamps: true });


export default model<IMember>('Member', memberSchema);

