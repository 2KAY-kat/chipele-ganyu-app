
import { Router } from 'express';
import { handleUSSD } from '../controllers/ussdController';

const router = Router();

router.post('/ussd', handleUSSD);

export default router;