"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const successMsg = searchParams.get("success");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false, // Controlamos o redirecionamento manualmente
    });

    if (result?.error) {
      setError("Credenciais inválidas.");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <CardHeader>
          <CardTitle>
            Login
          </CardTitle>
        </CardHeader>
        {successMsg && <p className="p-2 text-sm text-green-700 bg-green-100 rounded">{successMsg}</p>}
        <form onSubmit={handleSubmit} className="grid gap-4">
          <Input placeholder="E-mail" name="email" type="email" required />
          <Input placeholder="Password" name="password" type="password" required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="cursor-pointer">
            Entrar
          </Button>
        </form>
        <CardFooter>
          Não tem conta? &nbsp; <Link href="/register" className="hover:underline">Cadastre-se</Link>
        </CardFooter>
      </Card>
    </div>
  );
}