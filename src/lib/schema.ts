import { z } from 'zod';

export const DocumentSchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: z.record(z.any()),
  embedding: z.array(z.number()).optional()
});

export const SearchResultSchema = z.object({
  document: DocumentSchema,
  similarity: z.number(),
  relevanceScore: z.number()
});

export const SemanticQuerySchema = z.object({
  query: z.string(),
  filters: z.record(z.any()).optional(),
  topK: z.number().default(5)
});

export const EmbeddingBatchSchema = z.object({
  texts: z.array(z.string()),
  metadata: z.array(z.record(z.any())).optional()
});

export type Document = z.infer<typeof DocumentSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type SemanticQuery = z.infer<typeof SemanticQuerySchema>;
export type EmbeddingBatch = z.infer<typeof EmbeddingBatchSchema>;