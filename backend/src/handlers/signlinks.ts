import { Request, Response } from 'express';
import { PutCommand, GetCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { nanoid } from 'nanoid';
import { ddbDoc, env } from '../lib/ddb';
import {
  CreateSignLinkRequest,
  CreateSignLinkResponse,
  SignLinkItem,
  SignLinkMirrorItem,
  SIGN_LINK_TTL_DAYS,
} from '@grud-sign/shared';

export const createSignLink = async (req: Request, res: Response) => {
  try {
    const { templateId, signerEmail, expiresAt: customExpiresAt }: CreateSignLinkRequest = req.body;

    // Verify template exists
    const templateResult = await ddbDoc.send(new GetCommand({
      TableName: env.table,
      Key: {
        pk: `TEMPLATE#${templateId}`,
        sk: 'META',
      },
    }));

    if (!templateResult.Item) {
      return res.status(404).json({ error: 'Not Found', message: 'Template not found' });
    }

    const token = nanoid(32); // Longer token for security
    const createdAt = new Date().toISOString();
    const expiresAt = customExpiresAt ||
      new Date(Date.now() + SIGN_LINK_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Create sign link item
    const signLinkItem: SignLinkItem = {
      pk: `SIGNLINK#${token}`,
      sk: 'META',
      token,
      templateId,
      signerEmail,
      status: 'active',
      createdAt,
      expiresAt,
    };

    // Create mirror item for querying by template
    const signLinkMirrorItem: SignLinkMirrorItem = {
      pk: `TEMPLATE#${templateId}`,
      sk: `SIGNLINK#${token}`,
      token,
      status: 'active',
      createdAt,
      expiresAt,
    };

    // Batch write both items
    await ddbDoc.send(new BatchWriteCommand({
      RequestItems: {
        [env.table]: [
          {
            PutRequest: {
              Item: signLinkItem,
            },
          },
          {
            PutRequest: {
              Item: signLinkMirrorItem,
            },
          },
        ],
      },
    }));

    const signUrl = `${env.signBaseUrl}/${token}`;

    const response: CreateSignLinkResponse = {
      signUrl,
      token,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create sign link error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create sign link' });
  }
};

export const getSignLink = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const result = await ddbDoc.send(new GetCommand({
      TableName: env.table,
      Key: {
        pk: `SIGNLINK#${token}`,
        sk: 'META',
      },
    }));

    if (!result.Item) {
      return res.status(404).json({ error: 'Not Found', message: 'Sign link not found' });
    }

    const signLink = result.Item as SignLinkItem;

    // Check if expired
    if (new Date(signLink.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Gone', message: 'Sign link has expired' });
    }

    // Check if already completed
    if (signLink.status === 'completed') {
      return res.status(410).json({ error: 'Gone', message: 'Sign link has already been used' });
    }

    res.json({
      token: signLink.token,
      templateId: signLink.templateId,
      signerEmail: signLink.signerEmail,
      status: signLink.status,
      createdAt: signLink.createdAt,
      expiresAt: signLink.expiresAt,
    });
  } catch (error) {
    console.error('Get sign link error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get sign link' });
  }
};