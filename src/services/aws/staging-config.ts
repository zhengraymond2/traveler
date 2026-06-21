export type AwsAuroraDataApiConfig = {
  database: string;
  region: string;
  resourceArn: string;
  secretArn: string;
};

const stagingEnvVars = {
  region: 'AWS_REGION',
  resourceArn: 'TRAVELER_AURORA_RESOURCE_ARN',
  secretArn: 'TRAVELER_AURORA_SECRET_ARN',
  database: 'TRAVELER_AURORA_DATABASE',
} as const;

export function loadAwsStagingDatabaseConfigFromEnv(env: Record<string, string | undefined>): AwsAuroraDataApiConfig {
  const missing = Object.values(stagingEnvVars).filter((name) => !env[name]?.trim());
  if (missing.length) {
    throw new Error(`Missing Aurora staging env vars: ${missing.join(', ')}`);
  }

  return {
    database: env[stagingEnvVars.database] as string,
    region: env[stagingEnvVars.region] as string,
    resourceArn: env[stagingEnvVars.resourceArn] as string,
    secretArn: env[stagingEnvVars.secretArn] as string,
  };
}
