import prisma from '../db';
import { MembershipStatus, Role } from '@prisma/client';
import { normalizeEgyptianNationalId, maskEgyptianNationalId, validateAndParseEgyptianNationalId } from '../utils/nationalId';

export interface CanonicalFamilyMembershipData {
  hasMembership: boolean;
  canonicalId: string | null;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'NOT_SUBMITTED';
  isPrimaryHead: boolean;
  relationshipToHead: 'PRIMARY_HEAD' | 'WIFE' | 'CHILD' | 'RELATIVE' | 'MEMBER';
  headFullName: string | null;
  headMaskedPhone: string | null;
  headMaskedNationalId: string | null;
  notes: string | null;
  updatedAt: Date | null;
  createdAt: Date | null;
  canEditApplication: boolean;
  familyMembersCount: number;
  familyDetails: {
    address: {
      street: string;
      buildingNumber: string;
      floor: string;
      apartment: string;
    };
    socialStatus: string;
    wife?: {
      name: string;
      job?: string;
      maskedNationalId?: string;
    } | null;
    children: Array<{
      name: string;
      maskedNationalId: string;
      educationOrJob?: string;
      phoneMasked?: string;
    }>;
    relatives: Array<{
      name: string;
      maskedNationalId: string;
      relationshipType: string;
    }>;
  } | null;
}

/**
 * Searches and links an individual user account to an existing canonical FamilyHead membership
 * by matching the user's validated Egyptian National ID against:
 * 1. Primary Head nationalId
 * 2. Wife wifeNationalId
 * 3. Children childrenJson
 * 4. Relatives relativesJson
 */
