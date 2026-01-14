"use client";

import { useState } from "react";
import { uploadAndAnalyzeAction } from "@/app/actions/analyze";

export function UploadButton() {
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: "" });
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatus({ type: null, msg: "" });

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadAndAnalyzeAction(formData);

    if (result.success) {
      setStatus({ type: 'success', msg: result.message || "Sucesso!" });
      setTimeout(() => window.location.reload(), 1500); // Dá tempo do usuário ler
    } else {
      setStatus({ type: 'error', msg: result.error || "Erro desconhecido" });
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <label className={`cursor-pointer px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
        {uploading ? "Processando..." : "Selecionar CSV"}
        <input type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
      </label>

      {status.msg && (
        <div className={`text-sm p-3 rounded-md ${status.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {status.msg}
        </div>
      )}
    </div>
  );
}