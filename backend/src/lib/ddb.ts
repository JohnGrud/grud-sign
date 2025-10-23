import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "./env";

const ddb = new DynamoDBClient({
  region: env.region,
  ...(env.endpoint ? { endpoint: env.endpoint } : {}),
});

export const ddbDoc = DynamoDBDocumentClient.from(ddb, {
  marshallOptions: { removeUndefinedValues: true },
});

export { env };