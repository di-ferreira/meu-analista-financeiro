import NextAuth from "next-auth";
import { authConfig } from "./auth.config"; // Certifique-se que este arquivo existe

const { auth } = NextAuth(authConfig);

export default auth; // Exportação padrão que o Next.js exige

export const config = {
  // Ajuste o matcher para não entrar em loop
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};