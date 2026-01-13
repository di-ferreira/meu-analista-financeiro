import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Tabela de Usuários
export const users = sqliteTable('user', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name'),
    email: text('email').notNull().unique(),
    password: text('password'),
    image: text('image'),
});

// Tabela de Uploads
export const uploads = sqliteTable('uploads', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('userId').references(() => users.id, { onDelete: 'cascade' }),
    fileName: text('fileName').notNull(),
    createdAt: integer('createdAt', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Tabela de Transações
export const transactions = sqliteTable('transactions', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('userId').references(() => users.id, { onDelete: 'cascade' }),
    uploadId: text('uploadId').references(() => uploads.id, { onDelete: 'cascade' }),
    date: integer('date', { mode: 'timestamp' }).notNull(),
    description: text('description').notNull(),
    amount: real('amount').notNull(),
    type: text('type').$type<'income' | 'expense'>().notNull(),
});