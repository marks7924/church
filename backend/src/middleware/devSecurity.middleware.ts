import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { Role } from '@prisma/client';
import { DevPortalService, MASTER_DEVELOPER_EMAIL } from '../services/devPortal.service';

/**
 * Extracts accurate client IP, accounting for trusted reverse proxies
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

/**
 * Global IP Ban Middleware
 * Evaluates whether caller IP is in the active bans table.
 */
export async function enforceIpBan(req: Request, res: Response, next: NextFunction) {
  try {
    const ip = getClientIp(req);
    const bannedIps = await DevPortalService.getActiveBannedIpsSet();

    if (bannedIps.has(ip)) {
      return res.status(403).json({
        error: 'IP_BANNED',
        errorAr: 'تم حظر عنوان بروتوكول الإنترنت (IP) الخاص بك من الوصول إلى خوادم الكنيسة لمخالفة سياسات الاستخدام.',
        ip
      });
    }

    next();
  } catch (err) {
    // If DB check encounters an error, proceed safely without locking out legitimate users
    console.error('[IP_BAN_MIDDLEWARE_ERROR]:', err);
    next();
  }
}

/**
 * Global Website Lockdown / Maintenance Middleware
 * Blocks public and standard authenticated users if lockdown mode is active,
 * while permitting DEVELOPER role, allowlisted IPs, and allowed roles for safe recovery.
 */
export async function enforceLockdown(req: Request, res: Response, next: NextFunction) {
  try {
    // Bypass health check, developer login and developer portal endpoints
    const url = req.originalUrl || req.url;
    if (
      url.startsWith('/api/health') ||
      url.startsWith('/health') ||
      url === '/' ||
      url.startsWith('/api/auth/login') ||
      url.startsWith('/api/developer')
    ) {
      return next();
    }

    const lockdown = await DevPortalService.getLockdownStatus();
    if (!lockdown || !lockdown.isActive) {
      return next();
    }

    const clientIp = getClientIp(req);

    // Allowlisted IPs can bypass
    if (lockdown.allowlistIps && lockdown.allowlistIps.includes(clientIp)) {
      return next();
    }

    // Check optional bearer token to see if user has an allowed bypass role (e.g. DEVELOPER)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const authUser = (req as AuthRequest).user;
      if (authUser) {
        const roles: Role[] = Array.from(new Set([
          authUser.role,
          ...(Array.isArray(authUser.roles) ? authUser.roles : [])
        ]));

        if (authUser.email.toLowerCase() === MASTER_DEVELOPER_EMAIL.toLowerCase()) {
          return next();
        }

        const isAllowed = roles.some(r => lockdown.allowedRoles.includes(r));
        if (isAllowed) {
          return next();
        }
      }
    }

    // Site is under lockdown and user has no bypass
    return res.status(503).json({
      error: 'SITE_UNDER_LOCKDOWN',
      message: lockdown.customMessage || 'الموقع يخضع حالياً لعملية صيانة وتحديث استثنائية. سنعود قريباً.',
      activatedAt: lockdown.activatedAt,
      isLockdown: true
    });
  } catch (err) {
    console.error('[LOCKDOWN_MIDDLEWARE_ERROR]:', err);
    next();
  }
}

/**
 * Developer-Only Authorization Middleware
 * Strictly requires Role.DEVELOPER or master email marksamer010@gmail.com
 */
export function requireDeveloper(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required for Developer Portal.' });
  }

  const isMaster = req.user.email.toLowerCase() === MASTER_DEVELOPER_EMAIL.toLowerCase();
  const userRoles = Array.from(new Set([
    req.user.role,
    ...(Array.isArray(req.user.roles) ? req.user.roles : [])
  ]));

  if (!isMaster && !userRoles.includes(Role.DEVELOPER)) {
    return res.status(403).json({
      error: 'DEVELOPER_ACCESS_DENIED',
      errorAr: 'عذراً، هذه المنطقة مخصصة حصرياً لمطوري النظام التقني ولا يملك حتى مسؤولو الكنيسة صلاحية دخولها.'
    });
  }

  next();
}

/**
 * Master Developer Authorization Middleware
 * Reserved exclusively for marksamer010@gmail.com
 */
export function requireMasterDeveloper(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (req.user.email.toLowerCase() !== MASTER_DEVELOPER_EMAIL.toLowerCase()) {
    return res.status(403).json({
      error: 'MASTER_DEVELOPER_EXCLUSIVE',
      errorAr: 'عذراً، هذه العملية الحساسة محصورة حصرياً بالمطور الرئيسي للمنظومة (Mark).'
    });
  }

  next();
}
