import { Request, Response, RequestHandler } from 'express'
import { loginService, registerService } from '../services/auth.service'
import { signToken, verifyToken } from '../utils/jwt'
import { prisma } from '../lib/prisma'
import { sendEmailCode } from '../utils/mailer'
import bcrypt from 'bcryptjs'

export const registerUser: RequestHandler = async (req, res) => {
  try {
    const { name, email, password } = req.body
    const user = await registerService({ name, email, password })
    res.status(201).json(user)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const loginUser: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await loginService({ email, password })

    const token = signToken({ id: user.id, email: user.email })

    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // en producción: true con HTTPS
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 días
    })

    res.json({ message: 'Autenticado correctamente' })
  } catch (error: any) {
    res.status(401).json({ error: error.message })
  }
}

export const getMe: RequestHandler = async (req, res) => {
  try {
    const token = req.cookies.token
    if (!token) {
      res.status(401).json({ message: 'No autenticado' })
      return
    }

    const payload = verifyToken(token) as { id: number; email: string }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, email: true, createdAt: true }
    })

    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' })
      return
    }

    res.json(user)
  } catch (error) {
    res.status(401).json({ message: 'Token inválido o expirado' })
  }
}

export const logoutUser: RequestHandler = (_req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: false, // true en producción con HTTPS
    sameSite: 'lax',
  })

  res.json({ message: 'Sesión cerrada correctamente' })
}

// 👉 POST /send-code
export const sendCode: RequestHandler = async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
       res.status(400).json({ message: 'El email es requerido' })
       return
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Guarda temporalmente el código (aquí usamos la base de datos como ejemplo)
    await prisma.verificationCode.upsert({
      where: { email },
      update: { code, createdAt: new Date() },
      create: { email, code },
    })

    // Envía el código al correo
    await sendEmailCode(email, code)

     res.status(200).json({ message: 'Código enviado' })
     return
  } catch (err: any) {
     res.status(500).json({ message: 'Error al enviar código', error: err.message })
     return
  }
}

// 👉 POST /verify-code
export const verifyCodeAndRegister: RequestHandler = async (req, res) => {
  try {
    const { name, email, password, code } = req.body

    const savedCode = await prisma.verificationCode.findUnique({ where: { email } })

    if (!savedCode || savedCode.code !== code) {
       res.status(400).json({ message: 'Código inválido o expirado' })
       return
    }

    // ✅ Llama a tu servicio que ya hace el hash
    const user = await registerService({ name, email, password })

    // ✅ Elimina el código una vez registrado
    await prisma.verificationCode.delete({ where: { email } })

     res.status(201).json({ message: 'Usuario registrado', userId: user.id })
     return
  } catch (err: any) {
     res.status(500).json({ message: 'Error al registrar', error: err.message })
     return
  }
}