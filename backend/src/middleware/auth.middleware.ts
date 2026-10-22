import { Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { AuthRequest, UserPayload } from '../types';

import { getJwtSecret } from '../utils/security';

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Header missing or incorrect format.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, getJwtSecret()) as UserPayload;
    if (payload.isBanned) {
      return res.status(403).json({
        error: 'Account has been banned. Please contact church administration.',
        errorAr: 'تم حظر هذا الحساب، يرجى مراجعة إدارة الكنيسة.'
      });
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
        error: 'Account has been banned. Please contact church administration.',
        errorAr: 'تم حظر هذا الحساب، يرجى مراجعة إدارة الكنيسة.'
      });
    }

    const userRoles: Role[] = (req.user.roles && Array.isArray(req.user.roles) && req.user.roles.length > 0)
      ? req.user.roles
      : [req.user.role];

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
