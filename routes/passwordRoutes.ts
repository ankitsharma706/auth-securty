import express from 'express';
import { 
  listPasswords, 
  newPasswordPage, 
  createPassword, 
  searchPasswords, 
  retrievePassword,
  editPasswordPage,
  updatePassword,
  deletePassword
} from '../controllers/passwordController.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

router.use(isAuthenticated);

router.get('/', listPasswords);
router.get('/new', newPasswordPage);
router.post('/', createPassword);
router.get('/search', searchPasswords);
router.post('/retrieve', retrievePassword);
router.get('/edit/:id', editPasswordPage);
router.post('/update/:id', updatePassword);
router.post('/delete/:id', deletePassword);

export default router;
