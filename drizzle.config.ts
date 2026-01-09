import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts', // Caminho que definimos antes
  out: './drizzle', // Pasta onde as migrações serão salvas
  dialect: 'sqlite',
  dbCredentials: {
    url: `file:${process.env.DB}`, // Nome do arquivo do banco SQLite
  },
});

