"use client";

import { useState } from "react";
import { uploadAndAnalyzeAction } from "@/app/actions/analyze";

interface UploadButtonProps {
  variant?: "default" | "compact";
}

export function UploadButton({ variant = "default" }: UploadButtonProps) {
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: "" });
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatus({ type: null, msg: "" });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await uploadAndAnalyzeAction(formData);

      if (result.success) {
        setStatus({ type: 'success', msg: result.message || "Sucesso!" });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setStatus({ type: 'error', msg: result.error || "Erro ao processar" });
        setUploading(false);
      }
    } catch (err) {
      setStatus({ type: 'error', msg: "Erro de conexão" });
      setUploading(false);
    }
  }

  // Definição de estilos baseada na variante
  const buttonStyles = variant === "compact"
    ? "px-3 py-2 bg-blue-600 text-xs md:text-sm"
    : "px-6 py-3 bg-blue-600 text-base";

  return (
    <div className="flex flex-col items-center gap-2">
      <label className={`
        ${buttonStyles}
        cursor-pointer text-white rounded-lg font-medium 
        hover:bg-blue-700 transition-all flex items-center gap-2
        ${uploading ? 'opacity-50 pointer-events-none' : ''}
      `}>
        {uploading ? (
          <>
            <span className="animate-spin text-lg">⏳</span>
            <span>Processando...</span>
          </>
        ) : (
          <>
            <span>{variant === "compact" ? "Novo CSV" : "Selecionar CSV"}</span>
          </>
        )}
        <input type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
      </label>

      {/* Mensagem de erro apenas se houver uma */}
      {status.type === 'error' && (
        <p className="text-[10px] text-red-500 font-medium absolute translate-y-10">
          {status.msg}
        </p>
      )}
    </div>
  );
}