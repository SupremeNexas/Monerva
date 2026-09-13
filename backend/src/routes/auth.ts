import { Router, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';
import { requireTurnstile } from '../middleware/turnstile';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../db/prisma';
import { authenticate, AuthenticatedRequest, getJwtSecret } from '../middleware/auth';
import { seedCategoriesForUser, seedSampleDataForUser } from '../../prisma/seed';

const router = Router();

// ─── Brute-force protection on credential endpoints ──────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 login/register attempts per 15 min per IP
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
} as any);

// ─── Google OAuth Client ─────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '357084347273-8405ggecqias20eduh7df8iv04eldtjm.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const passwordRules = body('password')
  .isLength({ min: 4 }).withMessage('Password must be at least 4 characters');

// Helper to generate access & refresh tokens
const generateTokens = (user: { id: string; email: string }) => {
  const jwtSecret = getJwtSecret();
  const token = jwt.sign({ id: user.id, email: user.email }, jwtSecret, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id, email: user.email }, jwtSecret, { expiresIn: '7d' });
  return { token, refreshToken };
};

// ─── POST /register ──────────────────────────────────────────────────────────
router.post('/register', authLimiter, requireTurnstile, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  passwordRules
], validate, async (req: any, res: Response) => {
  try {
    const { name, email, password, baseCurrency = 'USD', invitedBy } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hash,
        baseCurrency,
        authProvider: 'email',
        isVerified: true,
        lastLogin: new Date(),
        termsAcceptedAt: new Date(),
        termsVersion: '1.0',
        settings: {
          create: {
            theme: 'light',
            currency: baseCurrency,
            language: 'en',
          }
        }
      }
    });

    await seedCategoriesForUser(user.id);
    await seedSampleDataForUser(user.id, user.email);

    if (invitedBy) {
      const inviter = await prisma.user.findUnique({
        where: { email: invitedBy.trim().toLowerCase() }
      });
      if (inviter && inviter.id !== user.id) {
        await prisma.friend.upsert({
          where: {
            fromUserId_toUserId: {
              fromUserId: inviter.id,
              toUserId: user.id
            }
          },
          update: { status: 'ACCEPTED', acknowledged: true },
          create: {
            fromUserId: inviter.id,
            toUserId: user.id,
            status: 'ACCEPTED',
            acknowledged: true
          }
        });
      }
    }

    const { token, refreshToken } = generateTokens(user);

    res.status(201).json({
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        baseCurrency: user.baseCurrency,
        authProvider: user.authProvider,
        onboardingComplete: user.onboardingComplete,
        plan: user.plan
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register' });
  }
});

