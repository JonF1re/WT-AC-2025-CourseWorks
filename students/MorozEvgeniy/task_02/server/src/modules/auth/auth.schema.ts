import { z } from 'zod'

export const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6)
  })
})

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6)
  })
})

export type RegisterDto = z.infer<typeof registerSchema>['body']
export type LoginDto = z.infer<typeof loginSchema>['body']
