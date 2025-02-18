// app/lib/supabase.ts
import { OpenAIEmbeddings } from '@langchain/openai';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { createClient } from '@/utils/supabase/server';

export async function getSupabaseClient() {
  return await createClient();
}

export const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY
});

export const vectorStore = new SupabaseVectorStore(embeddings, {
  client: await getSupabaseClient(),
  tableName: 'documents',
  queryName: 'match_documents'
});