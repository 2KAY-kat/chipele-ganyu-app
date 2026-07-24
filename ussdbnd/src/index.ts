
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './config/db';
import ussdRoutes from './routes/ussdRoutes';
import { ensureDefaultCircles } from './services/circleService';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/api', ussdRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const start = async () => {
  await connectDB();
  await ensureDefaultCircles(); 
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

start();