// ─── POST /login ─────────────────────────────────────────────────────────────
router.post('/login', authLimiter, requireTurnstile, [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
], validate, async (req: any, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Block email/password login for Google-only accounts
    if (!user.passwordHash) {
      return res.status(400).json({
        error: 'This account uses Google Sign-In. Please sign in with Google.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update lastLogin timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    const { token, refreshToken } = generateTokens(user);

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        baseCurrency: user.baseCurrency,
        authProvider: user.authProvider,
        onboardingComplete: user.onboardingComplete,
        plan: user.plan
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// ─── POST /refresh ───────────────────────────────────────────────────────────
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token is required')
], validate, async (req: any, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, getJwtSecret()) as { id: string; email: string };

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid user in refresh token' });
    }

    const tokens = generateTokens(user);
    res.json({
      token: tokens.token,
      refreshToken: tokens.refreshToken
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// ─── POST /google ─────────────────────────────────────────────────────────────
// Real Google OAuth: verifies the GSI credential (ID Token) server-side
// using google-auth-library before trusting any profile data.
router.post('/google', authLimiter, [
  body('idToken').notEmpty().withMessage('Google ID token is required')
], validate, async (req: any, res: Response) => {
  const { idToken, invitedBy } = req.body;

  if (!GOOGLE_CLIENT_ID) {
    console.error('[Google Auth] GOOGLE_CLIENT_ID is not configured in backend .env');
    return res.status(503).json({
      error: 'Google authentication is not configured on this server. Contact the administrator.'
    });
  }

  try {
    // ── 1. Verify the ID token with Google ──────────────────────────────────
    console.log('[Google Auth] Verifying ID token with Google...');
    const allowedAudiences: string[] = [];
    if (process.env.GOOGLE_CLIENT_ID) {
      allowedAudiences.push(process.env.GOOGLE_CLIENT_ID);
    }
    const defaultClientId = '357084347273-8405ggecqias20eduh7df8iv04eldtjm.apps.googleusercontent.com';
    if (!allowedAudiences.includes(defaultClientId)) {
      allowedAudiences.push(defaultClientId);
    }

    // Extract audience dynamically from the token payload to support custom frontend Client IDs
    try {
      const decodedPayload = jwt.decode(idToken) as { aud?: string | string[] } | null;
      if (decodedPayload?.aud) {
        if (typeof decodedPayload.aud === 'string' && !allowedAudiences.includes(decodedPayload.aud)) {
          allowedAudiences.push(decodedPayload.aud);
        } else if (Array.isArray(decodedPayload.aud)) {
          decodedPayload.aud.forEach(audItem => {
            if (typeof audItem === 'string' && !allowedAudiences.includes(audItem)) {
              allowedAudiences.push(audItem);
            }
          });
        }
      }
    } catch (e) {
      console.warn('[Google Auth] Could not pre-parse token audience:', e);
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: allowedAudiences,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ error: 'Invalid Google token payload' });
    }

    const { sub: googleId, email, name, picture: avatar, email_verified } = payload;

    if (!email || !googleId) {
      return res.status(400).json({ error: 'Google profile is missing required fields' });
    }

    if (!email_verified) {
      return res.status(400).json({ error: 'Google email is not verified' });
    }

    console.log(`[Google Auth] Token verified — email: ${email}, googleId: ${googleId}`);

    // ── 2. Find or create the user ───────────────────────────────────────────
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email: email.toLowerCase() }
        ]
      }
    });

    if (user) {
      // ── 2a. Existing user — update Google fields + lastLogin ───────────────
      console.log(`[Google Auth] Existing user found: ${user.id}`);
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId,                              // Link Google ID if not already set
          avatar: avatar || user.avatar,         // Update avatar from Google
          authProvider: user.authProvider === 'email' ? 'google' : user.authProvider,
          isVerified: true,
          lastLogin: new Date(),
        }
      });
    } else {
      // ── 2b. New user — create account ─────────────────────────────────────
      console.log(`[Google Auth] Creating new user for: ${email}`);
      user = await prisma.user.create({
        data: {
          name: name || email.split('@')[0],
          email: email.toLowerCase(),
          passwordHash: null,              // No password for Google-only users
          googleId,
          avatar: avatar || null,
          authProvider: 'google',
          isVerified: true,
          lastLogin: new Date(),
          termsAcceptedAt: new Date(),
          termsVersion: '1.0',
          baseCurrency: 'INR',            // Default; user can change in settings
          settings: {
            create: {
              theme: 'light',
              currency: 'INR',
              language: 'en',
            }
          }
        }
      });

      // Seed default categories and sample data for new users
      await seedCategoriesForUser(user.id);
      await seedSampleDataForUser(user.id, user.email);
      console.log(`[Google Auth] New user created and seeded: ${user.id}`);

      if (invitedBy) {
        const inviter = await prisma.user.findUnique({
          where: { email: invitedBy.trim().toLowerCase() }
        });
        if (inviter && inviter.id !== user.id) {
          await prisma.friend.upsert({
            where: {
              fromUserId_toUserId: {
                fromUserId: inviter.id,
                toUserId: user.id
              }
            },
            update: { status: 'ACCEPTED', acknowledged: true },
            create: {
              fromUserId: inviter.id,
              toUserId: user.id,
              status: 'ACCEPTED',
              acknowledged: true
            }
          });
        }
      }
    }

    // ── 3. Issue JWT + refresh token ─────────────────────────────────────────
    const { token, refreshToken } = generateTokens(user);
    console.log(`[Google Auth] JWT issued for user: ${user.id}`);

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        baseCurrency: user.baseCurrency,
        authProvider: user.authProvider,
        onboardingComplete: user.onboardingComplete,
        plan: user.plan
      }
    });
  } catch (err: any) {
    console.error('[Google Auth] Verification failed:', err?.message || err);

    // Provide specific error messages for common failures
    if (err?.message?.includes('Token used too late')) {
      return res.status(401).json({ error: 'Google token expired. Please sign in again.' });
    }
    if (err?.message?.includes('Invalid token signature')) {
      return res.status(401).json({ error: 'Invalid Google token. Please sign in again.' });
    }
    if (err?.message?.includes('Wrong recipient')) {
      return res.status(401).json({ error: 'Google token recipient mismatch. Please try again.' });
    }
    if (err?.message?.includes('Wrong number of segments')) {
      return res.status(400).json({ error: 'Malformed Google token received.' });
    }

    res.status(500).json({ error: `Google authentication failed: ${err?.message || 'Please try again.'}` });
  }
});

