import type { ReleaseMatchingPolicy } from '../evaluation/releasePolicy';
import type { MeowfolioRepository } from '../storage/repository';
import { embeddingSpaceKey, type CatReference } from './matching';

export interface RuntimeCatalog {
  cats: CatReference[];
  objectUrls: string[];
}

export async function loadRuntimeCatalog(
  repository: MeowfolioRepository,
  policy: ReleaseMatchingPolicy,
): Promise<RuntimeCatalog> {
  const summaries = await repository.getCatSummaries();
  const objectUrls: string[] = [];
  const cats: CatReference[] = [];

  for (const { cat, coverPhoto } of summaries) {
    const coverUrl = URL.createObjectURL(coverPhoto);
    objectUrls.push(coverUrl);

    let referenceEmbedding: number[] | undefined;
    let embeddingSpace = cat.embeddingSpace;

    if (policy.enabled) {
      if (policy.strategy === 'centroid') {
        if (
          !policy.embeddingSpaceKey ||
          embeddingSpaceKey(cat.embeddingSpace) === policy.embeddingSpaceKey
        ) {
          referenceEmbedding = Array.from(cat.referenceEmbedding);
        }
      } else {
        const encounters = await repository.listEncountersForCat(cat.id);
        const firstCompatible = encounters.find(
          (encounter) =>
            !policy.embeddingSpaceKey ||
            embeddingSpaceKey(encounter.embeddingSpace) === policy.embeddingSpaceKey,
        );

        if (firstCompatible) {
          referenceEmbedding = Array.from(firstCompatible.embedding);
          embeddingSpace = firstCompatible.embeddingSpace;
        }
      }
    }

    cats.push({
      id: cat.id,
      name: cat.name,
      encounterCount: cat.encounterCount,
      coverUrl,
      ...(referenceEmbedding ? { referenceEmbedding, embeddingSpace } : {}),
    });
  }

  return { cats, objectUrls };
}
