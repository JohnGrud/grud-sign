import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class GrudSignStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table
    const table = new dynamodb.Table(this, 'GrudSignTable', {
      tableName: 'grud-sign-main',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes
    });

    // Add GSI
    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
    });

    // S3 Buckets
    const uploadsBucket = new s3.Bucket(this, 'UploadsBucket', {
      bucketName: 'grud-sign-uploads',
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const signedBucket = new s3.Bucket(this, 'SignedBucket', {
      bucketName: 'grud-sign-signed',
      cors: [{
        allowedMethods: [s3.HttpMethods.GET],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda function (placeholder - would contain backend code)
    const backendLambda = new lambda.Function(this, 'BackendLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          return {
            statusCode: 200,
            body: JSON.stringify({ message: 'GrudSign API' })
          };
        };
      `),
      environment: {
        DDB_TABLE: table.tableName,
        UPLOADS_BUCKET: uploadsBucket.bucketName,
        SIGNED_BUCKET: signedBucket.bucketName,
      },
    });

    // Grant permissions
    table.grantReadWriteData(backendLambda);
    uploadsBucket.grantReadWrite(backendLambda);
    signedBucket.grantReadWrite(backendLambda);

    // API Gateway
    const api = new apigateway.LambdaRestApi(this, 'GrudSignApi', {
      handler: backendLambda,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: table.tableName,
      description: 'DynamoDB Table Name',
    });
  }
}