import { Router } from 'express';
import { signup, verify, logout, signin } from '../controllers/AuthController.js';
import { authenticateToken } from '../middlewares/AuthMiddleware.js';

const router = Router();

router.post('/signup', signup);
router.get('/verify', verify);
router.get('/signin', signin);
router.post('/logout', authenticateToken, logout);


export default router;