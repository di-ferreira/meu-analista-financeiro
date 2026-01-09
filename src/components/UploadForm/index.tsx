'use client';

import { uploadAndAnalyzeAction } from '@/app/actions/analyze';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UploadCloud } from 'lucide-react';
import { useState } from 'react';

export function UploadForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    mapping?: any;
    error?: string;
  } | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setResult(null);

    // Chamando a nossa Server Action
    const response = await uploadAndAnalyzeAction(formData);

    setResult(response);
    setLoading(false);
  }

  return (
    <Card className='w-full max-w-md mx-auto shadow-lg'>
      <CardHeader>
        <CardTitle className='text-xl flex items-center gap-2'>
          <UploadCloud className='w-5 h-5 text-blue-600' />
          Importar CSV Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className='space-y-4'>
          <div className='grid w-full items-center gap-1.5'>
            <input
              id='file'
              name='file'
              type='file'
              accept='.csv'
              required
              className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
            />
          </div>

          <Button type='submit' className='w-full' disabled={loading}>
            {loading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Ollama Analisando...
              </>
            ) : (
              'Processar com IA Local'
            )}
          </Button>
        </form>

        {result?.success && (
          <div className='mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-xs text-green-800 font-mono'>
            <p className='font-bold mb-1'>✅ Colunas Mapeadas:</p>
            <pre>{JSON.stringify(result.mapping, null, 2)}</pre>
          </div>
        )}

        {result?.error && (
          <div className='mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800'>
            ❌ {result.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

