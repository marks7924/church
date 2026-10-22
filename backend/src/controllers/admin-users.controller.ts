import { Router, Response } from 'express';
import prisma from '../db';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { AuthRequest } from '../types';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { logAction } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_church_jwt_secret_key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_church_jwt_refresh_secret_key';
const DEVELOPER_EMAIL = 'marksamer010@gmail.com';

const ROLE_PRIORITY: Record<Role, number> = {
  [Role.DEVELOPER]: 100,
  [Role.SUPER_ADMIN]: 90,
  [Role.CHURCH_ADMIN]: 80,
  [Role.BISHOP]: 70,
  [Role.PRIEST]: 60,
  [Role.SECRETARY]: 50,
  [Role.TRIP_MANAGER]: 40,
  [Role.QR_SCANNER]: 30,
  [Role.MEMBER]: 10
};

export function getPrimaryRole(roles: Role[]): Role {
  if (!roles || roles.length === 0) return Role.MEMBER;
  return [...roles].sort((a, b) => (ROLE_PRIORITY[b] || 0) - (ROLE_PRIORITY[a] || 0))[0];
}

export function validateRoleAssignment(
  callerEmail: string,
  callerRoles: Role[],
  targetRoles: Role[]
): { allowed: boolean; errorAr?: string; errorEn?: string } {
  // Developer role CANNOT be assigned. Exclusively reserved for marksamer010@gmail.com
  if (targetRoles.includes(Role.DEVELOPER) && callerEmail.toLowerCase() !== DEVELOPER_EMAIL.toLowerCase()) {
    return {
      allowed: false,
      errorAr: 'لا يمكن تعيين رتبة مطور النظام (Developer) لأي حساب؛ هذه الرتبة مخصصة حصرياً لـ marksamer010@gmail.com.',
      errorEn: 'The DEVELOPER role cannot be assigned. It is exclusively reserved for marksamer010@gmail.com.'
    };
  }

  return { allowed: true };
}

export function validateUserModification(
  callerEmail: string,
  callerRoles: Role[],
  targetUser: { id: string; email: string; role: Role; roles?: Role[] }
): { allowed: boolean; errorAr?: string; errorEn?: string } {
  // Protected Developer account: marksamer010@gmail.com cannot be modified or banned by anyone else
  if (targetUser.email.toLowerCase() === DEVELOPER_EMAIL.toLowerCase() || targetUser.role === Role.DEVELOPER) {
    if (callerEmail.toLowerCase() !== DEVELOPER_EMAIL.toLowerCase()) {
      return {
        allowed: false,
        errorAr: 'لا يمكن تعديل، حظر، أو تغيير رتب حساب مطور النظام الرئيسي.',
        errorEn: 'Cannot modify or ban the master Developer account.'
      };
    }
  }

  return { allowed: true };
}

const router = Router();

