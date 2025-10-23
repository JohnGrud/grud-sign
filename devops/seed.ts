#!/usr/bin/env tsx

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

// Environment setup
const AWS_ENDPOINT = process.env.AWS_ENDPOINT || 'http://localhost:4566';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const DDB_TABLE = process.env.DDB_TABLE || 'grud-sign-main';
const UPLOADS_BUCKET = process.env.S3_UPLOADS_BUCKET || 'grud-sign-uploads';
const SIGNED_BUCKET = process.env.S3_SIGNED_BUCKET || 'grud-sign-signed';
const SIGN_BASE_URL = process.env.SIGN_BASE_URL || 'http://localhost:5173/sign';

// AWS clients
const ddbClient = new DynamoDBClient({
  region: AWS_REGION,
  endpoint: AWS_ENDPOINT,
});

const ddbDoc = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const s3Client = new S3Client({
  region: AWS_REGION,
  endpoint: AWS_ENDPOINT,
  forcePathStyle: true,
});

async function createSamplePDF(): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);

  const { width, height } = page.getSize();

  // Add some content to the PDF
  page.drawText('SAMPLE AGREEMENT DOCUMENT', {
    x: 50,
    y: height - 50,
    size: 20,
    color: rgb(0, 0, 0),
  });

  page.drawText('This is a sample document for demonstration purposes.', {
    x: 50,
    y: height - 100,
    size: 12,
    color: rgb(0, 0, 0),
  });

  page.drawText('Please sign below:', {
    x: 50,
    y: height - 150,
    size: 12,
    color: rgb(0, 0, 0),
  });

  // Add placeholder areas for fields
  page.drawRectangle({
    x: 50,
    y: height - 200,
    width: 200,
    height: 30,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 1,
  });

  page.drawText('Signature:', {
    x: 50,
    y: height - 220,
    size: 10,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawRectangle({
    x: 300,
    y: height - 200,
    width: 100,
    height: 30,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 1,
  });

  page.drawText('Date:', {
    x: 300,
    y: height - 220,
    size: 10,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText('Full Name:', {
    x: 50,
    y: height - 260,
    size: 12,
    color: rgb(0, 0, 0),
  });

  page.drawRectangle({
    x: 50,
    y: height - 290,
    width: 200,
    height: 30,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 1,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function uploadSamplePDF(): Promise<string> {
  console.log('📄 Creating sample PDF...');
  const pdfBuffer = await createSamplePDF();

  const fileKey = 'sample-agreement';
  const s3Key = `${fileKey}/sample-agreement.pdf`;

  console.log('⬆️  Uploading sample PDF to S3...');
  await s3Client.send(new PutObjectCommand({
    Bucket: UPLOADS_BUCKET,
    Key: s3Key,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
    Metadata: {
      originalName: 'sample-agreement.pdf',
      uploadedAt: new Date().toISOString(),
    },
  }));

  // Store file metadata in DynamoDB
  const fileItem = {
    pk: `FILE#${fileKey}`,
    sk: 'META',
    fileKey,
    bucket: UPLOADS_BUCKET,
    key: s3Key,
    mimeType: 'application/pdf',
    size: pdfBuffer.length,
    uploadedAt: new Date().toISOString(),
  };

  await ddbDoc.send(new PutCommand({
    TableName: DDB_TABLE,
    Item: fileItem,
  }));

  console.log(`✅ Sample PDF uploaded with key: ${fileKey}`);
  return fileKey;
}

async function createSampleTemplate(fileKey: string): Promise<string> {
  console.log('📋 Creating sample template...');

  const templateId = 'sample-template-001';
  const createdAt = new Date().toISOString();

  // Template metadata
  const templateItem = {
    pk: `TEMPLATE#${templateId}`,
    sk: 'META',
    templateId,
    name: 'Sample Agreement Template',
    fileKey,
    createdAt,
  };

  await ddbDoc.send(new PutCommand({
    TableName: DDB_TABLE,
    Item: templateItem,
  }));

  // Sample fields
  const fields = [
    {
      pk: `TEMPLATE#${templateId}`,
      sk: 'FIELD#signature-001',
      fieldId: 'signature-001',
      type: 'signature',
      x: 50,
      y: 200,
      width: 200,
      height: 30,
      page: 0,
      required: true,
      placeholder: 'Your signature',
      label: 'Signature',
    },
    {
      pk: `TEMPLATE#${templateId}`,
      sk: 'FIELD#date-001',
      fieldId: 'date-001',
      type: 'date',
      x: 300,
      y: 200,
      width: 100,
      height: 30,
      page: 0,
      required: true,
      placeholder: 'MM/DD/YYYY',
      label: 'Date',
    },
    {
      pk: `TEMPLATE#${templateId}`,
      sk: 'FIELD#name-001',
      fieldId: 'name-001',
      type: 'text',
      x: 50,
      y: 290,
      width: 200,
      height: 30,
      page: 0,
      required: true,
      placeholder: 'Enter your full name',
      label: 'Full Name',
    },
  ];

  // Insert all fields
  for (const field of fields) {
    await ddbDoc.send(new PutCommand({
      TableName: DDB_TABLE,
      Item: field,
    }));
  }

  console.log(`✅ Sample template created with ID: ${templateId}`);
  return templateId;
}

async function createSampleSignLink(templateId: string): Promise<string> {
  console.log('🔗 Creating sample sign link...');

  const token = 'demo-sign-token-001';
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  // Sign link item
  const signLinkItem = {
    pk: `SIGNLINK#${token}`,
    sk: 'META',
    token,
    templateId,
    signerEmail: 'demo@example.com',
    status: 'active',
    createdAt,
    expiresAt,
  };

  await ddbDoc.send(new PutCommand({
    TableName: DDB_TABLE,
    Item: signLinkItem,
  }));

  // Mirror item for querying by template
  const signLinkMirrorItem = {
    pk: `TEMPLATE#${templateId}`,
    sk: `SIGNLINK#${token}`,
    token,
    status: 'active',
    createdAt,
    expiresAt,
  };

  await ddbDoc.send(new PutCommand({
    TableName: DDB_TABLE,
    Item: signLinkMirrorItem,
  }));

  console.log(`✅ Sample sign link created with token: ${token}`);
  return token;
}

async function main() {
  try {
    console.log('🌱 Starting data seeding process...');
    console.log(`📍 Using LocalStack endpoint: ${AWS_ENDPOINT}`);
    console.log(`📊 DynamoDB table: ${DDB_TABLE}`);
    console.log(`🪣 S3 buckets: ${UPLOADS_BUCKET}, ${SIGNED_BUCKET}`);

    // Step 1: Upload sample PDF
    const fileKey = await uploadSamplePDF();

    // Step 2: Create sample template with fields
    const templateId = await createSampleTemplate(fileKey);

    // Step 3: Create sample sign link
    const token = await createSampleSignLink(templateId);

    // Step 4: Display results
    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📋 Demo Resources Created:');
    console.log(`   📄 Sample PDF: ${fileKey}`);
    console.log(`   📋 Sample Template: ${templateId}`);
    console.log(`   🔗 Sample Sign Link: ${token}`);

    console.log('\n🚀 Ready URLs:');
    console.log(`   👨‍💼 Admin Portal: http://localhost:5173/templates`);
    console.log(`   ✍️  Sign Document: ${SIGN_BASE_URL}/${token}`);

    console.log('\n💡 Next Steps:');
    console.log('   1. Open the admin portal to view templates');
    console.log('   2. Use the sign link to test the signing flow');
    console.log('   3. Upload your own PDFs and create custom templates');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}