// ─── GET /me ──────────────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { settings: true }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user.id,
      name: user.name,
      displayName: user.displayName,
      email: user.email,
      avatar: user.avatar,
      baseCurrency: user.baseCurrency,
      authProvider: user.authProvider,
      country: user.country,
      timezone: user.timezone,
      monthlyIncome: user.monthlyIncome,
      preferredGoal: user.preferredGoal,
      shortTermGoal: user.shortTermGoal,
      longTermGoal: user.longTermGoal,
      onboardingComplete: user.onboardingComplete,
      plan: user.plan,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      settings: user.settings
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ─── PUT /profile ─────────────────────────────────────────────────────────────
router.put('/profile', authenticate, [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('displayName').trim().notEmpty().withMessage('Preferred display name is required'),
], validate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      name,
      displayName,
      avatar,
      baseCurrency,
      country,
      timezone,
      monthlyIncome,
      preferredGoal,
      shortTermGoal,
      longTermGoal,
      onboardingComplete
    } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name || undefined,
        displayName: displayName,
        avatar: avatar || undefined,
        baseCurrency: baseCurrency || undefined,
        country: country || null,
        timezone: timezone || null,
        monthlyIncome: monthlyIncome || null,
        preferredGoal: preferredGoal || null,
        shortTermGoal: shortTermGoal || null,
        longTermGoal: longTermGoal || null,
        onboardingComplete: onboardingComplete !== undefined ? onboardingComplete : undefined,
      },
      include: { settings: true }
    });

    // Mirror in settings table too for base currency consistency
    if (baseCurrency) {
      await prisma.settings.upsert({
        where: { userId: req.user.id },
        update: { currency: baseCurrency },
        create: { userId: req.user.id, currency: baseCurrency }
      });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        displayName: updatedUser.displayName,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        baseCurrency: updatedUser.baseCurrency,
        authProvider: updatedUser.authProvider,
        country: updatedUser.country,
        timezone: updatedUser.timezone,
        monthlyIncome: updatedUser.monthlyIncome,
        preferredGoal: updatedUser.preferredGoal,
        shortTermGoal: updatedUser.shortTermGoal,
        longTermGoal: updatedUser.longTermGoal,
        onboardingComplete: updatedUser.onboardingComplete,
        plan: updatedUser.plan,
        settings: updatedUser.settings
      }
    });
  } catch (err) {
    console.error('[Profile Update] Error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ─── PUT /currency ────────────────────────────────────────────────────────────
router.put('/currency', authenticate, [
  body('currency').isIn(['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD']).withMessage('Unsupported currency')
], validate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { baseCurrency: req.body.currency }
    });

    await prisma.settings.upsert({
      where: { userId: req.user.id },
      update: { currency: req.body.currency },
      create: { userId: req.user.id, currency: req.body.currency }
    });

    res.json({ message: 'Currency updated successfully', baseCurrency: req.body.currency });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update currency' });
  }
});

