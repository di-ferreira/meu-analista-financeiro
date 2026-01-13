"use server"

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function registerAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password) {
    return { success: false, error: "Dados incompletos." };
  }

  try {
    // 1. Verificar se o utilizador já existe
    const [existingUser] = await db.select().from(users).where(eq(users.email, email));

    if (existingUser) {
      return { success: false, error: "Este e-mail já está em uso." };
    }

    // 2. Hash da senha (salt de 10 rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Inserir no SQLite
    await db.insert(users).values({
      email,
      name,
      password: hashedPassword,
    });

    return { success: true };
  } catch (error) {
    console.error("Erro no registro:", error);
    return { success: false, error: "Erro interno no servidor." };
  }
}