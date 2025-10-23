import { Request, Response } from 'express';
import { PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';
import { s3 } from '../lib/s3';
import { ddbDoc, env } from '../lib/ddb';
import { PDFProcessor } from '../lib/pdf';
import {
  GetSigningSessionResponse,
  SubmitSigningRequest,
  SubmitSigningResponse,
  Template,
  TemplateItem,
  TemplateFieldItem,
  SignLinkItem,
  AuditItem,
  FileItem,
  FieldDef,
} from '@grud-sign/shared';

export const getSigningSession = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    // Get sign link
    const signLinkResult = await ddbDoc.send(new GetCommand({
      TableName: env.table,
      Key: {
        pk: `SIGNLINK#${token}`,
        sk: 'META',
      },
    }));

    if (!signLinkResult.Item) {
      return res.status(404).json({ error: 'Not Found', message: 'Sign link not found' });
    }

    const signLink = signLinkResult.Item as SignLinkItem;

    // Check if expired
    if (new Date(signLink.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Gone', message: 'Sign link has expired' });
    }

    // Check if already completed
    if (signLink.status === 'completed') {
      return res.status(410).json({ error: 'Gone', message: 'Sign link has already been used' });
    }

    // Get template metadata
    const templateResult = await ddbDoc.send(new GetCommand({
      TableName: env.table,
      Key: {
        pk: `TEMPLATE#${signLink.templateId}`,
        sk: 'META',
      },
    }));

    if (!templateResult.Item) {
      return res.status(404).json({ error: 'Not Found', message: 'Template not found' });
    }

    const templateItem = templateResult.Item as TemplateItem;

    // Get template fields
    const fieldsResult = await ddbDoc.send(new QueryCommand({
      TableName: env.table,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `TEMPLATE#${signLink.templateId}`,
        ':skPrefix': 'FIELD#',
      },
    }));

    const fields: FieldDef[] = (fieldsResult.Items || []).map((item) => {
      const fieldItem = item as TemplateFieldItem;
      return {
        id: fieldItem.fieldId,
        type: fieldItem.type,
        x: fieldItem.x,
        y: fieldItem.y,
        width: fieldItem.width,
        height: fieldItem.height,
        page: fieldItem.page,
        required: fieldItem.required,
        placeholder: fieldItem.placeholder,
        label: fieldItem.label,
      };
    });

    // Get file metadata
    const fileResult = await ddbDoc.send(new GetCommand({
      TableName: env.table,
      Key: {
        pk: `FILE#${templateItem.fileKey}`,
        sk: 'META',
      },
    }));

    if (!fileResult.Item) {
      return res.status(404).json({ error: 'Not Found', message: 'File not found' });
    }

    const fileItem = fileResult.Item as FileItem;

    // Generate presigned URL for the PDF
    const fileUrl = await getSignedUrl(s3, new GetObjectCommand({
      Bucket: fileItem.bucket,
      Key: fileItem.key,
    }), { expiresIn: 3600 });

    const template: Template = {
      templateId: templateItem.templateId,
      name: templateItem.name,
      fileKey: templateItem.fileKey,
      createdAt: templateItem.createdAt,
      fields,
    };

    const response: GetSigningSessionResponse = {
      template,
      fileUrl,
      expiresAt: signLink.expiresAt,
    };

    res.json(response);
  } catch (error) {
    console.error('Get signing session error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get signing session' });
  }
};

