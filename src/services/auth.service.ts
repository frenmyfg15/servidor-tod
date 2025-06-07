import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'

type RegisterData = {
  name: string
  email: string
  password: string
}
type LoginData = {
  email: string
  password: string
}
export async function registerService({ name, email, password }: RegisterData) {
  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    throw new Error('El correo ya está registrado')
  }

  const hashed = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  })
  return user
}

export async function loginService({ email, password }: LoginData) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new Error('Credenciales inválidas')

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) throw new Error('Credenciales inválidas')

  return user
}