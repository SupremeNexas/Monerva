import { pipeline } from '@xenova/transformers';

export interface EmbeddingProvider {
  name: string;
  dimension: number;
  embedText(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

// Simple fallback vectorizer for deterministic 384-dim embeddings if ONNX model is unavailable
function fallbackVectorize(text: string, dim: number = 384): number[] {
  const vec = new Array(dim).fill(0);
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return vec;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash << 5) - hash + word.charCodeAt(j);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dim;
    vec[idx] += 1;
  }

  // Normalize
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return vec;
  return vec.map(v => v / norm);
}

class TransformerEmbeddingProvider implements EmbeddingProvider {
  name = 'Xenova/all-MiniLM-L6-v2';
  dimension = 384;
  private extractorPipeline: any = null;
  private isInitializing = false;

  private async getExtractor() {
    if (this.extractorPipeline) return this.extractorPipeline;
    if (this.isInitializing) {
      // Wait for initialization
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (this.extractorPipeline) return this.extractorPipeline;
    }

    this.isInitializing = true;
    try {
      this.extractorPipeline = await pipeline('feature-extraction', this.name);
      return this.extractorPipeline;
    } catch (err) {
      console.warn('[EmbeddingProvider] Failed to load ONNX transformer pipeline, using fallback vectorizer:', err);
      return null;
    } finally {
      this.isInitializing = false;
    }
  }

  async embedText(text: string): Promise<number[]> {
    try {
      const extractor = await this.getExtractor();
      if (!extractor) {
        return fallbackVectorize(text, this.dimension);
      }
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data) as number[];
    } catch (err) {
      console.warn('[EmbeddingProvider] Text embedding generation error, using fallback:', err);
      return fallbackVectorize(text, this.dimension);
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      const emb = await this.embedText(text);
      embeddings.push(emb);
    }
    return embeddings;
  }
}

let defaultProvider: EmbeddingProvider | null = null;

export function getEmbeddingProvider(): EmbeddingProvider {
  if (!defaultProvider) {
    defaultProvider = new TransformerEmbeddingProvider();
  }
  return defaultProvider;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
