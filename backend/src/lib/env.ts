export const env = {
  region: process.env.AWS_REGION ?? 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT, // e.g., http://localhost:4566 in dev
  table: process.env.DDB_TABLE ?? 'grud-sign-main',
  uploadsBucket: process.env.S3_UPLOADS_BUCKET ?? 'grud-sign-uploads',
  signedBucket: process.env.S3_SIGNED_BUCKET ?? 'grud-sign-signed',
  pathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
  adminToken: process.env.ADMIN_TOKEN ?? 'dev-admin-token',
  port: Number(process.env.BACKEND_PORT ?? 4000),
  signBaseUrl: process.env.SIGN_BASE_URL ?? 'http://localhost:5173/sign',
  nodeEnv: process.env.NODE_ENV ?? 'development',
};