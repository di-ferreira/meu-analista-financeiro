import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login", // Redireciona para cá se não estiver logado
  },
  providers: [
    Credentials({
      // Deixamos vazio aqui, pois a lógica de banco vai para o outro arquivo
      async authorize() { return null } 
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAuthPage = nextUrl.pathname.startsWith("/login") || 
                         nextUrl.pathname.startsWith("/register")

      if (isAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl))
        return true
      }

      return isLoggedIn
    },
  },
} satisfies NextAuthConfig