// 1. Create a new administrative/role account (Super Admin, Church Admin, Developer)
router.post(
  '/create',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER]),
  async (req: AuthRequest, res: Response) => {
    const {
      email,
      password,
      fullName,
      role,
      roles,
      phone,
      nationalId,
      nameAr,     // Priest/Bishop details
      nameEn,
      titleAr,
      titleEn,
      avatarUrl
    } = req.body;

    const creator = req.user!;
    const creatorRoles = (creator.roles && creator.roles.length > 0) ? creator.roles : [creator.role];

    // Support either roles array or single role
    let requestedRoles: Role[] = [];
    if (Array.isArray(roles) && roles.length > 0) {
      requestedRoles = roles.map(r => String(r).trim().toUpperCase() as Role).filter(r => Object.values(Role).includes(r));
    } else if (role) {
      requestedRoles = [String(role).trim().toUpperCase() as Role];
    }

    if (!email || !password || !fullName || requestedRoles.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: email, password, fullName, and at least one role.',
        errorAr: 'يرجى إدخال جميع الحقول المطلوبة: البريد الإلكتروني، كلمة المرور، الاسم، واختيار رتبة واحدة على الأقل.'
      });
    }

    // Role Hierarchy & Developer Protection validation
    const hierarchyCheck = validateRoleAssignment(creator.email, creatorRoles, requestedRoles);
    if (!hierarchyCheck.allowed) {
      return res.status(403).json({
        error: hierarchyCheck.errorEn,
        errorAr: hierarchyCheck.errorAr
      });
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanNationalId = nationalId ? nationalId.trim() : null;

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: cleanEmail },
            ...(cleanNationalId ? [{ nationalId: cleanNationalId }] : [])
          ]
        }
      });

      if (existingUser) {
        return res.status(400).json({
          error: 'User with this email or national ID already exists.',
          errorAr: 'يوجد مستخدم مسجل بالفعل بهذا البريد الإلكتروني أو الرقم القومي.'
        });
      }

      const passwordHash = bcrypt.hashSync(password, 10);
      const primaryRole = getPrimaryRole(requestedRoles);

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: cleanEmail,
            passwordHash,
            role: primaryRole,
            roles: requestedRoles,
            fullName: fullName.trim(),
            phone: phone ? phone.trim() : null,
            nationalId: cleanNationalId,
            isVerified: true
          }
        });

        // If Priest or Bishop is included in the assigned roles, ensure PriestProfile exists
        if (requestedRoles.includes(Role.PRIEST) || requestedRoles.includes(Role.BISHOP)) {
          const isBishop = requestedRoles.includes(Role.BISHOP);
          const pNameAr = nameAr || fullName.trim();
          const pNameEn = nameEn || fullName.trim();
          const pTitleAr = titleAr || (isBishop ? 'سيدنا' : 'أبونا');
          const pTitleEn = titleEn || (isBishop ? 'Bishop' : 'Father');

          await tx.priestProfile.create({
            data: {
              userId: user.id,
              nameAr: pNameAr,
              nameEn: pNameEn,
              titleAr: pTitleAr,
              titleEn: pTitleEn,
              avatarUrl: avatarUrl || null,
              maxBookingsPerDay: isBishop ? 3 : 5,
              bufferMinutes: isBishop ? 20 : 15,
              availabilityJson: '{}'
            }
          });
        }

        return user;
      });

      await logAction(
        creator.userId,
        creator.email,
        creator.fullName,
        'CREATE_USER',
        `Created administrative account: ${result.email} with roles [${result.roles.join(', ')}] (${result.fullName})`
      );

      return res.status(201).json({
        message: 'Account created successfully.',
        messageAr: 'تم إنشاء الحساب وتعيين الرتب بنجاح.',
        user: {
          id: result.id,
          email: result.email,
          fullName: result.fullName,
          role: result.role,
          roles: result.roles
        }
      });
    } catch (error) {
      console.error('Error creating admin user:', error);
      return res.status(500).json({ error: 'Server error creating account.' });
    }
  }
);

// 2. List all administrative / role accounts
router.get(
  '/list',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER]),
  async (req: AuthRequest, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        where: {
          email: { not: 'marksamer010@gmail.com' },
          role: { not: Role.DEVELOPER },
          NOT: {
            roles: { has: Role.DEVELOPER }
          },
          OR: [
            { role: { not: Role.MEMBER } },
            { roles: { isEmpty: false } }
          ]
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          roles: true,
          phone: true,
          nationalId: true,
          isBanned: true,
          banReason: true,
          bannedAt: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      // Ensure every user has non-empty roles array
      const formatted = users.map(u => ({
        ...u,
        roles: (u.roles && u.roles.length > 0) ? u.roles : [u.role]
      }));

      return res.status(200).json(formatted);
    } catch (error) {
      console.error('Error retrieving admin users:', error);
      return res.status(500).json({ error: 'Server error retrieving users list.' });
    }
  }
);

// 3. Search any user in database (to promote, assign roles, or ban/unban)
router.get(
  '/search',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER]),
  async (req: AuthRequest, res: Response) => {
    const { query } = req.query;
    if (!query || String(query).trim().length < 2) {
      return res.status(200).json([]);
    }

    const cleanQuery = String(query).trim().toLowerCase();

    try {
      const users = await prisma.user.findMany({
        where: {
          email: { not: 'marksamer010@gmail.com' },
          role: { not: Role.DEVELOPER },
          NOT: {
            roles: { has: Role.DEVELOPER }
          },
          OR: [
            { email: { contains: cleanQuery, mode: 'insensitive' } },
            { fullName: { contains: cleanQuery, mode: 'insensitive' } },
            { phone: { contains: cleanQuery } },
            { nationalId: { contains: cleanQuery } }
          ]
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          roles: true,
          phone: true,
          nationalId: true,
          isBanned: true,
          banReason: true,
          bannedAt: true,
          createdAt: true
        },
        take: 20
      });

      const formatted = users.map(u => ({
        ...u,
        roles: (u.roles && u.roles.length > 0) ? u.roles : [u.role]
      }));

      return res.status(200).json(formatted);
    } catch (error) {
      console.error('Error searching users:', error);
      return res.status(500).json({ error: 'Server error searching users.' });
    }
  }
);

