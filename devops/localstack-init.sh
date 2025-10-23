#!/usr/bin/env bash
set -euo pipefail

export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-test}
export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-test}
export AWS_DEFAULT_REGION=${AWS_REGION:-us-east-1}
EP=${AWS_ENDPOINT:-http://localhost:4566}

# Create Dynamo table if not exists
if ! aws dynamodb describe-table --table-name grud-sign-main --endpoint-url $EP >/dev/null 2>&1; then
  aws dynamodb create-table \
    --endpoint-url $EP \
    --table-name grud-sign-main \
    --attribute-definitions AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S \
    --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes '[
      {
        "IndexName": "GSI1",
        "KeySchema": [{"AttributeName":"sk","KeyType":"HASH"}],
        "Projection":{"ProjectionType":"ALL"},
        "ProvisionedThroughput":{"ReadCapacityUnits":1,"WriteCapacityUnits":1}
      }
    ]'
fi

# Create S3 buckets if not exist
for B in grud-sign-uploads grud-sign-signed; do
  if ! aws s3 ls "s3://$B" --endpoint-url $EP >/dev/null 2>&1; then
    aws s3 mb "s3://$B" --endpoint-url $EP
  fi
done
echo "LocalStack initialized."