import type { LocationWorkerResult } from '../../src/services/location-worker';
import { processSmokePartialLocation } from '../location-worker-openrouter-smoke-test';

describe('location-worker-openrouter-smoke-test', () => {
  test('waits for the enqueued smoke partialLocation to leave processing before succeeding', async () => {
    const workerResults: LocationWorkerResult[] = [
      { acknowledged: 1, failed: 0, matched: 1, processed: 1 },
      { acknowledged: 1, failed: 0, matched: 1, processed: 1 },
    ];
    const jobStates = [
      { canonicalLocationId: null, failureReason: null, status: 'processing' as const },
      { canonicalLocationId: 'location-great-wall', failureReason: null, status: 'matched' as const },
    ];
    let processNextCalls = 0;

    const result = await processSmokePartialLocation({
      attempts: 2,
      delayMs: 0,
      partialLocationId: 'partial-openrouter-smoke-123',
      processNext: async () => workerResults[processNextCalls++] ?? workerResults.at(-1)!,
      readRecognitionJob: async () => jobStates[Math.max(0, processNextCalls - 1)] ?? null,
    });

    expect(processNextCalls).toBe(2);
    expect(result.recognitionJob).toEqual({
      canonicalLocationId: 'location-great-wall',
      failureReason: null,
      status: 'matched',
    });
    expect(result.workerResults).toEqual(workerResults);
  });

  test('fails when unrelated worker matches happen but the smoke partialLocation never leaves processing', async () => {
    await expect(
      processSmokePartialLocation({
        attempts: 2,
        delayMs: 0,
        partialLocationId: 'partial-openrouter-smoke-456',
        processNext: async () => ({ acknowledged: 1, failed: 0, matched: 1, processed: 1 }),
        readRecognitionJob: async () => ({
          canonicalLocationId: null,
          failureReason: null,
          status: 'processing',
        }),
      })
    ).rejects.toThrow('partial-openrouter-smoke-456 was not processed after 2 attempts');
  });
});
