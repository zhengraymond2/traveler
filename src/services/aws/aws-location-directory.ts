import { SqlLocationDirectory, type SqlLocationDirectoryOptions } from '@/services/db';

import { createAwsStagingDatabaseFromEnv } from './aws-aurora-data-api-database';

export class AwsLocationDirectory extends SqlLocationDirectory {
  static async fromStagingEnv(
    env?: Record<string, string | undefined>,
    options?: SqlLocationDirectoryOptions
  ): Promise<AwsLocationDirectory> {
    return new AwsLocationDirectory(await createAwsStagingDatabaseFromEnv(env), options);
  }
}
