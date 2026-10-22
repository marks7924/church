import { Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { AuthRequest, UserPayload } from '../types';
import prisma from '../db';
import { getJwtSecret } from '../utils/security';

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Header missing or incorrect format.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, getJwtSecret()) as UserPayload;

    // Real-time ban and role check from database
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { role: true, roles: true, isBanned: true, banReason: true, email: true }
    });

    if (!dbUser) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    if (dbUser.isBanned) {
      return res.status(403).json({
        isBanned: true,
        error: 'ACCOUNT_BANNED',
        errorAr: `تم حظر هذا الحساب من قِبل إدارة الكنيسة${dbUser.banReason ? ` (السبب: ${dbUser.banReason})` : ''}. يرجى مراجعة إدارة الكنيسة.`
      });
    }

    // Always sync real-time roles
    payload.role = dbUser.role;
    payload.roles = dbUser.roles;
    payload.isBanned = false;

    if (dbUser.email === 'marksamer010@gmail.com' || payload.email === 'marksamer010@gmail.com') {
      payload.role = Role.DEVELOPER;
      if (!payload.roles.includes(Role.DEVELOPER)) {
        payload.roles.push(Role.DEVELOPER);
      }
    }

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function requireRoles(roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (req.user.isBanned) {
      return res.status(403).json({
        isBanned: true,
        error: 'ACCOUNT_BANNED',
        errorAr: 'تم حظر هذا الحساب، يرجى مراجعة إدارة الكنيسة.'
      });
    }

    const userRoles: Role[] = Array.from(new Set([
      req.user.role,
      ...(Array.isArray(req.user.roles) ? req.user.roles : [])
    ]));

    if (req.user.email === 'marksamer010@gmail.com') {
      if (!userRoles.includes(Role.DEVELOPER)) userRoles.push(Role.DEVELOPER);
    }

    const isDeveloper = userRoles.includes(Role.DEVELOPER);
    const isSuperAdmin = userRoles.includes(Role.SUPER_ADMIN);
    const isChurchAdmin = userRoles.includes(Role.CHURCH_ADMIN);

    const hasDirectMatch = userRoles.some(r => roles.includes(r));
    const isHierarchyMatch = 
      isDeveloper || 
      (isSuperAdmin && (
        roles.includes(Role.CHURCH_ADMIN) || 
        roles.includes(Role.SECRETARY) || 
        roles.includes(Role.TRIP_MANAGER) || 
        roles.includes(Role.QR_SCANNER) || 
        roles.includes(Role.MEMBER)
      )) ||
      (isChurchAdmin && (
        roles.includes(Role.SECRETARY) || 
        roles.includes(Role.TRIP_MANAGER) || 
        roles.includes(Role.QR_SCANNER) || 
        roles.includes(Role.MEMBER)
      ));

    if (!hasDirectMatch && !isHierarchyMatch) {
      return res.status(403).json({ error: 'Access forbidden. Insufficient permissions.' });
    }

    next();
  };
}
