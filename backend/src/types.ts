import { Request } from 'express';
import { Role } from '@prisma/client';

export interface UserPayload {
  userId: string;
  email: string;
  role: Role;
  fullName: string;
  isVerified: boolean;
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}
