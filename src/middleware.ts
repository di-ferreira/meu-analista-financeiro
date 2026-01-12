import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { nextUrl } = req

  const isAuthPage = nextUrl.pathname.startsWith("/login") || 
                     nextUrl.pathname.startsWith("/register")
  
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth")

  // 1. Se for uma rota de API do Auth.js, não faz nada
  if (isApiAuthRoute) return NextResponse.next()

  // 2. Se estiver em uma página de Auth (Login/Register)
  if (isAuthPage) {
    if (isLoggedIn) {
      // Se já está logado, vai para a home
      return NextResponse.redirect(new URL("/", nextUrl))
    }
    // Se não está logado, permite acessar a página de login
    return NextResponse.next()
  }

  // 3. Se NÃO estiver logado e tentar acessar qualquer outra página
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  return NextResponse.next()
})

// O matcher é CRUCIAL para evitar loops com arquivos do Next.js
export const config = {
  matcher: [
    /*
     * Ignora as seguintes rotas:
     * - api/auth (rotas do NextAuth)
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico, sitemap, etc.
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
}