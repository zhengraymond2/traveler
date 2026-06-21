import type { PartialLocation, RecognizedLocationResult } from './location-types';

export interface LocationRecognizer {
  recognize(input: PartialLocation): Promise<RecognizedLocationResult>;
}
