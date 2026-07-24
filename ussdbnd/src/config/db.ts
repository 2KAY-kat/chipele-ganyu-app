import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || '');
    console.log(`MongoDB Connected securely: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error}`);
    process.exit(1);
  }
};