import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env";

export const s3 = new S3Client({
  region: env.region,
  forcePathStyle: env.pathStyle,
  ...(env.endpoint ? { endpoint: env.endpoint } : {}),
});