export const submitSigning = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { filled }: SubmitSigningRequest = req.body;
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    // Get sign link
    const signLinkResult = await ddbDoc.send(new GetCommand({
      TableName: env.table,
      Key: {
        pk: `SIGNLINK#${token}`,
        sk: 'META',
      },
    }));

    if (!signLinkResult.Item) {
      return res.status(404).json({ error: 'Not Found', message: 'Sign link not found' });
    }

    const signLink = signLinkResult.Item as SignLinkItem;

    // Check if expired
    if (new Date(signLink.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Gone', message: 'Sign link has expired' });
    }

    // Check if already completed
    if (signLink.status === 'completed') {
      return res.status(410).json({ error: 'Gone', message: 'Sign link has already been used' });
    }

    // Get template and validate fields
    const templateResult = await ddbDoc.send(new GetCommand({
      TableName: env.table,
      Key: {
        pk: `TEMPLATE#${signLink.templateId}`,
        sk: 'META',
      },
    }));

    if (!templateResult.Item) {
      return res.status(404).json({ error: 'Not Found', message: 'Template not found' });
    }

    const templateItem = templateResult.Item as TemplateItem;

    // Get template fields for validation
    const fieldsResult = await ddbDoc.send(new QueryCommand({
      TableName: env.table,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `TEMPLATE#${signLink.templateId}`,
        ':skPrefix': 'FIELD#',
      },
    }));

    const templateFields = fieldsResult.Items || [];
    const requiredFieldIds = templateFields
      .filter((item) => (item as TemplateFieldItem).required)
      .map((item) => (item as TemplateFieldItem).fieldId);

    // Validate all required fields are filled
    const filledFieldIds = filled.map((f) => f.fieldId);
    const missingRequired = requiredFieldIds.filter((id) => !filledFieldIds.includes(id));

    if (missingRequired.length > 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields',
        details: { missingFields: missingRequired },
      });
    }

    // Get original file
    const fileResult = await ddbDoc.send(new GetCommand({
      TableName: env.table,
      Key: {
        pk: `FILE#${templateItem.fileKey}`,
        sk: 'META',
      },
    }));

    if (!fileResult.Item) {
      return res.status(404).json({ error: 'Not Found', message: 'File not found' });
    }

    const fileItem = fileResult.Item as FileItem;

    // Download original PDF
    const pdfResult = await s3.send(new GetObjectCommand({
      Bucket: fileItem.bucket,
      Key: fileItem.key,
    }));

    if (!pdfResult.Body) {
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve PDF' });
    }

    const pdfBuffer = Buffer.from(await pdfResult.Body.transformToByteArray());

    // Fill and flatten PDF
    const processResult = await PDFProcessor.fillAndFlattenPDF(pdfBuffer, filled);

    // Upload signed PDF
    const signedFileKey = `${token}-signed-${Date.now()}.pdf`;
    await s3.send(new PutObjectCommand({
      Bucket: env.signedBucket,
      Key: signedFileKey,
      Body: processResult.flattenedPdfBytes,
      ContentType: 'application/pdf',
      Metadata: {
        templateId: signLink.templateId,
        token: token,
        signedAt: new Date().toISOString(),
      },
    }));

    // Create audit record
    const auditId = nanoid();
    const auditItem: AuditItem = {
      pk: `AUDIT#${auditId}`,
      sk: 'META',
      auditId,
      templateId: signLink.templateId,
      token,
      ip: clientIp,
      userAgent,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      signedFileKey,
    };

    await ddbDoc.send(new PutCommand({
      TableName: env.table,
      Item: auditItem,
    }));

    // Update sign link status
    await ddbDoc.send(new UpdateCommand({
      TableName: env.table,
      Key: {
        pk: `SIGNLINK#${token}`,
        sk: 'META',
      },
      UpdateExpression: 'SET #status = :completed, completedAt = :completedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':completed': 'completed',
        ':completedAt': new Date().toISOString(),
      },
    }));

    // Update mirror record
    await ddbDoc.send(new UpdateCommand({
      TableName: env.table,
      Key: {
        pk: `TEMPLATE#${signLink.templateId}`,
        sk: `SIGNLINK#${token}`,
      },
      UpdateExpression: 'SET #status = :completed',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':completed': 'completed',
      },
    }));

    // Generate presigned URL for download
    const signedFileUrl = await getSignedUrl(s3, new GetObjectCommand({
      Bucket: env.signedBucket,
      Key: signedFileKey,
    }), { expiresIn: 86400 }); // 24 hours

    const response: SubmitSigningResponse = {
      signedFileUrl,
      auditId,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Submit signing error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to process signing' });
  }
};