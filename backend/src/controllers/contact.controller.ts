import { Router, Request, Response } from 'express';
import prisma from '../db';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { Role } from '@prisma/client';
import { logAction } from '../utils/logger';

const router = Router();

// Allowed roles to read/manage contact messages (everyone except MEMBER and TRIP_MANAGER)
const ADMIN_ROLES = [
  Role.SUPER_ADMIN,
  Role.DEVELOPER,
  Role.CHURCH_ADMIN,
  Role.SECRETARY,
  Role.PRIEST,
  Role.BISHOP
];

// 1. Post a new contact message (Public)
router.post('/', async (req: Request, res: Response) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !email || !phone || !subject || !message) {
    return res.status(400).json({ error: 'All fields (name, email, phone, subject, message) are required.' });
  }

  try {
    const contactMsg = await prisma.contactMessage.create({
      data: {
        name,
        email,
        phone,
        subject,
        message
      }
    });

    return res.status(201).json({
      message: 'Contact message submitted successfully.',
      id: contactMsg.id
    });
  } catch (error) {
    console.error('Error creating contact message:', error);
    return res.status(500).json({ error: 'Server error saving contact message.' });
  }
});

// 2. Retrieve all contact messages (Admin/Priest/Secretary only)
router.get('/', requireAuth, requireRoles(ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json(messages);
  } catch (error) {
    console.error('Error retrieving contact messages:', error);
    return res.status(500).json({ error: 'Server error retrieving messages.' });
  }
});

// 3. Delete a contact message (Admin/Priest/Secretary only)
router.delete('/:id', requireAuth, requireRoles(ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  try {
    const existing = await prisma.contactMessage.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    await prisma.contactMessage.delete({
      where: { id }
    });

    // Log administrative action
    await logAction(
      user.userId,
      user.email,
      user.fullName,
      'DELETE_CONTACT_MESSAGE',
      `Deleted contact message from: ${existing.name} (${existing.email}) - Subject: ${existing.subject}`
    );

    return res.status(200).json({ message: 'Contact message deleted successfully.' });
  } catch (error) {
    console.error('Error deleting contact message:', error);
    return res.status(500).json({ error: 'Server error deleting message.' });
  }
});

export default router;