// 4. Update Roles for a User (Multiple roles support with hierarchy enforcement)
router.post(
  '/update-roles',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER]),
  async (req: AuthRequest, res: Response) => {
    const { userId, roles } = req.body;
    const caller = req.user!;
    const callerRoles = (caller.roles && caller.roles.length > 0) ? caller.roles : [caller.role];

    if (!userId || !Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({
        error: 'userId and a non-empty array of roles are required.',
        errorAr: 'يرجى تحديد المستخدم واختيار رتبة واحدة على الأقل.'
      });
    }

    const targetRoles = roles.map(r => String(r).trim().toUpperCase() as Role).filter(r => Object.values(Role).includes(r));
    if (targetRoles.length === 0) {
      return res.status(400).json({ error: 'Invalid roles specified.' });
    }

    try {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { priestProfile: true }
      });

      if (!targetUser) {
        return res.status(404).json({ error: 'User not found.', errorAr: 'المستخدم غير موجود.' });
      }

      // Check modification permissions on target user
      const modCheck = validateUserModification(caller.email, callerRoles, targetUser);
      if (!modCheck.allowed) {
        return res.status(403).json({ error: modCheck.errorEn, errorAr: modCheck.errorAr });
      }

      // Check assignment hierarchy
      const assignCheck = validateRoleAssignment(caller.email, callerRoles, targetRoles);
      if (!assignCheck.allowed) {
        return res.status(403).json({ error: assignCheck.errorEn, errorAr: assignCheck.errorAr });
      }

      const primaryRole = getPrimaryRole(targetRoles);

      const updatedUser = await prisma.$transaction(async (tx) => {
        // If newly added PRIEST or BISHOP and has no priest profile, create one
        if ((targetRoles.includes(Role.PRIEST) || targetRoles.includes(Role.BISHOP)) && !targetUser.priestProfile) {
          const isBishop = targetRoles.includes(Role.BISHOP);
          await tx.priestProfile.create({
            data: {
              userId: targetUser.id,
              nameAr: targetUser.fullName,
              nameEn: targetUser.fullName,
              titleAr: isBishop ? 'سيدنا' : 'أبونا',
              titleEn: isBishop ? 'Bishop' : 'Father',
              maxBookingsPerDay: isBishop ? 3 : 5,
              bufferMinutes: isBishop ? 20 : 15,
              availabilityJson: '{}'
            }
          });
        }

        return tx.user.update({
          where: { id: userId },
          data: {
            role: primaryRole,
            roles: targetRoles
          },
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            roles: true,
            isBanned: true
          }
        });
      });

      await logAction(
        caller.userId,
        caller.email,
        caller.fullName,
        'UPDATE_USER_ROLES',
        `Updated roles for ${updatedUser.email} to [${updatedUser.roles.join(', ')}] (Primary: ${updatedUser.role})`
      );

      return res.status(200).json({
        message: 'Roles updated successfully.',
        messageAr: `تم تحديث رتب ${updatedUser.fullName} بنجاح إلى [${updatedUser.roles.join(', ')}].`,
        user: updatedUser
      });
    } catch (error) {
      console.error('Error updating user roles:', error);
      return res.status(500).json({ error: 'Server error updating user roles.' });
    }
  }
);

