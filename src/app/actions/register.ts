"use server"

import { db } from "@/db"
import { users } from "@/db/schema"

export async function registerAction(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  // Hash nativo do Bun (Bcrypt por padrão)
  const hashedPassword = Bun.password.hashSync(password)

  try {
    await db.insert(users).values({
      email,
      password: hashedPassword,
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: "E-mail já cadastrado." }
  }
}