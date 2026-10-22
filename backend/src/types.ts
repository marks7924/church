import { Request } from 'express';
import { Role } from '@prisma/client';

export interface UserPayload {
  userId: string;
  email: string;
  role: Role;
  roles?: Role[];
  fullName: string;
  isVerified: boolean;
  isBanned?: boolean;
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}
