import { afterEach, describe, expect, it, vi } from 'vitest';
import { RELEASE_MATCHING_POLICY, type ReleaseMatchingPolicy } from '../evaluation/releasePolicy';
import type { CatRecord, CatSummary } from '../storage/types';
import type { MeowfolioRepository } from '../storage/repository';
import { loadRuntimeCatalog } from './referenceCatalog';

const space = {
  modelId: 'cat-model', revision: 'pinned', dtype: 'uint8',
  preprocessingVersion: 1, dimension: 2, pooling: 'cls-token',
} as CatRecord['embeddingSpace'];

function summary(id: string): CatSummary {
  return {
    cat: {
      id, name: id, createdAt: 1, updatedAt: 2, firstSeenAt: 1,
      lastSeenAt: 2, encounterCount: 1, coverEncounterId: 'enc-' + id,
      referenceEmbeddingCount: 1, referenceEmbeddingSum: new Float64Array([1, 0]),
      referenceEmbedding: new Float32Array([1, 0]), embeddingSpace: space,
    },
    coverPhoto: new Blob(['photo-' + id], { type: 'image/png' }),
  };
}

describe('runtime cat reference catalog resources', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not fetch embeddings or encounter history with matching disabled', async () => {
    const create = vi.spyOn(URL, 'createObjectURL')
      .mockImplementationOnce(() => 'blob:first')
      .mockImplementationOnce(() => 'blob:second');
    const history = vi.fn();
    const repository = {
      getCatSummaries: vi.fn().mockResolvedValue([summary('first'), summary('second')]),
      listEncountersForCat: history,
    } as unknown as MeowfolioRepository;
    const catalog = await loadRuntimeCatalog(repository, RELEASE_MATCHING_POLICY);
    expect(catalog.cats).toHaveLength(2);
    expect(catalog.objectUrls).toEqual(['blob:first', 'blob:second']);
    expect(catalog.cats[0].referenceEmbedding).toBeUndefined();
    expect(history).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('revokes every already-created URL if a later cat history read fails', async () => {
    vi.spyOn(URL, 'createObjectURL')
      .mockImplementationOnce(() => 'blob:first')
      .mockImplementationOnce(() => 'blob:second');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const repository = {
      getCatSummaries: vi.fn().mockResolvedValue([summary('first'), summary('second')]),
      listEncountersForCat: vi.fn()
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('IndexedDB became unavailable')),
    } as unknown as MeowfolioRepository;
    const policy: ReleaseMatchingPolicy = {
      enabled: true, strategy: 'first-only', evidenceStatus: 'approved',
    };
    await expect(loadRuntimeCatalog(repository, policy))
      .rejects.toThrow('IndexedDB became unavailable');
    expect(revoke.mock.calls.map(([url]) => url)).toEqual(['blob:first', 'blob:second']);
  });

  it('releases earlier URLs when creating the next cover URL throws', async () => {
    vi.spyOn(URL, 'createObjectURL')
      .mockImplementationOnce(() => 'blob:first')
      .mockImplementationOnce(() => { throw new Error('Blob quota'); });
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const repository = {
      getCatSummaries: vi.fn().mockResolvedValue([summary('first'), summary('second')]),
    } as unknown as MeowfolioRepository;
    await expect(loadRuntimeCatalog(repository, RELEASE_MATCHING_POLICY))
      .rejects.toThrow('Blob quota');
    expect(revoke).toHaveBeenCalledWith('blob:first');
  });
});
