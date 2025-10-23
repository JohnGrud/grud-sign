import { Request, Response, NextFunction } from 'express';
import { env } from './env';

export interface AuthenticatedRequest extends Request {
  isAdmin?: boolean;
}

export const adminAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);

  if (token !== env.adminToken) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid admin token' });
  }

  req.isAdmin = true;
  next();
};

export const publicAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Public endpoints - no auth required
  next();
};