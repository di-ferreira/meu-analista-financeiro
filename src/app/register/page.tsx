"use client"
import { registerAction } from "@/app/actions/register"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"

export default function RegisterPage() {
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const res = await registerAction(new FormData(e.currentTarget))
    if (res.success) router.push("/login")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Card className="w-[350px]">
        <CardHeader><CardTitle>Criar Conta</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <Input name="email" type="email" placeholder="E-mail" required />
            <Input name="password" type="password" placeholder="Senha" required />
            <Button type="submit">Cadastrar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}