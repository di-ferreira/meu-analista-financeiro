'use client';

import { getFinancialSummary } from '@/app/actions/report';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';

export function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerateReport() {
    setLoading(true);
    const result = await getFinancialSummary();
    setData(result);
    setLoading(false);
  }

  return (
    <div className='w-full max-w-5xl space-y-6 mt-10'>
      <div className='flex justify-between items-center'>
        <h2 className='text-2xl font-bold'>Resumo Financeiro</h2>
        <Button
          onClick={handleGenerateReport}
          disabled={loading}
          variant='outline'
          className='gap-2'
        >
          {loading ? (
            <Loader2 className='w-4 h-4 animate-spin' />
          ) : (
            <Sparkles className='w-4 h-4 text-purple-600' />
          )}
          Gerar Insights com IA
        </Button>
      </div>

      {/* Cards de Indicadores */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium'>Entradas</CardTitle>
            <TrendingUp className='w-4 h-4 text-green-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              {data
                ? `R$ ${data.summary.incomes.toLocaleString('pt-BR')}`
                : '---'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium'>Saídas</CardTitle>
            <TrendingDown className='w-4 h-4 text-red-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-red-600'>
              {data
                ? `R$ ${data.summary.expenses.toLocaleString('pt-BR')}`
                : '---'}
            </div>
          </CardContent>
        </Card>

        <Card className='bg-slate-900 text-white'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium'>Saldo Atual</CardTitle>
            <Wallet className='w-4 h-4 text-blue-400' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {data ? `R$ ${data.balance.toLocaleString('pt-BR')}` : '---'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Área de Insights da IA */}
      {data?.insight && (
        <Card className='border-purple-200 bg-purple-50/50'>
          <CardHeader>
            <CardTitle className='text-lg flex items-center gap-2 text-purple-700'>
              <Sparkles className='w-5 h-5' />
              Análise do Consultor IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='prose prose-slate max-w-none text-slate-700 italic'>
              {data.insight}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

