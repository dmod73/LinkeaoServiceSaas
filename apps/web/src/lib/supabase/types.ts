// Minimal Supabase Database types to satisfy generic parameters across the app.
// This file intentionally keeps types loose to avoid regenerating a full DB schema here.
// For production you may want to generate strict types from your Supabase schema.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type SupabaseTable<Row extends Record<string, any> = Record<string, any>> = {
  Row: Row;
  Insert: Partial<Row> & Record<string, any>;
  Update: Partial<Row> & Record<string, any>;
};

export type Database = {
  [table: string]: SupabaseTable;
};