// 4b. Retrieve all system users with their full profile details (Admin unrestricted view)
router.get(
  '/all-users',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER]),
  async (req: AuthRequest, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        where: {
          email: { not: 'marksamer010@gmail.com' },
          role: { not: Role.DEVELOPER },
          NOT: { roles: { has: Role.DEVELOPER } }
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          roles: true,
          phone: true,
          nationalId: true,
          isVerified: true,
          isBanned: true,
          banReason: true,
          bannedAt: true,
          createdAt: true,
          updatedAt: true,
          familyProfile: {
            select: {
              id: true,
              fullName: true,
              nationalId: true,
              job: true,
              socialStatus: true,
              street: true,
              buildingNumber: true,
              floor: true,
              apartment: true,
              phoneNumbers: true,
              status: true,
              wifeName: true,
              wifeNationalId: true,
              wifeJob: true,
              wifePhone: true,
              wifeEmail: true,
              childrenJson: true,
              relativesJson: true,
              servantsJson: true,
              notes: true
            }
          },
          priestProfile: {
            select: {
              id: true,
              nameAr: true,
              nameEn: true,
              titleAr: true,
              titleEn: true,
              avatarUrl: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const formatted = users.map(u => ({
        ...u,
        roles: (u.roles && u.roles.length > 0) ? u.roles : [u.role]
      }));

      return res.status(200).json(formatted);
    } catch (error) {
      console.error('Error retrieving all users:', error);
      return res.status(500).json({ error: 'Server error retrieving all users.' });
    }
  }
);

// 4c. Update any user data with NO restrictions (All data: name, email, password, phone, national ID, roles, verification, ban, family profile)
router.post(
  '/update-full-data',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER]),
  async (req: AuthRequest, res: Response) => {
    const {
      userId,
      fullName,
      email,
      password,
      phone,
      nationalId,
      roles,
      isVerified,
      isBanned,
      banReason,
      job,
      socialStatus,
      street,
      buildingNumber,
      floor,
      apartment,
      notes
    } = req.body;

    const caller = req.user!;
    const callerRoles = (caller.roles && caller.roles.length > 0) ? caller.roles : [caller.role];

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required.',
        errorAr: 'معرف المستخدم مطلوب.'
      });
    }

    try {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { familyProfile: true, priestProfile: true }
      });

      if (!targetUser) {
        return res.status(404).json({
          error: 'User not found.',
          errorAr: 'المستخدم غير موجود.'
        });
      }

      // Check modification permissions on target user (protect Master Developer)
      const modCheck = validateUserModification(caller.email, callerRoles, targetUser);
      if (!modCheck.allowed) {
        return res.status(403).json({ error: modCheck.errorEn, errorAr: modCheck.errorAr });
      }

      // 1. Email uniqueness check if changed
      const normalizedEmail = email ? String(email).trim().toLowerCase() : undefined;
      if (normalizedEmail && normalizedEmail !== targetUser.email.toLowerCase()) {
        const existingEmail = await prisma.user.findUnique({
          where: { email: normalizedEmail }
        });
        if (existingEmail && existingEmail.id !== targetUser.id) {
          return res.status(400).json({
            error: 'This email is already in use by another user.',
            errorAr: 'البريد الإلكتروني المدخل مستخدم بالفعل لحساب آخر.'
          });
        }
      }

      // 2. National ID uniqueness check if changed
      const cleanNationalId = nationalId !== undefined ? String(nationalId).trim() : undefined;
      if (cleanNationalId && cleanNationalId !== targetUser.nationalId) {
        const existingNat = await prisma.user.findFirst({
          where: { nationalId: cleanNationalId, id: { not: targetUser.id } }
        });
        if (existingNat) {
          return res.status(400).json({
            error: 'This National ID is already registered to another user.',
            errorAr: 'هذا الرقم القومي مسجل بالفعل لحساب شخص آخر.'
          });
        }
      }

      // 3. Process Roles if specified
      let updatedRole = targetUser.role;
      let updatedRoles = (targetUser.roles && targetUser.roles.length > 0) ? targetUser.roles : [targetUser.role];

      if (Array.isArray(roles) && roles.length > 0) {
        const targetRoles = roles.map(r => String(r).trim().toUpperCase() as Role).filter(r => Object.values(Role).includes(r));
        if (targetRoles.length > 0) {
          const assignCheck = validateRoleAssignment(caller.email, callerRoles, targetRoles);
          if (!assignCheck.allowed) {
            return res.status(403).json({ error: assignCheck.errorEn, errorAr: assignCheck.errorAr });
          }
          updatedRoles = targetRoles;
          updatedRole = getPrimaryRole(targetRoles);
        }
      }

      // 4. Password hashing if provided
      let newPasswordHash: string | undefined = undefined;
      if (password && String(password).trim().length >= 6) {
        newPasswordHash = await bcrypt.hash(String(password).trim(), 10);
      }

      // 5. Database Transaction to update User and linked FamilyHead atomically
      const updatedUser = await prisma.$transaction(async (tx) => {
        const userUpdateData: any = {};
        if (fullName !== undefined && String(fullName).trim()) userUpdateData.fullName = String(fullName).trim();
        if (normalizedEmail) userUpdateData.email = normalizedEmail;
        if (cleanNationalId !== undefined) userUpdateData.nationalId = cleanNationalId || null;
        if (phone !== undefined) userUpdateData.phone = String(phone).trim() || null;
        if (newPasswordHash) userUpdateData.passwordHash = newPasswordHash;
        if (isVerified !== undefined) userUpdateData.isVerified = Boolean(isVerified);

        userUpdateData.role = updatedRole;
        userUpdateData.roles = updatedRoles;

        if (isBanned !== undefined) {
          userUpdateData.isBanned = Boolean(isBanned);
          if (Boolean(isBanned)) {
            userUpdateData.banReason = banReason ? String(banReason).trim() : 'حظر من قِبل إدارة الكنيسة';
            userUpdateData.bannedAt = new Date();
          } else {
            userUpdateData.banReason = null;
            userUpdateData.bannedAt = null;
          }
        }

        const userSaved = await tx.user.update({
          where: { id: userId },
          data: userUpdateData,
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            nationalId: true,
            role: true,
            roles: true,
            isVerified: true,
            isBanned: true,
            banReason: true,
            bannedAt: true,
            createdAt: true,
            updatedAt: true
          }
        });

        // If target has priest role and no profile, create one
        if ((updatedRoles.includes(Role.PRIEST) || updatedRoles.includes(Role.BISHOP)) && !targetUser.priestProfile) {
          const isBishop = updatedRoles.includes(Role.BISHOP);
          await tx.priestProfile.create({
            data: {
              userId: targetUser.id,
              nameAr: userSaved.fullName,
              nameEn: userSaved.fullName,
              titleAr: isBishop ? 'سيدنا' : 'أبونا',
              titleEn: isBishop ? 'Bishop' : 'Father',
              maxBookingsPerDay: isBishop ? 3 : 5,
              bufferMinutes: isBishop ? 20 : 15,
              availabilityJson: '{}'
            }
          });
        }

        // Synchronize linked familyProfile if exists
        if (targetUser.familyProfile) {
          const famUpdateData: any = {};
          if (userSaved.fullName) famUpdateData.fullName = userSaved.fullName;
          if (cleanNationalId !== undefined) famUpdateData.nationalId = cleanNationalId;
          if (userSaved.phone !== undefined) famUpdateData.phoneNumbers = userSaved.phone;
          if (userSaved.email) famUpdateData.email = userSaved.email;
          if (job !== undefined) famUpdateData.job = String(job).trim();
          if (socialStatus !== undefined) famUpdateData.socialStatus = String(socialStatus).trim();
          if (street !== undefined) famUpdateData.street = String(street).trim();
          if (buildingNumber !== undefined) famUpdateData.buildingNumber = String(buildingNumber).trim();
          if (floor !== undefined) famUpdateData.floor = String(floor).trim();
          if (apartment !== undefined) famUpdateData.apartment = String(apartment).trim();
          if (notes !== undefined) famUpdateData.notes = String(notes).trim();

          await tx.familyHead.update({
            where: { id: targetUser.familyProfile.id },
            data: famUpdateData
          });
        }

        if (targetUser.nationalId && cleanNationalId && cleanNationalId !== targetUser.nationalId) {
          await tx.familyHead.updateMany({
            where: { wifeNationalId: targetUser.nationalId },
            data: { wifeNationalId: cleanNationalId }
          });
        }

        return userSaved;
      });

      await logAction(
        caller.userId,
        caller.email,
        caller.fullName,
        'UPDATE_USER_FULL_DATA',
        `Admin updated all user data for ${updatedUser.email} (${updatedUser.fullName}, roles: [${updatedUser.roles.join(', ')}])`
      );

      return res.status(200).json({
        success: true,
        message: 'User data updated successfully with no restrictions.',
        messageAr: `تم تحديث كافة بيانات المستخدم (${updatedUser.fullName}) بنجاح وبدون أي قيود.`,
        user: updatedUser
      });
    } catch (error: any) {
      console.error('Error updating full user data:', error);
      return res.status(500).json({
        error: error.message || 'Server error updating user data.',
        errorAr: 'حدث خطأ في الخادم أثناء تحديث بيانات المستخدم.'
      });
    }
  }
);