export async function getCanonicalFamilyMembership(userId: string): Promise<CanonicalFamilyMembershipData> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      familyProfile: true,
      linkedFamilyHead: true
    }
  });

  if (!user) {
    return {
      hasMembership: false,
      canonicalId: null,
      status: 'NOT_SUBMITTED',
      isPrimaryHead: false,
      relationshipToHead: 'MEMBER',
      headFullName: null,
      headMaskedPhone: null,
      headMaskedNationalId: null,
      notes: null,
      updatedAt: null,
      createdAt: null,
      canEditApplication: false,
      familyMembersCount: 0,
      familyDetails: null
    };
  }

  let canonicalHead = user.familyProfile || user.linkedFamilyHead;
  const cleanUserNatId = normalizeEgyptianNationalId(user.nationalId);

  // If not linked yet, but user has a national ID, check if they belong to any existing FamilyHead
  if (!canonicalHead && cleanUserNatId) {
    // 1. Direct search by head or wife nationalId
    let matchedHead = await prisma.familyHead.findFirst({
      where: {
        OR: [
          { nationalId: cleanUserNatId },
          { wifeNationalId: cleanUserNatId }
        ]
      }
    });

    // 2. If not found, search inside childrenJson or relativesJson
    if (!matchedHead) {
      const allFamilies = await prisma.familyHead.findMany({
        where: {
          OR: [
            { childrenJson: { contains: cleanUserNatId } },
            { relativesJson: { contains: cleanUserNatId } }
          ]
        }
      });

      for (const fam of allFamilies) {
        let isMatch = false;
        try {
          const children = JSON.parse(fam.childrenJson || '[]');
          if (children.some((c: any) => normalizeEgyptianNationalId(c.nationalId) === cleanUserNatId)) {
            isMatch = true;
          }
        } catch {}

        if (!isMatch) {
          try {
            const relatives = JSON.parse(fam.relativesJson || '[]');
            if (relatives.some((r: any) => normalizeEgyptianNationalId(r.nationalId) === cleanUserNatId)) {
              isMatch = true;
            }
          } catch {}
        }

        if (isMatch) {
          matchedHead = fam;
          break;
        }
      }
    }

    // Link the user transactionally if found
    if (matchedHead) {
      canonicalHead = matchedHead;
      await prisma.user.update({
        where: { id: userId },
        data: {
          linkedFamilyHeadId: matchedHead.id,
          // Inherit verified status if approved
          isVerified: matchedHead.status === MembershipStatus.APPROVED ? true : user.isVerified
        }
      });
    }
  }

  if (!canonicalHead) {
    return {
      hasMembership: false,
      canonicalId: null,
      status: 'NOT_SUBMITTED',
      isPrimaryHead: false,
      relationshipToHead: 'MEMBER',
      headFullName: null,
      headMaskedPhone: null,
      headMaskedNationalId: null,
      notes: null,
      updatedAt: null,
      createdAt: null,
      canEditApplication: true, // No membership found, can submit new application
      familyMembersCount: 0,
      familyDetails: null
    };
  }

  // Determine relationship to primary head
  const isPrimaryHead = canonicalHead.userId === user.id || normalizeEgyptianNationalId(canonicalHead.nationalId) === cleanUserNatId;
  let relationshipToHead: 'PRIMARY_HEAD' | 'WIFE' | 'CHILD' | 'RELATIVE' | 'MEMBER' = 'MEMBER';

  if (isPrimaryHead) {
    relationshipToHead = 'PRIMARY_HEAD';
  } else if (canonicalHead.wifeNationalId && normalizeEgyptianNationalId(canonicalHead.wifeNationalId) === cleanUserNatId) {
    relationshipToHead = 'WIFE';
  } else {
    try {
      const children = JSON.parse(canonicalHead.childrenJson || '[]');
      if (children.some((c: any) => normalizeEgyptianNationalId(c.nationalId) === cleanUserNatId)) {
        relationshipToHead = 'CHILD';
      }
    } catch {}

    if (relationshipToHead === 'MEMBER') {
      try {
        const relatives = JSON.parse(canonicalHead.relativesJson || '[]');
        if (relatives.some((r: any) => normalizeEgyptianNationalId(r.nationalId) === cleanUserNatId)) {
          relationshipToHead = 'RELATIVE';
        }
      } catch {}
    }
  }

  // Parse children & relatives safely with masked national IDs for privacy
  let childrenList: any[] = [];
  try {
    const rawChildren = JSON.parse(canonicalHead.childrenJson || '[]');
    childrenList = rawChildren.map((c: any) => ({
      name: c.name || '',
      maskedNationalId: c.nationalId ? maskEgyptianNationalId(c.nationalId) : '',
      educationOrJob: c.educationOrJob || '',
      phoneMasked: c.phone ? `${c.phone.slice(0, 3)}****${c.phone.slice(-3)}` : undefined
    }));
  } catch {}

  let relativesList: any[] = [];
  try {
    const rawRelatives = JSON.parse(canonicalHead.relativesJson || '[]');
    relativesList = rawRelatives.map((r: any) => ({
      name: r.name || '',
      maskedNationalId: r.nationalId ? maskEgyptianNationalId(r.nationalId) : '',
      relationshipType: r.relationshipType || ''
    }));
  } catch {}

  // Calculate total members in this family (Head + Wife + Children + Relatives)
  let count = 1; // Head
  if (canonicalHead.wifeName || canonicalHead.wifeNationalId) count++;
  count += childrenList.length;
  count += relativesList.length;

  // Mask head phone
  const rawPhone = (canonicalHead.phoneNumbers || '').split(',')[0].trim();
  const headMaskedPhone = rawPhone.length > 6 ? `${rawPhone.slice(0, 3)}****${rawPhone.slice(-3)}` : rawPhone;

  return {
    hasMembership: true,
    canonicalId: canonicalHead.id,
    status: canonicalHead.status,
    isPrimaryHead,
    relationshipToHead,
    headFullName: canonicalHead.fullName,
    headMaskedPhone,
    headMaskedNationalId: maskEgyptianNationalId(canonicalHead.nationalId),
    notes: canonicalHead.notes,
    updatedAt: canonicalHead.updatedAt,
    createdAt: canonicalHead.createdAt,
    canEditApplication: isPrimaryHead, // Only primary head can edit/resubmit the application
    familyMembersCount: count,
    familyDetails: {
      address: {
        street: canonicalHead.street,
        buildingNumber: canonicalHead.buildingNumber,
        floor: canonicalHead.floor,
        apartment: canonicalHead.apartment
      },
      socialStatus: canonicalHead.socialStatus,
      wife: canonicalHead.wifeName ? {
        name: canonicalHead.wifeName,
        job: canonicalHead.wifeJob || undefined,
        maskedNationalId: canonicalHead.wifeNationalId ? maskEgyptianNationalId(canonicalHead.wifeNationalId) : undefined
      } : null,
      children: childrenList,
      relatives: relativesList
    }
  };
}

/**
 * Checks whether a given user is an approved church member (either as an ordained role,
 * or through an approved canonical family membership).
 */
export async function isUserVerifiedChurchMember(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      roles: true,
      nationalId: true,
      familyProfile: { select: { status: true } },
      linkedFamilyHead: { select: { status: true } }
    }
  });

  if (!user) return false;

  // Clergy & Staff always have church member rights
  const userRoles = [user.role, ...(Array.isArray(user.roles) ? user.roles : [])];
  if (userRoles.some(r => ([Role.PRIEST, Role.BISHOP, Role.SUPER_ADMIN, Role.CHURCH_ADMIN, Role.SECRETARY, Role.DEVELOPER] as Role[]).includes(r))) {
    return true;
  }

  // Check directly loaded relations
  if (user.familyProfile?.status === MembershipStatus.APPROVED) return true;
  if (user.linkedFamilyHead?.status === MembershipStatus.APPROVED) return true;

  // Fallback to canonical resolution
  const canonical = await getCanonicalFamilyMembership(userId);
  return canonical.status === 'APPROVED';
}
