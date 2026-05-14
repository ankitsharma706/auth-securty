import express from 'express';
import { 
    registerPage, 
    loginPage, 
    register, 
    login, 
    logout,
    setup2FA,
    verifySetup2FA,
    verifyLogin2FAPage,
    verifyLogin2FA,
    disable2FA
} from '../controllers/authController.js';
import { isNotAuthenticated, isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

router.get('/register', isNotAuthenticated, registerPage);
router.post('/register', isNotAuthenticated, register);
router.get('/login', isNotAuthenticated, loginPage);
router.post('/login', isNotAuthenticated, login);
router.get('/logout', logout);

// 2FA Routes
router.get('/2fa/setup', isAuthenticated, setup2FA);
router.post('/2fa/verify', isAuthenticated, verifySetup2FA);
router.get('/2fa/verify-login', verifyLogin2FAPage);
router.post('/2fa/verify-login', verifyLogin2FA);
router.post('/2fa/disable', isAuthenticated, disable2FA);

export default router;