// ─── POST /seed ───────────────────────────────────────────────────────────────
router.post('/seed', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    await seedCategoriesForUser(req.user.id);
    await seedSampleDataForUser(req.user.id, req.user.email);

    res.json({ message: 'Demo data seeded successfully' });
  } catch (err) {
    console.error('Seeding error:', err);
    res.status(500).json({ error: 'Failed to seed demo data' });
  }
});

// ─── DELETE /account (Account & Data Erasure) ─────────────────────────────────
router.delete(['/account', '/me'], authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userId = req.user.id;

    // Use Prisma transaction to atomically purge all user data
    await prisma.$transaction(async (tx) => {
      // 1. Documents & Vector chunks
      await tx.documentChunk.deleteMany({ where: { userId } });
      await tx.document.deleteMany({ where: { userId } });

      // 2. Financial records & attachments
      await tx.receipt.deleteMany({ where: { userId } });
      await tx.transaction.deleteMany({ where: { userId } });
      await tx.recurringTransaction.deleteMany({ where: { userId } });
      await tx.subscription.deleteMany({ where: { userId } });
      await tx.budget.deleteMany({ where: { userId } });

      // Goals & contributions
      const userGoals = await tx.goal.findMany({ where: { userId }, select: { id: true } });
      const goalIds = userGoals.map(g => g.id);
      if (goalIds.length > 0) {
        await tx.goalContribution.deleteMany({ where: { goalId: { in: goalIds } } });
      }
      await tx.goal.deleteMany({ where: { userId } });

      await tx.bill.deleteMany({ where: { userId } });
      await tx.creditCard.deleteMany({ where: { userId } });
      await tx.wallet.deleteMany({ where: { userId } });
      await tx.category.deleteMany({ where: { userId } });

      // 3. Social / Shared records
      // Friend settlements, balances, and friendships
      await tx.friendSettlement.deleteMany({
        where: { OR: [{ paidById: userId }, { paidToId: userId }] }
      });
      await tx.friendBalance.deleteMany({
        where: { OR: [{ fromUserId: userId }, { toUserId: userId }] }
      });
      await tx.friend.deleteMany({
        where: { OR: [{ fromUserId: userId }, { toUserId: userId }] }
      });

      // Group expense splits & settlements involving user
      await tx.groupExpenseSplit.deleteMany({ where: { userId } });
      await tx.groupSettlement.deleteMany({
        where: { OR: [{ paidById: userId }, { paidToId: userId }] }
      });
      await tx.groupExpense.deleteMany({ where: { paidById: userId } });

      // Groups created by user
      const createdGroups = await tx.group.findMany({
        where: { createdBy: userId },
        include: { members: true }
      });
      for (const group of createdGroups) {
        await tx.groupSettlement.deleteMany({ where: { groupId: group.id } });
        await tx.groupExpense.deleteMany({ where: { groupId: group.id } });
        await tx.group.delete({ where: { id: group.id } });
      }

      // 4. Platform & Workspaces
      await tx.notification.deleteMany({ where: { userId } });
      await tx.auditLog.deleteMany({ where: { userId } });
      await tx.settings.deleteMany({ where: { userId } });

      // Workspaces where user is member / sole owner
      const memberWorkspaces = await tx.workspaceMember.findMany({ where: { userId } });
      const workspaceIds = memberWorkspaces.map(m => m.workspaceId);

      await tx.workspaceMember.deleteMany({ where: { userId } });

      for (const wsId of workspaceIds) {
        const remainingMembers = await tx.workspaceMember.count({ where: { workspaceId: wsId } });
        if (remainingMembers === 0) {
          await tx.automation.deleteMany({ where: { workspaceId: wsId } });
          await tx.workspace.delete({ where: { id: wsId } }).catch(() => {});
        }
      }

      // 5. Delete User record
      await tx.user.delete({ where: { id: userId } });
    });

    res.json({
      success: true,
      message: 'Your account and all associated personal financial data have been permanently deleted.'
    });
  } catch (err: any) {
    console.error('[Account Deletion] Error purging user data:', err);
    res.status(500).json({ error: 'Failed to delete account. Please try again or contact support.' });
  }
});

export default router;
