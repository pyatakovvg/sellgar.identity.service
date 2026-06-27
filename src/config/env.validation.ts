type EnvConfig = Record<string, unknown>;

const requiredStringKeys = [
  'AMQP_IDENTITY_SRV_COMMAND_QUEUE',
  'AMQP_IDENTITY_SRV_EXCHANGE',
  'AMQP_HOSTNAME',
  'AMQP_USERNAME',
  'AMQP_PASSWORD',
  'DATABASE_HOST',
  'DATABASE_USERNAME',
  'DATABASE_PASSWORD',
  'DATABASE_DATABASE_NAME',
  'LEGACY_PASSWORD_HMAC_SECRET',
  'SESSION_SECRET_HASH_KEY',
  'FINGERPRINT_STORAGE_SECRET',
];

const requiredNumberKeys = [
  'AMQP_PORT',
  'DATABASE_PORT',
  'SESSION_RENEW_REQUIRED_AFTER_MS',
  'SESSION_EXPIRES_AFTER_MS',
];

function requireString(config: EnvConfig, key: string): string {
  const value = config[key];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value.trim();
}

function requireNumber(config: EnvConfig, key: string): number {
  const value = config[key];
  const numberValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }

  return numberValue;
}

export function validateEnv(config: EnvConfig) {
  const validatedConfig = { ...config };

  for (const key of requiredStringKeys) {
    validatedConfig[key] = requireString(config, key);
  }

  for (const key of requiredNumberKeys) {
    validatedConfig[key] = requireNumber(config, key);
  }

  return validatedConfig;
}
