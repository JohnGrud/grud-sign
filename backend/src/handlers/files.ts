import { Request, Response } from 'express';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { nanoid } from 'nanoid';
import { s3 } from '../lib/s3';
import { ddbDoc, env } from '../lib/ddb';
import { PDFProcessor } from '../lib/pdf';
import { FileItem } from '@grud-sign/shared';

export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Bad Request', message: 'No file uploaded' });
    }

    const { originalname, buffer, mimetype, size } = req.file;

    // Validate file type
    if (mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Bad Request', message: 'Only PDF files are allowed' });
    }

    // Validate file size (10MB limit)
    if (size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Bad Request', message: 'File size exceeds 10MB limit' });
    }

    // Validate PDF
    const validation = await PDFProcessor.validatePDF(buffer);
    if (!validation.isValid) {
      return res.status(400).json({ error: 'Bad Request', message: validation.error });
    }

    const fileKey = nanoid();
    const s3Key = `${fileKey}/${originalname}`;

    // Upload to S3
    await s3.send(new PutObjectCommand({
      Bucket: env.uploadsBucket,
      Key: s3Key,
      Body: buffer,
      ContentType: mimetype,
      Metadata: {
        originalName: originalname,
        uploadedAt: new Date().toISOString(),
      },
    }));

    // Store file metadata in DynamoDB
    const fileItem: FileItem = {
      pk: `FILE#${fileKey}`,
      sk: 'META',
      fileKey,
      bucket: env.uploadsBucket,
      key: s3Key,
      mimeType: mimetype,
      size,
      uploadedAt: new Date().toISOString(),
    };

    await ddbDoc.send(new PutCommand({
      TableName: env.table,
      Item: fileItem,
    }));

    res.json({ fileId: fileKey });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to upload file' });
  }
};

export const getFileUrl = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    // Get file metadata from DynamoDB
    const result = await ddbDoc.send(new GetCommand({
      TableName: env.table,
      Key: {
        pk: `FILE#${fileId}`,
        sk: 'META',
      },
    }));

    if (!result.Item) {
      return res.status(404).json({ error: 'Not Found', message: 'File not found' });
    }

    const fileItem = result.Item as FileItem;

    // Generate presigned URL
    const presignedUrl = await getSignedUrl(s3, new GetObjectCommand({
      Bucket: fileItem.bucket,
      Key: fileItem.key,
    }), { expiresIn: 3600 }); // 1 hour

    res.json({
      fileUrl: presignedUrl,
      mimeType: fileItem.mimeType,
      size: fileItem.size,
    });
  } catch (error) {
    console.error('Get file URL error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get file URL' });
  }
};

export const getSignedFileUrl = async (req: Request, res: Response) => {
  try {
    const { fileKey } = req.params;

    // Generate presigned URL for signed file
    const presignedUrl = await getSignedUrl(s3, new GetObjectCommand({
      Bucket: env.signedBucket,
      Key: fileKey,
    }), { expiresIn: 3600 }); // 1 hour

    res.json({
      fileUrl: presignedUrl,
    });
  } catch (error) {
    console.error('Get signed file URL error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get signed file URL' });
  }
};