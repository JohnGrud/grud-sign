import { z } from 'zod';

// ===== Field Types =====
export const FieldTypeEnum = z.enum(['signature', 'text', 'date']);
export type FieldType = z.infer<typeof FieldTypeEnum>;

// ===== Field Definition =====
export const FieldDefSchema = z.object({
  id: z.string(),
  type: FieldTypeEnum,
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().min(1),
  height: z.number().min(1),
  page: z.number().int().min(0),
  required: z.boolean().default(true),
  placeholder: z.string().optional(),
  label: z.string().optional(),
});
export type FieldDef = z.infer<typeof FieldDefSchema>;

// ===== Field Value (filled by signer) =====
export const FieldValueSchema = z.object({
  fieldId: z.string(),
  value: z.string(),
  type: FieldTypeEnum,
});
export type FieldValue = z.infer<typeof FieldValueSchema>;

// ===== Template =====
export const TemplateSchema = z.object({
  templateId: z.string(),
  name: z.string().min(1).max(255),
  fileKey: z.string(),
  createdAt: z.string(), // ISO datetime
  fields: z.array(FieldDefSchema),
});
export type Template = z.infer<typeof TemplateSchema>;

// ===== Sign Link =====
export const SignLinkStatusEnum = z.enum(['active', 'completed', 'expired']);
export type SignLinkStatus = z.infer<typeof SignLinkStatusEnum>;

export const SignLinkSchema = z.object({
  token: z.string(),
  templateId: z.string(),
  signerEmail: z.string().email().optional(),
  status: SignLinkStatusEnum,
  createdAt: z.string(),
  expiresAt: z.string(),
  completedAt: z.string().optional(),
});
export type SignLink = z.infer<typeof SignLinkSchema>;

// ===== Audit Log =====
export const AuditSchema = z.object({
  auditId: z.string(),
  templateId: z.string(),
  token: z.string(),
  ip: z.string(),
  userAgent: z.string(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  signedFileKey: z.string().optional(),
});
export type Audit = z.infer<typeof AuditSchema>;

// ===== File Metadata =====
export const FileMetaSchema = z.object({
  fileKey: z.string(),
  bucket: z.string(),
  key: z.string(),
  mimeType: z.string(),
  size: z.number().optional(),
  uploadedAt: z.string(),
});
export type FileMeta = z.infer<typeof FileMetaSchema>;

// ===== API Request/Response Schemas =====

// POST /templates
export const CreateTemplateRequestSchema = z.object({
  name: z.string().min(1).max(255),
  fileId: z.string().optional(), // Either fileId or multipart file
  fields: z.array(FieldDefSchema).default([]),
});
export type CreateTemplateRequest = z.infer<typeof CreateTemplateRequestSchema>;

export const CreateTemplateResponseSchema = z.object({
  templateId: z.string(),
});
export type CreateTemplateResponse = z.infer<typeof CreateTemplateResponseSchema>;

// GET /templates/:id
export const GetTemplateResponseSchema = z.object({
  template: TemplateSchema,
});
export type GetTemplateResponse = z.infer<typeof GetTemplateResponseSchema>;

// POST /signlinks
export const CreateSignLinkRequestSchema = z.object({
  templateId: z.string(),
  signerEmail: z.string().email().optional(),
  expiresAt: z.string().optional(), // ISO datetime, defaults to 7 days
});
export type CreateSignLinkRequest = z.infer<typeof CreateSignLinkRequestSchema>;

export const CreateSignLinkResponseSchema = z.object({
  signUrl: z.string(),
  token: z.string(),
});
export type CreateSignLinkResponse = z.infer<typeof CreateSignLinkResponseSchema>;

// GET /sign/:token
export const GetSigningSessionResponseSchema = z.object({
  template: TemplateSchema,
  fileUrl: z.string(),
  expiresAt: z.string(),
});
export type GetSigningSessionResponse = z.infer<typeof GetSigningSessionResponseSchema>;

// POST /sign/:token/submit
export const SubmitSigningRequestSchema = z.object({
  filled: z.array(FieldValueSchema).min(1),
});
export type SubmitSigningRequest = z.infer<typeof SubmitSigningRequestSchema>;

export const SubmitSigningResponseSchema = z.object({
  signedFileUrl: z.string(),
  auditId: z.string(),
});
export type SubmitSigningResponse = z.infer<typeof SubmitSigningResponseSchema>;

// Health check
export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  timestamp: z.string(),
  version: z.string().optional(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// ===== Error Response =====
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.any().optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ===== DynamoDB Item Types (for backend) =====
export interface TemplateItem {
  pk: string; // TEMPLATE#${templateId}
  sk: string; // META
  templateId: string;
  name: string;
  fileKey: string;
  createdAt: string;
}

export interface TemplateFieldItem {
  pk: string; // TEMPLATE#${templateId}
  sk: string; // FIELD#${fieldId}
  fieldId: string;
  type: FieldType;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  required: boolean;
  placeholder?: string;
  label?: string;
}

export interface SignLinkItem {
  pk: string; // SIGNLINK#${token}
  sk: string; // META
  token: string;
  templateId: string;
  signerEmail?: string;
  status: SignLinkStatus;
  createdAt: string;
  expiresAt: string;
  completedAt?: string;
}

export interface SignLinkMirrorItem {
  pk: string; // TEMPLATE#${templateId}
  sk: string; // SIGNLINK#${token}
  token: string;
  status: SignLinkStatus;
  createdAt: string;
  expiresAt: string;
}

export interface AuditItem {
  pk: string; // AUDIT#${auditId}
  sk: string; // META
  auditId: string;
  templateId: string;
  token: string;
  ip: string;
  userAgent: string;
  startedAt: string;
  completedAt?: string;
  signedFileKey?: string;
}

export interface FileItem {
  pk: string; // FILE#${fileKey}
  sk: string; // META
  fileKey: string;
  bucket: string;
  key: string;
  mimeType: string;
  size?: number;
  uploadedAt: string;
}

// ===== Utility Types =====
export const CoordinatesSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Coordinates = z.infer<typeof CoordinatesSchema>;

export const SizeSchema = z.object({
  width: z.number(),
  height: z.number(),
});
export type Size = z.infer<typeof SizeSchema>;

// ===== Constants =====
export const PDF_LIMITS = {
  MAX_SIZE_MB: 10,
  MAX_PAGES: 50,
} as const;

export const DEFAULT_FIELD_SIZE = {
  signature: { width: 200, height: 50 },
  text: { width: 150, height: 30 },
  date: { width: 100, height: 30 },
} as const;

export const SIGN_LINK_TTL_DAYS = 7;