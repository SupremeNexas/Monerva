import { Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { AuthenticatedRequest } from './auth';

/**
 * Middleware to enforce Monerva Pro entitlement on premium AI routes.
 * FREE users receive HTTP 403 with error: "PRO_REQUIRED".
 * Demo account and PRO users pass seamlessly.
 */
export const requirePro = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { plan: true, email: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    const isDemo = user.email.toLowerCase() === 'demo@example.com';
    const isPro = user.plan === 'PRO' || isDemo;

    if (!isPro) {
      return res.status(403).json({
        error: 'PRO_REQUIRED',
        message: 'This feature requires Monerva Pro.'
      });
    }

    next();
  } catch (err) {
    console.error('[RequirePro] Permission check failed:', err);
    res.status(500).json({ error: 'Failed to verify Pro subscription status' });
  }
};
