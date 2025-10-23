import { Request, Response } from 'express';
import { PutCommand, GetCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { nanoid } from 'nanoid';
import { ddbDoc, env } from '../lib/ddb';
import {
  Template,
  TemplateItem,
  TemplateFieldItem,
  CreateTemplateRequest,
  CreateTemplateResponse,
  GetTemplateResponse,
  FieldDef,
} from '@grud-sign/shared';

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const { name, fileId, fields }: CreateTemplateRequest = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'Bad Request', message: 'fileId is required' });
    }

    // Verify file exists
    const fileResult = await ddbDoc.send(new GetCommand({
      TableName: env.table,
      Key: {
        pk: `FILE#${fileId}`,
        sk: 'META',
      },
    }));

    if (!fileResult.Item) {
      return res.status(404).json({ error: 'Not Found', message: 'File not found' });
    }

    const templateId = nanoid();

    // Create template item
    const templateItem: TemplateItem = {
      pk: `TEMPLATE#${templateId}`,
      sk: 'META',
      templateId,
      name,
      fileKey: fileId,
      createdAt: new Date().toISOString(),
    };

    // Prepare batch write for template and fields
    const putRequests: any[] = [
      {
        PutRequest: {
          Item: templateItem,
        },
      },
    ];

    // Add field items
    for (const field of fields) {
      const fieldItem: TemplateFieldItem = {
        pk: `TEMPLATE#${templateId}`,
        sk: `FIELD#${field.id}`,
        fieldId: field.id,
        type: field.type,
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
        page: field.page,
        required: field.required,
        placeholder: field.placeholder,
        label: field.label,
      };

      putRequests.push({
        PutRequest: {
          Item: fieldItem,
        },
      });
    }

    // Execute batch write
    await ddbDoc.send(new BatchWriteCommand({
      RequestItems: {
        [env.table]: putRequests,
      },
    }));

    const response: CreateTemplateResponse = {
      templateId,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create template' });
  }
};

export const getTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get template metadata
    const templateResult = await ddbDoc.send(new GetCommand({
      TableName: env.table,
      Key: {
        pk: `TEMPLATE#${id}`,
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
        ':pk': `TEMPLATE#${id}`,
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

    const template: Template = {
      templateId: templateItem.templateId,
      name: templateItem.name,
      fileKey: templateItem.fileKey,
      createdAt: templateItem.createdAt,
      fields,
    };

    const response: GetTemplateResponse = {
      template,
    };

    res.json(response);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get template' });
  }
};

export const listTemplates = async (req: Request, res: Response) => {
  try {
    // Query all templates (could be paginated in production)
    const result = await ddbDoc.send(new QueryCommand({
      TableName: env.table,
      IndexName: 'GSI1',
      KeyConditionExpression: 'sk = :sk',
      FilterExpression: 'begins_with(pk, :pkPrefix)',
      ExpressionAttributeValues: {
        ':sk': 'META',
        ':pkPrefix': 'TEMPLATE#',
      },
    }));

    const templates = (result.Items || []).map((item) => {
      const templateItem = item as TemplateItem;
      return {
        templateId: templateItem.templateId,
        name: templateItem.name,
        fileKey: templateItem.fileKey,
        createdAt: templateItem.createdAt,
      };
    });

    res.json({ templates });
  } catch (error) {
    console.error('List templates error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to list templates' });
  }
};