// Recomendado para IDs seguros e únicos
import { createId } from '@paralleldrive/cuid2';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// 1. Tabela de Usuários (Básico para o SaaS)
export const users = sqliteTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

// 2. Metadados dos Uploads (Para o utilizador saber o que já processou)
export const uploads = sqliteTable('uploads', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id').references(() => users.id),
  fileName: text('file_name').notNull(),
  status: text('status')
    .$type<'processing' | 'completed' | 'failed'>()
    .default('processing'),
  aiAnalysis: text('ai_analysis'), // Onde guardaremos o relatório final gerado pelo Ollama
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

// 3. Transações Financeiras (O "Cérebro" para a IA consultar)
export const transactions = sqliteTable('transactions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  uploadId: text('upload_id').references(() => uploads.id),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  description: text('description').notNull(),
  category: text('category'), // Pode ser preenchido pela IA depois
  amount: real('amount').notNull(), // Valores positivos para entrada, negativos para saída
  type: text('type').$type<'income' | 'expense'>().notNull(),
});

