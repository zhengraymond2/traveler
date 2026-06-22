import type { Location, PartialLocation, RecognizedLocation } from './location-types';

export type RecognitionJobStatus = 'processing' | 'matched' | 'needsReview' | 'failed';

export type RecognitionJob = {
  canonicalLocationId: string | null;
  createdAt: string;
  failureReason: string | null;
  partialLocationId: string;
  recognizedLocationJson: string | null;
  status: RecognitionJobStatus;
  updatedAt: string;
};

export type MarkMatchedRecognitionJobInput = {
  location: Location;
  recognizedLocation: RecognizedLocation;
};

export type MarkNeedsReviewRecognitionJobInput = {
  reason: string;
  recognizedLocation: RecognizedLocation;
};

export interface RecognitionJobStore {
  createProcessing(partialLocation: PartialLocation): Promise<void>;
  markMatched(partialLocationId: string, input: MarkMatchedRecognitionJobInput): Promise<void>;
  markNeedsReview(partialLocationId: string, input: MarkNeedsReviewRecognitionJobInput): Promise<void>;
  markFailed(partialLocationId: string, reason: string): Promise<void>;
}
