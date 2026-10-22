import prisma from '../db';
import { redactSensitiveData } from './security';

export async function logAction(
  userId: string,
  email: string,
  fullName: string,
  action: string,
  details: string
) {
  try {
    await prisma.actionLog.create({
      data: {
        userId,
        userEmail: email,
        userName: fullName,
        action,
        details: redactSensitiveData(details)
      }
    });
  } catch (error) {
    console.error('Error saving action log to database:', error);
  }
}
