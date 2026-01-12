import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { eq } from "drizzle-orm"
import { db } from "./db"
import { users } from "./db/schema"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const [user] = await db.select().from(users).where(eq(users.email, credentials.email as string))

        if (!user || !user.password) return null

        // Comparação nativa do Bun
        const isMatch = Bun.password.verifySync(credentials.password as string, user.password)

        if (!isMatch) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
})