import type {
  DatabaseClient,
  MarkMatchedRecognitionJobInput,
  MarkNeedsReviewRecognitionJobInput,
  PartialLocation,
  RecognitionJobStore,
} from '@/services/contracts';

export type SqlRecognitionJobStoreOptions = {
  now?: () => Date;
};

export class SqlRecognitionJobStore implements RecognitionJobStore {
  private readonly now: () => Date;

  constructor(
    private readonly database: DatabaseClient,
    options: SqlRecognitionJobStoreOptions = {}
  ) {
    this.now = options.now ?? (() => new Date());
  }

  async createProcessing(partialLocation: PartialLocation): Promise<void> {
    const now = this.now().toISOString();
    await this.database.execute({
      sql: `
        insert into recognition_jobs (
          partial_location_id,
          status,
          canonical_location_id,
          failure_reason,
          recognized_location_json,
          created_at,
          updated_at
        )
        values (
          :partialLocationId,
          :status,
          null,
          null,
          null,
          cast(:createdAt as timestamptz),
          cast(:updatedAt as timestamptz)
        )
      `,
      parameters: {
        createdAt: partialLocation.createdAt,
        partialLocationId: partialLocation.id,
        status: 'processing',
        updatedAt: now,
      },
    });
  }

  async markMatched(partialLocationId: string, input: MarkMatchedRecognitionJobInput): Promise<void> {
    await this.database.execute(buildUpdateRecognitionJobStatement(partialLocationId, {
      canonicalLocationId: input.location.id,
      failureReason: null,
      recognizedLocationJson: JSON.stringify(input.recognizedLocation),
      status: 'matched',
      updatedAt: this.now().toISOString(),
    }));
  }

  async markNeedsReview(partialLocationId: string, input: MarkNeedsReviewRecognitionJobInput): Promise<void> {
    await this.database.execute(buildUpdateRecognitionJobStatement(partialLocationId, {
      canonicalLocationId: null,
      failureReason: input.reason,
      recognizedLocationJson: JSON.stringify(input.recognizedLocation),
      status: 'needsReview',
      updatedAt: this.now().toISOString(),
    }));
  }

  async markFailed(partialLocationId: string, reason: string): Promise<void> {
    await this.database.execute(buildUpdateRecognitionJobStatement(partialLocationId, {
      canonicalLocationId: null,
      failureReason: reason,
      recognizedLocationJson: null,
      status: 'failed',
      updatedAt: this.now().toISOString(),
    }));
  }
}

function buildUpdateRecognitionJobStatement(
  partialLocationId: string,
  parameters: {
    canonicalLocationId: string | null;
    failureReason: string | null;
    recognizedLocationJson: string | null;
    status: 'matched' | 'needsReview' | 'failed';
    updatedAt: string;
  }
) {
  return {
    sql: `
      update recognition_jobs
      set
        status = :status,
        canonical_location_id = :canonicalLocationId,
        failure_reason = :failureReason,
        recognized_location_json = :recognizedLocationJson,
        updated_at = cast(:updatedAt as timestamptz)
      where partial_location_id = :partialLocationId
    `,
    parameters: {
      ...parameters,
      partialLocationId,
    },
  };
}
