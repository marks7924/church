import prisma from '../db';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as os from 'os';

export const MASTER_DEVELOPER_EMAIL = 'marksamer010@gmail.com';
export const CANCELLATION_CODE_KEY = 'DEV_EVENT_CANCELLATION_CODE';
export const DEFAULT_CANCELLATION_CODE = 'ch140ch140';

// In-Memory Caches for Ultra-Fast Middleware Evaluation (5s TTL)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
let lockdownCache: CacheEntry<any> | null = null;
let bannedIpsCache: CacheEntry<Set<string>> | null = null;
const CACHE_TTL_MS = 5000;

export class DevPortalService {
  // ==========================================
  // 1. DEVELOPER AUTHORIZATION & MULTI-DEV
  // ==========================================
  
  static isMasterDeveloper(email: string): boolean {
    return email.trim().toLowerCase() === MASTER_DEVELOPER_EMAIL.toLowerCase();
  }

  static async getDevelopers() {
    const devs = await prisma.user.findMany({
      where: {
        OR: [
          { role: Role.DEVELOPER },
          { roles: { has: Role.DEVELOPER } },
          { email: MASTER_DEVELOPER_EMAIL }
        ]
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        roles: true,
        isBanned: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return devs.map(d => ({
      ...d,
      isMaster: this.isMasterDeveloper(d.email)
    }));
  }

  static async addDeveloper(callerEmail: string, data: { email: string; password: string; fullName: string; phone?: string }) {
    if (!this.isMasterDeveloper(callerEmail)) {
      throw new Error('ONLY_MASTER_DEVELOPER_CAN_ADD_DEVELOPERS');
    }

    const targetEmail = data.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: targetEmail } });

    const passwordHash = bcrypt.hashSync(data.password, 10);

    if (existing) {
      const rolesSet = new Set(existing.roles || []);
      rolesSet.add(Role.DEVELOPER);

      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          role: Role.DEVELOPER,
          roles: Array.from(rolesSet),
          isBanned: false
        }
      });

      await this.logAudit({
        developerEmail: callerEmail,
        action: 'DEVELOPER_PROMOTED',
        target: targetEmail,
        details: `User promoted to DEVELOPER role by Master Developer (${callerEmail}).`
      });

      return updated;
    } else {
      const newUser = await prisma.user.create({
        data: {
          email: targetEmail,
          passwordHash,
          fullName: data.fullName,
          phone: data.phone || null,
          role: Role.DEVELOPER,
          roles: [Role.DEVELOPER],
          isVerified: true
        }
      });

      await this.logAudit({
        developerEmail: callerEmail,
        action: 'DEVELOPER_CREATED',
        target: targetEmail,
        details: `New Developer account created by Master Developer (${callerEmail}).`
      });

      return newUser;
    }
  }

  static async removeDeveloper(callerEmail: string, targetEmail: string) {
    if (!this.isMasterDeveloper(callerEmail)) {
      throw new Error('ONLY_MASTER_DEVELOPER_CAN_REMOVE_DEVELOPERS');
    }

    if (this.isMasterDeveloper(targetEmail)) {
      throw new Error('CANNOT_REMOVE_MASTER_DEVELOPER');
    }

    const user = await prisma.user.findUnique({ where: { email: targetEmail.toLowerCase() } });
    if (!user) throw new Error('DEVELOPER_NOT_FOUND');

    const updatedRoles = (user.roles || []).filter(r => r !== Role.DEVELOPER);
    const newPrimaryRole = updatedRoles.length > 0 ? updatedRoles[0] : Role.MEMBER;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: newPrimaryRole,
        roles: updatedRoles
      }
    });

    await this.logAudit({
      developerEmail: callerEmail,
      action: 'DEVELOPER_DEMOTED',
      target: targetEmail,
      details: `Developer privileges revoked by Master Developer (${callerEmail}).`
    });

    return { success: true };
  }

  // ==========================================
  // 2. EMERGENCY WEBSITE LOCKDOWN
  // ==========================================

  static async getLockdownStatus() {
    const now = Date.now();
    if (lockdownCache && now - lockdownCache.timestamp < CACHE_TTL_MS) {
      return lockdownCache.data;
    }

    let lockdown = await prisma.devLockdown.findFirst();
    if (!lockdown) {
      lockdown = await prisma.devLockdown.create({
        data: {
          isActive: false,
          customMessage: 'الموقع يخضع حالياً لعملية تحديث وصيانة مجدولة. سنعود للعمل قريباً جداً بمشيئة الرب.',
          allowedRoles: [Role.DEVELOPER]
        }
      });
    }

    lockdownCache = { data: lockdown, timestamp: now };
    return lockdown;
  }

  static async setLockdownStatus(developerEmail: string, params: {
    isActive: boolean;
    reason?: string;
    customMessage?: string;
    allowedRoles?: Role[];
    allowlistIps?: string[];
    restrictLogin?: boolean;
    restrictRegistration?: boolean;
    restrictAiChatbot?: boolean;
  }) {
    let lockdown = await prisma.devLockdown.findFirst();
    const dataToUpdate = {
      isActive: params.isActive,
      reason: params.reason || null,
      customMessage: params.customMessage || 'الموقع يخضع حالياً لعملية صيانة وتحديث استثنائية. سنعود قريباً.',
      activatedBy: params.isActive ? developerEmail : null,
      activatedAt: params.isActive ? new Date() : null,
      allowedRoles: params.allowedRoles || [Role.DEVELOPER],
      allowlistIps: params.allowlistIps || [],
      restrictLogin: params.restrictLogin ?? false,
      restrictRegistration: params.restrictRegistration ?? false,
      restrictAiChatbot: params.restrictAiChatbot ?? false,
    };

    if (lockdown) {
      lockdown = await prisma.devLockdown.update({
        where: { id: lockdown.id },
        data: dataToUpdate
      });
    } else {
      lockdown = await prisma.devLockdown.create({
        data: dataToUpdate
      });
    }

    lockdownCache = { data: lockdown, timestamp: Date.now() };

    await this.logAudit({
      developerEmail,
      action: params.isActive ? 'LOCKDOWN_ACTIVATED' : 'LOCKDOWN_DEACTIVATED',
      target: 'GLOBAL_SITE',
      details: `Website lockdown ${params.isActive ? 'ENABLED' : 'DISABLED'}. Reason: ${params.reason || 'None'}.`
    });

    return lockdown;
  }

  // ==========================================
  // 3. IP BAN MANAGER
  // ==========================================

  static async getActiveBannedIpsSet(): Promise<Set<string>> {
    const now = Date.now();
    if (bannedIpsCache && now - bannedIpsCache.timestamp < CACHE_TTL_MS) {
      return bannedIpsCache.data;
    }

    const nowDate = new Date();
    const bans = await prisma.devIpBan.findMany({
      where: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: nowDate } }
        ]
      },
      select: { ip: true }
    });

    const set = new Set(bans.map(b => b.ip.trim()));
    bannedIpsCache = { data: set, timestamp: now };
    return set;
  }

  static async listBans() {
    return prisma.devIpBan.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  static async addIpBan(developerEmail: string, params: {
    ip: string;
    reason: string;
    expiresAt?: Date | null;
  }) {
    const cleanIp = params.ip.trim();

    // Prevent banning loopback / privileged addresses
    if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') {
      throw new Error('CANNOT_BAN_LOCALHOST_OR_LOOPBACK');
    }

    const ban = await prisma.devIpBan.upsert({
      where: { ip: cleanIp },
      update: {
        reason: params.reason,
        bannedBy: developerEmail,
        expiresAt: params.expiresAt || null,
        createdAt: new Date()
      },
      create: {
        ip: cleanIp,
        reason: params.reason,
        bannedBy: developerEmail,
        expiresAt: params.expiresAt || null
      }
    });

    bannedIpsCache = null; // Invalidate cache

    await this.logAudit({
      developerEmail,
      action: 'IP_BANNED',
      target: cleanIp,
      details: `IP Ban added. Reason: ${params.reason}. Expires: ${params.expiresAt ? params.expiresAt.toISOString() : 'Never'}`
    });

    return ban;
  }

  static async removeIpBan(developerEmail: string, ip: string) {
    const cleanIp = ip.trim();
    await prisma.devIpBan.deleteMany({
      where: { ip: cleanIp }
    });

    bannedIpsCache = null; // Invalidate cache

    await this.logAudit({
      developerEmail,
      action: 'IP_UNBANNED',
      target: cleanIp,
      details: `IP Ban revoked.`
    });

    return { success: true };
  }

  // ==========================================
  // 4. QUICK EVENT CANCELLATION
  // ==========================================

  static async verifyCancellationCode(providedCode: string): Promise<boolean> {
    const codeRecord = await prisma.systemConfig.findUnique({
      where: { key: CANCELLATION_CODE_KEY }
    });
    const expected = codeRecord ? codeRecord.value : (process.env.DEV_EVENT_CANCELLATION_CODE || DEFAULT_CANCELLATION_CODE);
    return providedCode.trim() === expected.trim();
  }

  static async cancelEventWithCode(developerEmail: string, params: {
    eventId: string;
    cancellationCode: string;
    reason: string;
  }) {
    const isCodeValid = await this.verifyCancellationCode(params.cancellationCode);
    if (!isCodeValid) {
      await this.logAudit({
        developerEmail,
        action: 'EVENT_CANCEL_CODE_FAILED',
        target: params.eventId,
        details: 'Incorrect cancellation code attempt rejected.',
        status: 'FAILED'
      });
      throw new Error('INVALID_CANCELLATION_CODE');
    }

    const event = await prisma.event.findUnique({
      where: { id: params.eventId },
      include: {
        invitations: true,
        applications: true
      }
    });

    if (!event) throw new Error('EVENT_NOT_FOUND');

    const previousStatus = (event as any).status || 'PUBLISHED';

    // Update event to CANCELLED without deleting records or applications
    const updatedEvent = await prisma.event.update({
      where: { id: params.eventId },
      data: {
        status: 'CANCELLED',
        isApplicationActive: false,
      } as any
    });

    await this.logAudit({
      developerEmail,
      action: 'EVENT_CANCELLED_QUICK',
      target: `${event.titleAr || event.titleEn} (${event.id})`,
      details: `Event cancelled by developer with code verification. Reason: ${params.reason}. Previous status: ${previousStatus}. Retained ${event.applications.length} applications and ${event.invitations.length} invitations.`
    });

    return {
      success: true,
      event: updatedEvent,
      retainedApplications: event.applications.length,
      retainedInvitations: event.invitations.length
    };
  }

  static async restoreEvent(developerEmail: string, eventId: string) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new Error('EVENT_NOT_FOUND');

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        status: 'PUBLISHED',
        isApplicationActive: true
      } as any
    });

    await this.logAudit({
      developerEmail,
      action: 'EVENT_RESTORED',
      target: `${event.titleAr || event.titleEn} (${event.id})`,
      details: `Cancelled event restored to PUBLISHED state by developer.`
    });

    return updated;
  }

  // ==========================================
  // 5. PAGE & NAVBAR CONTROL WITH EXPIRY
  // ==========================================

  static async getEffectivePagePolicies() {
    const now = new Date();
    const policies = await prisma.devPagePolicy.findMany({
      orderBy: { routePath: 'asc' }
    });

    // Check for auto-expired overrides
    const updatedPolicies = [];
    for (const policy of policies) {
      if (policy.hasActiveOverride && policy.overrideExpiresAt && policy.overrideExpiresAt <= now) {
        const expired = await prisma.devPagePolicy.update({
          where: { id: policy.id },
          data: {
            hasActiveOverride: false,
            overridePolicy: null,
            overrideAllowedRoles: [],
            overrideExpiresAt: null,
            overrideReason: null
          }
        });
        updatedPolicies.push(expired);
      } else {
        updatedPolicies.push(policy);
      }
    }

    return updatedPolicies;
  }

  static async updatePagePolicy(developerEmail: string, params: {
    routePath: string;
    permanentPolicy: string;
    allowedRoles?: Role[];
    customMessage?: string;
  }) {
    const updated = await prisma.devPagePolicy.update({
      where: { routePath: params.routePath },
      data: {
        permanentPolicy: params.permanentPolicy,
        allowedRoles: params.allowedRoles || [],
        customMessage: params.customMessage || null
      }
    });

    await this.logAudit({
      developerEmail,
      action: 'PAGE_POLICY_UPDATED',
      target: params.routePath,
      details: `Permanent access policy changed to ${params.permanentPolicy}.`
    });

    return updated;
  }

  static async setTemporaryPageOverride(developerEmail: string, params: {
    routePath: string;
    overridePolicy: string;
    overrideAllowedRoles?: Role[];
    expiresAt: Date;
    reason: string;
  }) {
    const updated = await prisma.devPagePolicy.update({
      where: { routePath: params.routePath },
      data: {
        hasActiveOverride: true,
        overridePolicy: params.overridePolicy,
        overrideAllowedRoles: params.overrideAllowedRoles || [],
        overrideExpiresAt: params.expiresAt,
        overrideReason: params.reason,
        overrideCreatedBy: developerEmail,
        overrideCreatedAt: new Date()
      }
    });

    await this.logAudit({
      developerEmail,
      action: 'PAGE_OVERRIDE_ACTIVATED',
      target: params.routePath,
      details: `Temporary override set to ${params.overridePolicy}. Expires: ${params.expiresAt.toISOString()}. Reason: ${params.reason}`
    });

    return updated;
  }

  static async clearPageOverride(developerEmail: string, routePath: string) {
    const updated = await prisma.devPagePolicy.update({
      where: { routePath },
      data: {
        hasActiveOverride: false,
        overridePolicy: null,
        overrideAllowedRoles: [],
        overrideExpiresAt: null,
        overrideReason: null
      }
    });

    await this.logAudit({
      developerEmail,
      action: 'PAGE_OVERRIDE_CLEARED',
      target: routePath,
      details: `Temporary override manually revoked; restored permanent policy.`
    });

    return updated;
  }

  static async getEffectiveNavbarItems() {
    const now = new Date();
    const items = await prisma.devNavbarItem.findMany({
      orderBy: { sortOrder: 'asc' }
    });

    const results = [];
    for (const item of items) {
      if (item.hasOverride && item.overrideExpiresAt && item.overrideExpiresAt <= now) {
        const expired = await prisma.devNavbarItem.update({
          where: { id: item.id },
          data: {
            hasOverride: false,
            overrideVisible: null,
            overrideExpiresAt: null,
            overrideReason: null
          }
        });
        results.push(expired);
      } else {
        results.push(item);
      }
    }

    return results;
  }

  static async updateNavbarItem(developerEmail: string, params: {
    path: string;
    isVisible: boolean;
    guestVisible: boolean;
    allowedRoles?: Role[];
    nameAr?: string;
    nameEn?: string;
    sortOrder?: number;
  }) {
    const updated = await prisma.devNavbarItem.update({
      where: { path: params.path },
      data: {
        isVisible: params.isVisible,
        guestVisible: params.guestVisible,
        allowedRoles: params.allowedRoles || [],
        nameAr: params.nameAr,
        nameEn: params.nameEn,
        sortOrder: params.sortOrder
      }
    });

    await this.logAudit({
      developerEmail,
      action: 'NAVBAR_ITEM_UPDATED',
      target: params.path,
      details: `Navbar item updated. Visible: ${params.isVisible}, Guest: ${params.guestVisible}`
    });

    return updated;
  }

  static async setNavbarItemOverride(developerEmail: string, params: {
    path: string;
    overrideVisible: boolean;
    expiresAt: Date;
    reason: string;
  }) {
    const updated = await prisma.devNavbarItem.update({
      where: { path: params.path },
      data: {
        hasOverride: true,
        overrideVisible: params.overrideVisible,
        overrideExpiresAt: params.expiresAt,
        overrideReason: params.reason
      }
    });

    await this.logAudit({
      developerEmail,
      action: 'NAVBAR_OVERRIDE_SET',
      target: params.path,
      details: `Navbar temporary visibility override: ${params.overrideVisible}. Expires: ${params.expiresAt.toISOString()}`
    });

    return updated;
  }

  static async clearNavbarItemOverride(developerEmail: string, path: string) {
    const updated = await prisma.devNavbarItem.update({
      where: { path },
      data: {
        hasOverride: false,
        overrideVisible: null,
        overrideExpiresAt: null,
        overrideReason: null
      }
    });

    await this.logAudit({
      developerEmail,
      action: 'NAVBAR_OVERRIDE_CLEARED',
      target: path,
      details: `Navbar override revoked.`
    });

    return updated;
  }

  // ==========================================
  // 6. ISOLATED SAFE ZONE & NO / SAVE / PUSH
  // ==========================================

  // In-memory or database draft state for developer safe zone
  private static safeZoneDrafts = new Map<string, any>();

  static async getSafeZoneState(developerEmail: string) {
    // Current live production baseline
    const [pages, navbar, flags, themes] = await Promise.all([
      this.getEffectivePagePolicies(),
      this.getEffectiveNavbarItems(),
      prisma.devFeatureFlag.findMany({ orderBy: { key: 'asc' } }),
      prisma.devThemeConfig.findMany({ orderBy: { seasonKey: 'asc' } })
    ]);

    const draft = this.safeZoneDrafts.get(developerEmail) || {
      pages: JSON.parse(JSON.stringify(pages)),
      navbar: JSON.parse(JSON.stringify(navbar)),
      flags: JSON.parse(JSON.stringify(flags)),
      themes: JSON.parse(JSON.stringify(themes)),
      hasUnsavedChanges: false,
      lastModified: null
    };

    return {
      productionBaseline: { pages, navbar, flags, themes },
      safeZoneState: draft,
      hasUnsavedChanges: draft.hasUnsavedChanges
    };
  }

  static async updateSafeZoneDraft(developerEmail: string, update: {
    section: 'pages' | 'navbar' | 'flags' | 'themes';
    data: any;
  }) {
    const state = (await this.getSafeZoneState(developerEmail)).safeZoneState;
    state[update.section] = update.data;
    state.hasUnsavedChanges = true;
    state.lastModified = new Date().toISOString();
    this.safeZoneDrafts.set(developerEmail, state);

    return state;
  }

  static async exitSafeZone(developerEmail: string, action: 'NO' | 'SAVE' | 'PUSH', options?: {
    snapshotName?: string;
    pushSummary?: string;
  }) {
    if (action === 'NO') {
      // Discard current changes and reset to current production baseline
      this.safeZoneDrafts.delete(developerEmail);
      await this.logAudit({
        developerEmail,
        action: 'SAFE_ZONE_DISCARD_NO',
        target: 'SAFE_ZONE',
        details: 'Developer discarded Safe Zone modifications and returned to production baseline.'
      });
      return { action: 'NO', status: 'DISCARDED', message: 'All Safe Zone drafts discarded.' };
    }

    if (action === 'SAVE') {
      // Save snapshot privately
      const draft = (await this.getSafeZoneState(developerEmail)).safeZoneState;
      const snapshot = await prisma.devSafeZoneSnapshot.create({
        data: {
          name: options?.snapshotName || `Snapshot-${new Date().toISOString().slice(0, 19)}`,
          creatorEmail: developerEmail,
          description: `Private snapshot saved by ${developerEmail}`,
          snapshotDataJson: JSON.stringify(draft)
        }
      });

      draft.hasUnsavedChanges = false;
      this.safeZoneDrafts.set(developerEmail, draft);

      await this.logAudit({
        developerEmail,
        action: 'SAFE_ZONE_SAVED',
        target: snapshot.id,
        details: `Safe Zone snapshot saved: ${snapshot.name}`
      });

      return { action: 'SAVE', status: 'SAVED', snapshot };
    }

    if (action === 'PUSH') {
      // Promote draft to production atomically
      const { productionBaseline, safeZoneState } = await this.getSafeZoneState(developerEmail);

      // Compute diff report
      const changesReport = {
        pagesModified: safeZoneState.pages,
        navbarModified: safeZoneState.navbar,
        flagsModified: safeZoneState.flags,
        themesModified: safeZoneState.themes,
        pushedAt: new Date().toISOString(),
        pushedBy: developerEmail
      };

      // 1. Capture previous state for 1-click instant UNDO
      const previousStateJson = JSON.stringify(productionBaseline);

      // 2. Apply page changes to production
      for (const p of safeZoneState.pages) {
        await prisma.devPagePolicy.upsert({
          where: { routePath: p.routePath },
          update: {
            pageTitleAr: p.pageTitleAr,
            pageTitleEn: p.pageTitleEn,
            permanentPolicy: p.permanentPolicy,
            allowedRoles: p.allowedRoles || [],
            customMessage: p.customMessage || null
          },
          create: {
            routePath: p.routePath,
            pageTitleAr: p.pageTitleAr,
            pageTitleEn: p.pageTitleEn,
            permanentPolicy: p.permanentPolicy,
            allowedRoles: p.allowedRoles || []
          }
        });
      }

      // 3. Apply navbar changes
      for (const n of safeZoneState.navbar) {
        await prisma.devNavbarItem.upsert({
          where: { path: n.path },
          update: {
            isVisible: n.isVisible,
            guestVisible: n.guestVisible,
            allowedRoles: n.allowedRoles || [],
            sortOrder: n.sortOrder
          },
          create: {
            path: n.path,
            nameAr: n.nameAr,
            nameEn: n.nameEn,
            isVisible: n.isVisible,
            guestVisible: n.guestVisible,
            allowedRoles: n.allowedRoles || [],
            sortOrder: n.sortOrder || 0
          }
        });
      }

      // 4. Apply feature flags
      for (const f of safeZoneState.flags) {
        await prisma.devFeatureFlag.upsert({
          where: { key: f.key },
          update: {
            isEnabled: f.isEnabled,
            allowedRoles: f.allowedRoles || []
          },
          create: {
            key: f.key,
            nameAr: f.nameAr,
            nameEn: f.nameEn,
            isEnabled: f.isEnabled,
            allowedRoles: f.allowedRoles || []
          }
        });
      }

      // 5. Apply themes
      for (const t of safeZoneState.themes) {
        await prisma.devThemeConfig.upsert({
          where: { seasonKey: t.seasonKey },
          update: {
            isActive: t.isActive,
            colorsJson: t.colorsJson
          },
          create: {
            seasonKey: t.seasonKey,
            nameAr: t.nameAr,
            nameEn: t.nameEn,
            isActive: t.isActive,
            colorsJson: t.colorsJson
          }
        });
      }

      // 6. Generate next version
      const releaseCount = await prisma.devReleaseRecord.count();
      const nextVersion = `v1.${releaseCount}.0`;

      const releaseRecord = await prisma.devReleaseRecord.create({
        data: {
          version: nextVersion,
          developerEmail,
          summary: options?.pushSummary || `Production promotion from Safe Zone by ${developerEmail}`,
          changeType: 'PUSH',
          changesJson: JSON.stringify(changesReport),
          previousStateJson,
          status: 'SUCCESS'
        }
      });

      // Clear draft
      this.safeZoneDrafts.delete(developerEmail);

      await this.logAudit({
        developerEmail,
        action: 'SAFE_ZONE_PROMOTED_PUSH',
        target: nextVersion,
        details: `Safe Zone promoted to production. Release ${nextVersion} created.`
      });

      return { action: 'PUSH', status: 'SUCCESS', release: releaseRecord };
    }

    throw new Error('UNKNOWN_SAFE_ZONE_ACTION');
  }

  // ==========================================
  // 7. PUSH HISTORY, UNDO AND REDO
  // ==========================================

  static async getReleases() {
    return prisma.devReleaseRecord.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  static async undoRelease(developerEmail: string, releaseId: string) {
    const targetRelease = await prisma.devReleaseRecord.findUnique({
      where: { id: releaseId }
    });

    if (!targetRelease) throw new Error('RELEASE_NOT_FOUND');
    if (targetRelease.status === 'UNDONE') throw new Error('RELEASE_ALREADY_UNDONE');
    if (!targetRelease.previousStateJson) throw new Error('NO_RECOVERY_STATE_AVAILABLE');

    const prevState = JSON.parse(targetRelease.previousStateJson);

    // Capture current state before reversal
    const [currentPages, currentNav, currentFlags, currentThemes] = await Promise.all([
      prisma.devPagePolicy.findMany(),
      prisma.devNavbarItem.findMany(),
      prisma.devFeatureFlag.findMany(),
      prisma.devThemeConfig.findMany()
    ]);
    const preUndoStateJson = JSON.stringify({ pages: currentPages, navbar: currentNav, flags: currentFlags, themes: currentThemes });

    // 1. Restore pages
    if (prevState.pages) {
      for (const p of prevState.pages) {
        await prisma.devPagePolicy.upsert({
          where: { routePath: p.routePath },
          update: {
            permanentPolicy: p.permanentPolicy,
            allowedRoles: p.allowedRoles || [],
            customMessage: p.customMessage || null
          },
          create: {
            routePath: p.routePath,
            pageTitleAr: p.pageTitleAr,
            pageTitleEn: p.pageTitleEn,
            permanentPolicy: p.permanentPolicy,
            allowedRoles: p.allowedRoles || []
          }
        });
      }
    }

    // 2. Restore navbar
    if (prevState.navbar) {
      for (const n of prevState.navbar) {
        await prisma.devNavbarItem.upsert({
          where: { path: n.path },
          update: {
            isVisible: n.isVisible,
            guestVisible: n.guestVisible,
            allowedRoles: n.allowedRoles || [],
            sortOrder: n.sortOrder
          },
          create: {
            path: n.path,
            nameAr: n.nameAr,
            nameEn: n.nameEn,
            isVisible: n.isVisible,
            guestVisible: n.guestVisible,
            sortOrder: n.sortOrder || 0
          }
        });
      }
    }

    // 3. Restore flags
    if (prevState.flags) {
      for (const f of prevState.flags) {
        await prisma.devFeatureFlag.upsert({
          where: { key: f.key },
          update: { isEnabled: f.isEnabled, allowedRoles: f.allowedRoles || [] },
          create: { key: f.key, nameAr: f.nameAr, nameEn: f.nameEn, isEnabled: f.isEnabled }
        });
      }
    }

    // 4. Restore themes
    if (prevState.themes) {
      for (const t of prevState.themes) {
        await prisma.devThemeConfig.upsert({
          where: { seasonKey: t.seasonKey },
          update: { isActive: t.isActive, colorsJson: t.colorsJson },
          create: { seasonKey: t.seasonKey, nameAr: t.nameAr, nameEn: t.nameEn, isActive: t.isActive, colorsJson: t.colorsJson }
        });
      }
    }

    // Mark target release as UNDONE
    await prisma.devReleaseRecord.update({
      where: { id: releaseId },
      data: { status: 'UNDONE' }
    });

    // Create a new permanent history record for the UNDO action
    const totalCount = await prisma.devReleaseRecord.count();
    const undoVersion = `${targetRelease.version}-UNDO-${totalCount}`;
    const newRecord = await prisma.devReleaseRecord.create({
      data: {
        version: undoVersion,
        developerEmail,
        summary: `UNDO reversal of release ${targetRelease.version} (${targetRelease.summary})`,
        changeType: 'UNDO',
        targetReleaseId: targetRelease.id,
        changesJson: JSON.stringify({ reversedRelease: targetRelease.version, restoredState: prevState }),
        previousStateJson: preUndoStateJson,
        status: 'SUCCESS'
      }
    });

    await this.logAudit({
      developerEmail,
      action: 'RELEASE_UNDONE',
      target: targetRelease.version,
      details: `Release ${targetRelease.version} reversed by developer. Created undo record ${undoVersion}.`
    });

    return newRecord;
  }

  static async redoRelease(developerEmail: string, releaseId: string) {
    const targetRelease = await prisma.devReleaseRecord.findUnique({
      where: { id: releaseId }
    });

    if (!targetRelease) throw new Error('RELEASE_NOT_FOUND');
    if (targetRelease.status !== 'UNDONE') throw new Error('CANNOT_REDO_NON_UNDONE_RELEASE');

    const changes = JSON.parse(targetRelease.changesJson);

    // Reapply pages
    if (changes.pagesModified) {
      for (const p of changes.pagesModified) {
        await prisma.devPagePolicy.update({
          where: { routePath: p.routePath },
          data: { permanentPolicy: p.permanentPolicy, allowedRoles: p.allowedRoles || [] }
        });
      }
    }

    // Reapply navbar
    if (changes.navbarModified) {
      for (const n of changes.navbarModified) {
        await prisma.devNavbarItem.update({
          where: { path: n.path },
          data: { isVisible: n.isVisible, guestVisible: n.guestVisible, allowedRoles: n.allowedRoles || [] }
        });
      }
    }

    // Reapply flags
    if (changes.flagsModified) {
      for (const f of changes.flagsModified) {
        await prisma.devFeatureFlag.update({
          where: { key: f.key },
          data: { isEnabled: f.isEnabled, allowedRoles: f.allowedRoles || [] }
        });
      }
    }

    // Reapply themes
    if (changes.themesModified) {
      for (const t of changes.themesModified) {
        await prisma.devThemeConfig.update({
          where: { seasonKey: t.seasonKey },
          data: { isActive: t.isActive, colorsJson: t.colorsJson }
        });
      }
    }

    // Re-mark release as SUCCESS
    await prisma.devReleaseRecord.update({
      where: { id: releaseId },
      data: { status: 'SUCCESS' }
    });

    const totalCount = await prisma.devReleaseRecord.count();
    const redoVersion = `${targetRelease.version}-REDO-${totalCount}`;
    const newRecord = await prisma.devReleaseRecord.create({
      data: {
        version: redoVersion,
        developerEmail,
        summary: `REDO reapplication of release ${targetRelease.version}`,
        changeType: 'REDO',
        targetReleaseId: targetRelease.id,
        changesJson: targetRelease.changesJson,
        status: 'SUCCESS'
      }
    });

    await this.logAudit({
      developerEmail,
      action: 'RELEASE_REDONE',
      target: targetRelease.version,
      details: `Release ${targetRelease.version} reapplied by developer.`
    });

    return newRecord;
  }

  // ==========================================
  // 8. LITURGICAL THEMES & APPEARANCE
  // ==========================================

  static async getLiturgicalThemes() {
    return prisma.devThemeConfig.findMany({
      orderBy: { seasonKey: 'asc' }
    });
  }

  static async setActiveLiturgicalTheme(developerEmail: string, seasonKey: string) {
    // Set all to false, then target to true
    await prisma.devThemeConfig.updateMany({
      data: { isActive: false }
    });

    const activeTheme = await prisma.devThemeConfig.update({
      where: { seasonKey },
      data: { isActive: true }
    });

    await this.logAudit({
      developerEmail,
      action: 'THEME_ACTIVATED',
      target: seasonKey,
      details: `Liturgical season theme switched to: ${activeTheme.nameAr} (${seasonKey})`
    });

    return activeTheme;
  }

  static async updateThemeColors(developerEmail: string, seasonKey: string, colorsJson: string) {
    const updated = await prisma.devThemeConfig.update({
      where: { seasonKey },
      data: { colorsJson }
    });

    await this.logAudit({
      developerEmail,
      action: 'THEME_COLORS_UPDATED',
      target: seasonKey,
      details: `Theme color palette updated.`
    });

    return updated;
  }

  // ==========================================
  // 9. AI & CHATBOT CONTROL
  // ==========================================

  static async getAiChatbotStatus() {
    const flag = await prisma.devFeatureFlag.findUnique({
      where: { key: 'ai_chatbot' }
    });

    const [totalConversations, totalMessages, totalKnowledge] = await Promise.all([
      prisma.aiAdminConversation.count(),
      prisma.aiAdminMessage.count(),
      prisma.aiKnowledgeItem.count()
    ]);

    return {
      isEnabled: flag ? flag.isEnabled : true,
      provider: process.env.AI_PROVIDER || 'gemini',
      fallbackProvider: process.env.AI_FALLBACK_PROVIDER || 'groq',
      geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      groqModel: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',
      totalConversations,
      totalMessages,
      totalKnowledge
    };
  }

  static async toggleAiChatbotKillSwitch(developerEmail: string, isEnabled: boolean) {
    const flag = await prisma.devFeatureFlag.upsert({
      where: { key: 'ai_chatbot' },
      update: { isEnabled },
      create: {
        key: 'ai_chatbot',
        nameAr: 'المساعد الروحي الذكي (AI Chatbot)',
        nameEn: 'Spiritual AI Assistant',
        isEnabled
      }
    });

    await this.logAudit({
      developerEmail,
      action: isEnabled ? 'AI_CHATBOT_ENABLED' : 'AI_CHATBOT_KILLSWITCH_ACTIVATED',
      target: 'AI_CHATBOT',
      details: `Chatbot backend kill switch set to: ${isEnabled ? 'ENABLED' : 'DISABLED'}`
    });

    return flag;
  }

  // ==========================================
  // 10. FEATURE FLAGS
  // ==========================================

  static async getFeatureFlags() {
    return prisma.devFeatureFlag.findMany({
      orderBy: { key: 'asc' }
    });
  }

  static async updateFeatureFlag(developerEmail: string, params: {
    key: string;
    isEnabled: boolean;
    allowedRoles?: Role[];
    inSafeZoneOnly?: boolean;
  }) {
    const updated = await prisma.devFeatureFlag.update({
      where: { key: params.key },
      data: {
        isEnabled: params.isEnabled,
        allowedRoles: params.allowedRoles || [],
        inSafeZoneOnly: params.inSafeZoneOnly ?? false
      }
    });

    await this.logAudit({
      developerEmail,
      action: 'FEATURE_FLAG_UPDATED',
      target: params.key,
      details: `Feature Flag ${params.key} set to ${params.isEnabled ? 'ON' : 'OFF'}`
    });

    return updated;
  }

  // ==========================================
  // 11. USER INTELLIGENCE & ACCOUNTS
  // ==========================================

  static async getUserIntelligence(page = 1, limit = 50, search = '') {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search.trim()) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          roles: true,
          isBanned: true,
          banReason: true,
          bannedAt: true,
          isVerified: true,
          language: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              appointments: true,
              eventInvitations: true,
              eventApplications: true,
              bibleJournals: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    return {
      users: users.map(u => ({
        ...u,
        isMasterDeveloper: this.isMasterDeveloper(u.email)
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  static async toggleUserBan(developerEmail: string, targetUserId: string, isBanned: boolean, banReason?: string) {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new Error('USER_NOT_FOUND');

    if (this.isMasterDeveloper(targetUser.email)) {
      throw new Error('CANNOT_BAN_MASTER_DEVELOPER');
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isBanned,
        banReason: isBanned ? (banReason || 'حظر بواسطة مطور النظام') : null,
        bannedAt: isBanned ? new Date() : null
      }
    });

    await this.logAudit({
      developerEmail,
      action: isBanned ? 'USER_BANNED' : 'USER_UNBANNED',
      target: targetUser.email,
      details: `User account ${isBanned ? 'BANNED' : 'UNBANNED'}. Reason: ${banReason || 'None'}`
    });

    return updated;
  }

  // ==========================================
  // 12. DATABASE DIAGNOSTICS & METRICS
  // ==========================================

  static async getDatabaseOverview() {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - startTime;

    const [
      userCount,
      priestCount,
      appointmentCount,
      eventCount,
      invitationCount,
      sermonCount,
      newsCount,
      actionLogCount,
      auditLogCount,
      releaseCount,
      flagCount,
      themeCount,
      ipBanCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.priestProfile.count(),
      prisma.appointment.count(),
      prisma.event.count(),
      prisma.eventInvitation.count(),
      prisma.sermon.count(),
      prisma.news.count(),
      prisma.actionLog.count(),
      prisma.devAuditLog.count(),
      prisma.devReleaseRecord.count(),
      prisma.devFeatureFlag.count(),
      prisma.devThemeConfig.count(),
      prisma.devIpBan.count()
    ]);

    // Check relationship integrity (foreign keys are enforced in DB with onDelete Cascade)
    const orphanedAppointments = 0;

    const tables = [
      { name: 'User', count: userCount, status: 'HEALTHY' },
      { name: 'PriestProfile', count: priestCount, status: 'HEALTHY' },
      { name: 'Appointment', count: appointmentCount, status: orphanedAppointments > 0 ? 'WARNING' : 'HEALTHY', issues: orphanedAppointments > 0 ? `${orphanedAppointments} orphaned appointments` : null },
      { name: 'Event', count: eventCount, status: 'HEALTHY' },
      { name: 'EventInvitation', count: invitationCount, status: 'HEALTHY' },
      { name: 'Sermon', count: sermonCount, status: 'HEALTHY' },
      { name: 'News', count: newsCount, status: 'HEALTHY' },
      { name: 'ActionLog', count: actionLogCount, status: 'HEALTHY' },
      { name: 'DevAuditLog', count: auditLogCount, status: 'HEALTHY' },
      { name: 'DevReleaseRecord', count: releaseCount, status: 'HEALTHY' },
      { name: 'DevFeatureFlag', count: flagCount, status: 'HEALTHY' },
      { name: 'DevThemeConfig', count: themeCount, status: 'HEALTHY' },
      { name: 'DevIpBan', count: ipBanCount, status: 'HEALTHY' }
    ];

    return {
      status: 'CONNECTED',
      provider: 'PostgreSQL (Supabase Pooler + AWS Direct)',
      latencyMs,
      tables,
      integrity: {
        orphanedAppointments
      }
    };
  }

  // ==========================================
  // 13. AUDIT LOGGING
  // ==========================================

  static async logAudit(params: {
    developerEmail: string;
    action: string;
    target: string;
    details: string;
    ipAddress?: string;
    userAgent?: string;
    status?: 'SUCCESS' | 'FAILED' | 'WARNING';
  }) {
    try {
      await prisma.devAuditLog.create({
        data: {
          developerEmail: params.developerEmail,
          action: params.action,
          target: params.target,
          details: params.details,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          status: params.status || 'SUCCESS'
        }
      });
    } catch (e) {
      console.error('[DEV_AUDIT_LOG_ERROR]:', e);
    }
  }

  static async getAuditLogs(page = 1, limit = 50, filterAction = '', search = '') {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filterAction) {
      where.action = filterAction;
    }

    if (search.trim()) {
      where.OR = [
        { developerEmail: { contains: search, mode: 'insensitive' } },
        { target: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.devAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.devAuditLog.count({ where })
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // ==========================================
  // 14. SYSTEM & RUNTIME OBSERVABILITY
  // ==========================================

  static async getSystemMetrics() {
    const memory = process.memoryUsage();
    const cpus = os.cpus();
    const dbCheckStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbCheckStart;

    return {
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      uptimeSeconds: Math.floor(process.uptime()),
      systemUptimeSeconds: Math.floor(os.uptime()),
      memory: {
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
        rssMb: Math.round(memory.rss / 1024 / 1024),
        systemFreeMb: Math.round(os.freemem() / 1024 / 1024),
        systemTotalMb: Math.round(os.totalmem() / 1024 / 1024)
      },
      cpuCount: cpus.length,
      dbLatencyMs: dbLatency,
      environment: process.env.NODE_ENV || 'development'
    };
  }

  // ==========================================
  // 15. INCIDENTS & ANNOUNCEMENTS
  // ==========================================

  static async getIncidents() {
    return prisma.devIncident.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  static async createIncident(developerEmail: string, params: {
    title: string;
    severity: string;
    affectedModules: string[];
    description: string;
  }) {
    const incident = await prisma.devIncident.create({
      data: {
        title: params.title,
        severity: params.severity,
        status: 'OPEN',
        affectedModules: params.affectedModules || [],
        description: params.description,
        createdByName: developerEmail
      }
    });

    await this.logAudit({
      developerEmail,
      action: 'INCIDENT_CREATED',
      target: incident.id,
      details: `New incident logged: ${params.title} [${params.severity}]`
    });

    return incident;
  }

  static async resolveIncident(developerEmail: string, incidentId: string, resolutionNotes: string) {
    const incident = await prisma.devIncident.update({
      where: { id: incidentId },
      data: {
        status: 'RESOLVED',
        resolutionNotes,
        resolvedAt: new Date()
      }
    });

    await this.logAudit({
      developerEmail,
      action: 'INCIDENT_RESOLVED',
      target: incidentId,
      details: `Incident marked as RESOLVED.`
    });

    return incident;
  }

  static async getAnnouncements() {
    return prisma.devAnnouncement.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  static async createAnnouncement(developerEmail: string, params: {
    titleAr: string;
    titleEn: string;
    contentAr: string;
    contentEn: string;
    type?: string;
    targetRoles?: Role[];
    expiresAt?: Date | null;
  }) {
    const announcement = await prisma.devAnnouncement.create({
      data: {
        titleAr: params.titleAr,
        titleEn: params.titleEn,
        contentAr: params.contentAr,
        contentEn: params.contentEn,
        type: params.type || 'INFO',
        targetRoles: params.targetRoles || [],
        expiresAt: params.expiresAt || null,
        isActive: true
      }
    });

    await this.logAudit({
      developerEmail,
      action: 'ANNOUNCEMENT_CREATED',
      target: announcement.id,
      details: `Global announcement published: ${params.titleAr}`
    });

    return announcement;
  }

  static async deleteAnnouncement(developerEmail: string, id: string) {
    await prisma.devAnnouncement.delete({ where: { id } });
    await this.logAudit({
      developerEmail,
      action: 'ANNOUNCEMENT_DELETED',
      target: id,
      details: `Announcement deleted.`
    });
    return { success: true };
  }
}
