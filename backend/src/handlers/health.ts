import { Request, Response } from 'express';
import { HealthResponse } from '@grud-sign/shared';

export const healthCheck = (req: Request, res: Response) => {
  const response: HealthResponse = {
    ok: true,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
  };

  res.json(response);
};