// 5. Account Ban (Non-IP ban: blocks login and invalidates active JWT checks)
router.post(
  '/ban',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER]),
  async (req: AuthRequest, res: Response) => {
    const { userId, reason } = req.body;
    const caller = req.user!;
    const callerRoles = (caller.roles && caller.roles.length > 0) ? caller.roles : [caller.role];

    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' });
    }

    try {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!targetUser) {
        return res.status(404).json({ error: 'User not found.', errorAr: 'المستخدم غير موجود.' });
      }

      // Check modification permissions on target user
      const modCheck = validateUserModification(caller.email, callerRoles, targetUser);
      if (!modCheck.allowed) {
        return res.status(403).json({ error: modCheck.errorEn, errorAr: modCheck.errorAr });
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: true,
          banReason: reason ? String(reason).trim() : 'مخالفة تعليمات وسياسات الكنيسة',
          bannedAt: new Date(),
          refreshToken: null // Invalidate refresh token immediately
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          isBanned: true,
          banReason: true,
          bannedAt: true
        }
      });

      await logAction(
        caller.userId,
        caller.email,
        caller.fullName,
        'BAN_USER',
        `Banned account ${updated.email} (${updated.fullName}). Reason: ${updated.banReason}`
      );

      return res.status(200).json({
        message: 'User banned successfully.',
        messageAr: `تم حظر حساب ${updated.fullName} بنجاح. لن يتمكن من تسجيل الدخول.`,
        user: updated
      });
    } catch (error) {
      console.error('Error banning user:', error);
      return res.status(500).json({ error: 'Server error banning user.' });
    }
  }
);

