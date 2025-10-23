import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import { env } from './lib/env';
import { adminAuth, publicAuth } from './lib/auth';
import { validateBody, validateParams } from './lib/schema';

// Import handlers
import { healthCheck } from './handlers/health';
import { uploadFile, getFileUrl, getSignedFileUrl } from './handlers/files';
import { createTemplate, getTemplate, listTemplates } from './handlers/templates';
import { createSignLink, getSignLink } from './handlers/signlinks';
import { getSigningSession, submitSigning } from './handlers/signing';

// Import schemas
import {
  CreateTemplateRequestSchema,
  CreateSignLinkRequestSchema,
  SubmitSigningRequestSchema,
} from '@grud-sign/shared';
import { z } from 'zod';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? ['http://localhost:5173'] : [],
  credentials: true,
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Trust proxy for IP forwarding (useful for audit logs)
if (env.nodeEnv === 'development') {
  app.set('trust proxy', true);
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Schema validation helpers
const ParamsIdSchema = z.object({ id: z.string() });
const ParamsTokenSchema = z.object({ token: z.string() });
const ParamsFileIdSchema = z.object({ fileId: z.string() });
const ParamsFileKeySchema = z.object({ fileKey: z.string() });

// Routes

// Health check
app.get('/healthz', healthCheck);

// Admin routes (require authentication)
app.post('/templates',
  adminAuth,
  upload.single('file'),
  validateBody(CreateTemplateRequestSchema),
  createTemplate
);

app.get('/templates/:id',
  adminAuth,
  validateParams(ParamsIdSchema),
  getTemplate
);

app.get('/templates',
  adminAuth,
  listTemplates
);

app.post('/signlinks',
  adminAuth,
  validateBody(CreateSignLinkRequestSchema),
  createSignLink
);

app.get('/signlinks/:token',
  adminAuth,
  validateParams(ParamsTokenSchema),
  getSignLink
);

// File upload/download routes
app.post('/files',
  adminAuth,
  upload.single('file'),
  uploadFile
);

app.get('/files/:fileId',
  adminAuth,
  validateParams(ParamsFileIdSchema),
  getFileUrl
);

app.get('/files/signed/:fileKey',
  publicAuth,
  validateParams(ParamsFileKeySchema),
  getSignedFileUrl
);

// Public signing routes (no authentication)
app.get('/sign/:token',
  publicAuth,
  validateParams(ParamsTokenSchema),
  getSigningSession
);

app.post('/sign/:token/submit',
  publicAuth,
  validateParams(ParamsTokenSchema),
  validateBody(SubmitSigningRequestSchema),
  submitSigning
);

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', error);

  if (error.message === 'Only PDF files are allowed') {
    return res.status(400).json({
      error: 'Bad Request',
      message: error.message,
    });
  }

  if (error.message.includes('File too large')) {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'File size exceeds the maximum allowed limit',
    });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: env.nodeEnv === 'development' ? error.message : 'An unexpected error occurred',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Start server
const server = app.listen(env.port, () => {
  console.log(`🚀 Server running on port ${env.port}`);
  console.log(`📊 Health check: http://localhost:${env.port}/healthz`);
  console.log(`🔗 Sign base URL: ${env.signBaseUrl}`);
  console.log(`🪣 Upload bucket: ${env.uploadsBucket}`);
  console.log(`📁 Signed bucket: ${env.signedBucket}`);
  console.log(`🗄️  DynamoDB table: ${env.table}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;