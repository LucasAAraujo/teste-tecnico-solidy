import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { registerHandler, loginHandler, meHandler } from './auth.controller';

const router = Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.get('/me', authenticate, meHandler);

export default router;
