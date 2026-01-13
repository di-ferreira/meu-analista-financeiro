"use client";

import { useState } from "react";
import { registerAction } from "@/app/actions/register";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await registerAction(formData);

    if (result.success) {
      router.push("/login?success=Conta criada com sucesso!");
    } else {
      setError(result.error || "Erro ao criar conta.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <CardHeader>
          <CardTitle>
            Criar Nova Conta
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <Input placeholder="Name" name="name" type="text" required className="w-full px-3 py-2" />
          <Input placeholder="E-Mail" name="email" type="email" required className="w-full px-3 py-2" />
          <Input placeholder="Password" name="password" type="password" required className="w-full px-3 py-2" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="cursor-pointer">
            {loading ? "Processando..." : "Registrar"}
          </Button>
        </form>
        <CardFooter>
          Já tem uma conta? &nbsp; <Link href="/login" className="hover:underline">Entre aqui</Link>
        </CardFooter>
      </Card>
    </div>
  );
}