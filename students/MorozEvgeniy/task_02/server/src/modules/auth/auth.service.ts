import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { RegisterDto, LoginDto } from './auth.schema'
import { prisma } from "../../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export class AuthService {
  async register(dto: RegisterDto) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }]
      }
    })

    if (existingUser) {
      throw new Error('User already exists')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    const user = await prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash
      }
    })

    return {
      id: user.id,
      username: user.username,
      email: user.email
    }
  }

  async login(dto: LoginDto) {
    const user = await prisma.user.findUnique({
      where: { email: dto.email }
    })

    if (!user) {
      throw new Error('Invalid credentials')
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash)

    if (!isValid) {
      throw new Error('Invalid credentials')
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    )

    return {
      accessToken: token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    }
  }
}