// 6. Account Unban
router.post(
  '/unban',
  requireAuth,
  requireRoles([Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.DEVELOPER]),
  async (req: AuthRequest, res: Response) => {
    const { userId } = req.body;
    const caller = req.user!;
    const callerRoles = (caller.roles && caller.roles.length > 0) ? caller.roles : [caller.role];

    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' });
    }

    try {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!targetUser) {
        return res.status(404).json({ error: 'User not found.', errorAr: 'المستخدم غير موجود.' });
      }

      // Check modification permissions on target user
      const modCheck = validateUserModification(caller.email, callerRoles, targetUser);
      if (!modCheck.allowed) {
        return res.status(403).json({ error: modCheck.errorEn, errorAr: modCheck.errorAr });
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          isBanned: false,
          banReason: null,
          bannedAt: null
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          isBanned: true
        }
      });

      await logAction(
        caller.userId,
        caller.email,
        caller.fullName,
        'UNBAN_USER',
        `Unbanned account ${updated.email} (${updated.fullName})`
      );

      return res.status(200).json({
        message: 'User unbanned successfully.',
        messageAr: `تم إلغاء حظر حساب ${updated.fullName} بنجاح.`,
        user: updated
      });
    } catch (error) {
      console.error('Error unbanning user:', error);
      return res.status(500).json({ error: 'Server error unbanning user.' });
    }
  }
);

// 7. View System Logs (Super Admin / Developer only)
router.get('/action-logs', requireAuth, requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER]), async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.actionLog.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json(logs);
  } catch (error) {
    console.error('Error retrieving action logs:', error);
    return res.status(500).json({ error: 'Server error retrieving logs.' });
  }
});

// 8. Impersonate User (Super Admin / Developer can enter any priest or admin account)
router.post('/impersonate', requireAuth, requireRoles([Role.SUPER_ADMIN, Role.DEVELOPER]), async (req: AuthRequest, res: Response) => {
  const { targetUserId, targetEmail } = req.body;
  const caller = req.user!;

  if (!targetUserId && !targetEmail) {
    return res.status(400).json({ error: 'targetUserId or targetEmail is required.' });
  }

  try {
    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(targetUserId ? [{ id: targetUserId }] : []),
          ...(targetEmail ? [{ email: targetEmail }] : [])
        ]
      },
      include: { familyProfile: true }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    if (targetUser.isBanned) {
      return res.status(403).json({ error: 'Cannot impersonate a banned account.' });
    }

    const userRoles = (targetUser.roles && targetUser.roles.length > 0) ? targetUser.roles : [targetUser.role];
    const payload = {
      userId: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      roles: userRoles,
      fullName: targetUser.fullName,
      isVerified: targetUser.isVerified,
      isBanned: targetUser.isBanned
    };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    const refreshToken = jwt.sign({ userId: targetUser.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    await logAction(
      caller.userId,
      caller.email,
      caller.fullName,
      'IMPERSONATE_USER',
      `Super Admin logged in as user ${targetUser.email} (${targetUser.fullName}, ${targetUser.role})`
    );

    return res.status(200).json({
      message: `Successfully logged in as ${targetUser.fullName}`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        fullName: targetUser.fullName,
        role: targetUser.role,
        roles: userRoles,
        isVerified: targetUser.isVerified,
        isBanned: targetUser.isBanned,
        hasFamilyProfile: !!targetUser.familyProfile,
        familyProfileStatus: targetUser.familyProfile?.status || null
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Error during impersonation:', error);
    return res.status(500).json({ error: 'Server error during impersonation.' });
  }
});

export default router;
