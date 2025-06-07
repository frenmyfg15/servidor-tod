import { Router } from 'express'
import {
  loginUser,
  logoutUser,
  registerUser,
  getMe,
  sendCode,
  verifyCodeAndRegister,
} from '../controllers/auth.controller'

const router = Router()

router.post('/register', registerUser)
router.post('/login', loginUser)
router.post('/logout', logoutUser)
router.get('/me', getMe)

// ✅ estos son controladores tipo RequestHandler
router.post('/send-code', sendCode)
router.post('/verify-code', verifyCodeAndRegister)

export default router
