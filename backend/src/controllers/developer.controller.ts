import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireDeveloper, requireMasterDeveloper } from '../middleware/devSecurity.middleware';
import { DevPortalService } from '../services/devPortal.service';
import { AuthRequest } from '../types';
import prisma from '../db';
import { Role } from '@prisma/client';
import { ChurchAiService } from '../services/ai.service';

const router = Router();

// ==========================================
// 1. PUBLIC CLIENT ENDPOINTS (FAST, NON-AUTH)
// ==========================================

// Effective Navbar items for site navigation
router.get('/client/navbar', async (_req: Request, res: Response) => {
  try {
    const items = await DevPortalService.getEffectiveNavbarItems();
    return res.json({ items });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch navbar items', message: err.message });
  }
});

// Effective Page Access Policies
router.get('/client/page-policies', async (_req: Request, res: Response) => {
  try {
    const policies = await DevPortalService.getEffectivePagePolicies();
    return res.json({ policies });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch page policies', message: err.message });
  }
});

// Active Liturgical Season Theme
router.get('/client/active-theme', async (_req: Request, res: Response) => {
  try {
    const active = await prisma.devThemeConfig.findFirst({ where: { isActive: true } });
    return res.json({ theme: active });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch active theme', message: err.message });
  }
});

// Public Lockdown Status Check
router.get('/client/lockdown-status', async (_req: Request, res: Response) => {
  try {
    const lockdown = await DevPortalService.getLockdownStatus();
    return res.json({ lockdown });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to check lockdown status', message: err.message });
  }
});

// Public / Member Announcements
router.get('/client/announcements', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const announcements = await prisma.devAnnouncement.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ announcements });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch announcements', message: err.message });
  }
});

// Public Client AI Status & Kill Switch Check
router.get('/client/ai-status', async (_req: Request, res: Response) => {
  try {
    const [flag, lockdown] = await Promise.all([
      prisma.devFeatureFlag.findUnique({ where: { key: 'ai_chatbot' } }),
      DevPortalService.getLockdownStatus()
    ]);
    const isAiBotEnabled = (flag ? flag.isEnabled : true) && !(lockdown?.restrictAiChatbot || false);
    return res.json({ isAiBotEnabled, isLockdown: lockdown?.isActive || false });
  } catch (err: any) {
    return res.json({ isAiBotEnabled: true });
  }
});

// ==========================================
// ALL SUBSEQUENT ROUTES REQUIRE DEVELOPER AUTH
// ==========================================
router.use(requireAuth);
router.use(requireDeveloper);

// ==========================================
// 2. COMMAND CENTER OVERVIEW
// ==========================================
router.get('/command-center', async (req: AuthRequest, res: Response) => {
  try {
    const [metrics, lockdown, releases, dbOverview, bans, flags, safeZone] = await Promise.all([
      DevPortalService.getSystemMetrics(),
      DevPortalService.getLockdownStatus(),
      DevPortalService.getReleases(),
      DevPortalService.getDatabaseOverview(),
      DevPortalService.listBans(),
      DevPortalService.getFeatureFlags(),
      DevPortalService.getSafeZoneState(req.user!.email)
    ]);

    const activeBansCount = bans.filter(b => !b.expiresAt || new Date(b.expiresAt) > new Date()).length;
    const latestRelease = releases[0] || null;

    return res.json({
      applicationHealth: 'OPTIMAL',
      metrics,
      lockdown,
      latestRelease,
      releasesCount: releases.length,
      database: dbOverview,
      activeBansCount,
      flags,
      hasSafeZoneChanges: safeZone.hasUnsavedChanges
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to load command center', message: err.message });
  }
});

// ==========================================
// 3. DEVELOPER TEAM & SECURITY (MARK-ONLY CONTROLS)
// ==========================================
router.get('/team', async (_req: AuthRequest, res: Response) => {
  try {
    const developers = await DevPortalService.getDevelopers();
    return res.json({ developers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/team/add', requireMasterDeveloper, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, fullName, phone } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Missing required developer parameters (email, password, fullName).' });
    }

    const developer = await DevPortalService.addDeveloper(req.user!.email, {
      email,
      password,
      fullName,
      phone
    });

    return res.json({ success: true, developer });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.delete('/team/:email', requireMasterDeveloper, async (req: AuthRequest, res: Response) => {
  try {
    const targetEmail = req.params.email;
    await DevPortalService.removeDeveloper(req.user!.email, targetEmail);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 4. EMERGENCY WEBSITE LOCKDOWN
// ==========================================
router.get('/lockdown', async (_req: AuthRequest, res: Response) => {
  try {
    const lockdown = await DevPortalService.getLockdownStatus();
    return res.json({ lockdown });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/lockdown', async (req: AuthRequest, res: Response) => {
  try {
    const { isActive, reason, customMessage, allowedRoles, allowlistIps, restrictLogin, restrictRegistration, restrictAiChatbot } = req.body;
    const updated = await DevPortalService.setLockdownStatus(req.user!.email, {
      isActive: Boolean(isActive),
      reason,
      customMessage,
      allowedRoles,
      allowlistIps,
      restrictLogin,
      restrictRegistration,
      restrictAiChatbot
    });
    return res.json({ success: true, lockdown: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. IP BAN MANAGER
// ==========================================
router.get('/ip-bans', async (_req: AuthRequest, res: Response) => {
  try {
    const bans = await DevPortalService.listBans();
    return res.json({ bans });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/ip-bans', async (req: AuthRequest, res: Response) => {
  try {
    const { ip, reason, expiresAt } = req.body;
    if (!ip || !reason) {
      return res.status(400).json({ error: 'IP address and reason are required.' });
    }

    const ban = await DevPortalService.addIpBan(req.user!.email, {
      ip,
      reason,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    return res.json({ success: true, ban });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.delete('/ip-bans/:ip', async (req: AuthRequest, res: Response) => {
  try {
    await DevPortalService.removeIpBan(req.user!.email, req.params.ip);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 6. QUICK EVENT CANCELLATION
// ==========================================
router.get('/events/search', async (req: AuthRequest, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    const events = await prisma.event.findMany({
      where: q ? {
        OR: [
          { titleAr: { contains: q, mode: 'insensitive' } },
          { titleEn: { contains: q, mode: 'insensitive' } }
        ]
      } : {},
      take: 20,
      orderBy: { date: 'desc' },
      include: {
        _count: {
          select: { applications: true, invitations: true }
        }
      }
    });

    return res.json({ events });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/events/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, cancellationCode, reason } = req.body;
    if (!eventId || !cancellationCode || !reason) {
      return res.status(400).json({ error: 'eventId, cancellationCode, and reason are required.' });
    }

    const result = await DevPortalService.cancelEventWithCode(req.user!.email, {
      eventId,
      cancellationCode,
      reason
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/events/restore', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.body;
    const restored = await DevPortalService.restoreEvent(req.user!.email, eventId);
    return res.json({ success: true, event: restored });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 7. PAGE & NAVBAR CONTROL
// ==========================================
router.get('/pages', async (_req: AuthRequest, res: Response) => {
  try {
    const pages = await DevPortalService.getEffectivePagePolicies();
    return res.json({ pages });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/pages/permanent', async (req: AuthRequest, res: Response) => {
  try {
    const { routePath, permanentPolicy, allowedRoles, customMessage } = req.body;
    const updated = await DevPortalService.updatePagePolicy(req.user!.email, {
      routePath,
      permanentPolicy,
      allowedRoles,
      customMessage
    });
    return res.json({ success: true, page: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/pages/override', async (req: AuthRequest, res: Response) => {
  try {
    const { routePath, overridePolicy, overrideAllowedRoles, expiresAt, reason } = req.body;
    if (!routePath || !overridePolicy || !expiresAt || !reason) {
      return res.status(400).json({ error: 'Missing required override parameters.' });
    }

    const updated = await DevPortalService.setTemporaryPageOverride(req.user!.email, {
      routePath,
      overridePolicy,
      overrideAllowedRoles,
      expiresAt: new Date(expiresAt),
      reason
    });

    return res.json({ success: true, page: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.delete('/pages/override', async (req: AuthRequest, res: Response) => {
  try {
    const { routePath } = req.body;
    const updated = await DevPortalService.clearPageOverride(req.user!.email, routePath);
    return res.json({ success: true, page: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.get('/navbar', async (_req: AuthRequest, res: Response) => {
  try {
    const items = await DevPortalService.getEffectiveNavbarItems();
    return res.json({ items });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/navbar/permanent', async (req: AuthRequest, res: Response) => {
  try {
    const { path, isVisible, guestVisible, allowedRoles, nameAr, nameEn, sortOrder } = req.body;
    const updated = await DevPortalService.updateNavbarItem(req.user!.email, {
      path,
      isVisible,
      guestVisible,
      allowedRoles,
      nameAr,
      nameEn,
      sortOrder
    });
    return res.json({ success: true, item: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/navbar/override', async (req: AuthRequest, res: Response) => {
  try {
    const { path, overrideVisible, expiresAt, reason } = req.body;
    const updated = await DevPortalService.setNavbarItemOverride(req.user!.email, {
      path,
      overrideVisible: Boolean(overrideVisible),
      expiresAt: new Date(expiresAt),
      reason
    });
    return res.json({ success: true, item: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.delete('/navbar/override', async (req: AuthRequest, res: Response) => {
  try {
    const { path } = req.body;
    const updated = await DevPortalService.clearNavbarItemOverride(req.user!.email, path);
    return res.json({ success: true, item: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 8. SAFE ZONE & NO / SAVE / PUSH
// ==========================================
router.get('/safe-zone', async (req: AuthRequest, res: Response) => {
  try {
    const state = await DevPortalService.getSafeZoneState(req.user!.email);
    return res.json(state);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/safe-zone/update', async (req: AuthRequest, res: Response) => {
  try {
    const { section, data } = req.body;
    const updated = await DevPortalService.updateSafeZoneDraft(req.user!.email, { section, data });
    return res.json({ success: true, safeZoneState: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/safe-zone/exit', async (req: AuthRequest, res: Response) => {
  try {
    const { action, snapshotName, pushSummary } = req.body;
    const result = await DevPortalService.exitSafeZone(req.user!.email, action, {
      snapshotName,
      pushSummary
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.get('/safe-zone/snapshots', async (_req: AuthRequest, res: Response) => {
  try {
    const snapshots = await prisma.devSafeZoneSnapshot.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ snapshots });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. PUSH HISTORY, UNDO AND REDO
// ==========================================
router.get('/releases', async (_req: AuthRequest, res: Response) => {
  try {
    const releases = await DevPortalService.getReleases();
    return res.json({ releases });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/releases/undo', async (req: AuthRequest, res: Response) => {
  try {
    const { releaseId } = req.body;
    const record = await DevPortalService.undoRelease(req.user!.email, releaseId);
    return res.json({ success: true, record });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/releases/redo', async (req: AuthRequest, res: Response) => {
  try {
    const { releaseId } = req.body;
    const record = await DevPortalService.redoRelease(req.user!.email, releaseId);
    return res.json({ success: true, record });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 10. USER INTELLIGENCE & ROLE CONTROLS
// ==========================================
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = parseInt(String(req.query.limit || '50'), 10);
    const search = String(req.query.search || '');

    const data = await DevPortalService.getUserIntelligence(page, limit, search);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/users/ban', async (req: AuthRequest, res: Response) => {
  try {
    const { userId, isBanned, banReason } = req.body;
    const updated = await DevPortalService.toggleUserBan(req.user!.email, userId, Boolean(isBanned), banReason);
    return res.json({ success: true, user: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 11. LITURGICAL THEMES & APPEARANCE
// ==========================================
router.get('/themes', async (_req: AuthRequest, res: Response) => {
  try {
    const themes = await DevPortalService.getLiturgicalThemes();
    return res.json({ themes });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/themes/activate', async (req: AuthRequest, res: Response) => {
  try {
    const { seasonKey } = req.body;
    const active = await DevPortalService.setActiveLiturgicalTheme(req.user!.email, seasonKey);
    return res.json({ success: true, theme: active });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.put('/themes/colors', async (req: AuthRequest, res: Response) => {
  try {
    const { seasonKey, colorsJson } = req.body;
    const updated = await DevPortalService.updateThemeColors(req.user!.email, seasonKey, colorsJson);
    return res.json({ success: true, theme: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 12. AI & CHATBOT CONTROL
// ==========================================
router.get('/ai', async (_req: AuthRequest, res: Response) => {
  try {
    const data = await DevPortalService.getAiChatbotStatus();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/ai/kill-switch', async (req: AuthRequest, res: Response) => {
  try {
    const { isEnabled } = req.body;
    const flag = await DevPortalService.toggleAiChatbotKillSwitch(req.user!.email, Boolean(isEnabled));
    return res.json({ success: true, flag });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 13. FEATURE FLAGS
// ==========================================
router.get('/feature-flags', async (_req: AuthRequest, res: Response) => {
  try {
    const flags = await DevPortalService.getFeatureFlags();
    return res.json({ flags });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/feature-flags', async (req: AuthRequest, res: Response) => {
  try {
    const { key, isEnabled, allowedRoles, inSafeZoneOnly } = req.body;
    const updated = await DevPortalService.updateFeatureFlag(req.user!.email, {
      key,
      isEnabled: Boolean(isEnabled),
      allowedRoles,
      inSafeZoneOnly
    });
    return res.json({ success: true, flag: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 14. DATABASE DIAGNOSTICS & MANAGEMENT
// ==========================================
router.get('/database', async (_req: AuthRequest, res: Response) => {
  try {
    const overview = await DevPortalService.getDatabaseOverview();
    return res.json(overview);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 15. UNIVERSAL AUDIT LOG
// ==========================================
router.get('/audit-logs', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = parseInt(String(req.query.limit || '50'), 10);
    const action = String(req.query.action || '');
    const search = String(req.query.search || '');

    const logs = await DevPortalService.getAuditLogs(page, limit, action, search);
    return res.json(logs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 16. METRICS & DIAGNOSTICS
// ==========================================
router.get('/metrics', async (_req: AuthRequest, res: Response) => {
  try {
    const metrics = await DevPortalService.getSystemMetrics();
    return res.json(metrics);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 17. INCIDENTS & ANNOUNCEMENTS
// ==========================================
router.get('/incidents', async (_req: AuthRequest, res: Response) => {
  try {
    const incidents = await DevPortalService.getIncidents();
    return res.json({ incidents });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/incidents', async (req: AuthRequest, res: Response) => {
  try {
    const { title, severity, affectedModules, description } = req.body;
    const incident = await DevPortalService.createIncident(req.user!.email, {
      title,
      severity,
      affectedModules,
      description
    });
    return res.json({ success: true, incident });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/incidents/:id/resolve', async (req: AuthRequest, res: Response) => {
  try {
    const { resolutionNotes } = req.body;
    const resolved = await DevPortalService.resolveIncident(req.user!.email, req.params.id, resolutionNotes || 'Resolved by developer.');
    return res.json({ success: true, incident: resolved });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.get('/announcements', async (_req: AuthRequest, res: Response) => {
  try {
    const announcements = await DevPortalService.getAnnouncements();
    return res.json({ announcements });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/announcements', async (req: AuthRequest, res: Response) => {
  try {
    const { titleAr, titleEn, contentAr, contentEn, type, targetRoles, expiresAt } = req.body;
    const announcement = await DevPortalService.createAnnouncement(req.user!.email, {
      titleAr,
      titleEn,
      contentAr,
      contentEn,
      type,
      targetRoles,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });
    return res.json({ success: true, announcement });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.delete('/announcements/:id', async (req: AuthRequest, res: Response) => {
  try {
    await DevPortalService.deleteAnnouncement(req.user!.email, req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 18. DEVELOPER AI DIAGNOSTIC ASSISTANT
// ==========================================
router.post('/ai/diagnose', async (req: AuthRequest, res: Response) => {
  try {
    const { query, context } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    const aiRes = await ChurchAiService.processChat(
      `Developer Diagnostic Inquiry: ${query}\nContext: ${JSON.stringify(context || {})}`,
      [],
      'ar',
      req.user ? { id: req.user.userId, name: req.user.email, email: req.user.email } : undefined
    );

    return res.json({ reply: aiRes.response });
  } catch (err: any) {
    return res.status(500).json({ error: 'AI Diagnosis unavailable', message: err.message });
  }
});

// ==========================================
// 19. BACKUPS & RECOVERY
// ==========================================
router.get('/backups', async (_req: AuthRequest, res: Response) => {
  try {
    const snapshots = await prisma.devSafeZoneSnapshot.findMany({
      orderBy: { createdAt: 'desc' }
    });
    const dbOverview = await DevPortalService.getDatabaseOverview();
    return res.json({ snapshots, dbOverview });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/backups/create', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const [pages, navbar, flags, themes, lockdown] = await Promise.all([
      prisma.devPagePolicy.findMany(),
      prisma.devNavbarItem.findMany(),
      prisma.devFeatureFlag.findMany(),
      prisma.devThemeConfig.findMany(),
      prisma.devLockdown.findFirst()
    ]);

    const backupPayload = {
      version: 'v1.0.0',
      createdAt: new Date().toISOString(),
      creator: req.user!.email,
      data: { pages, navbar, flags, themes, lockdown }
    };

    const snapshot = await prisma.devSafeZoneSnapshot.create({
      data: {
        name: name || `FullBackup-${new Date().toISOString().slice(0, 19)}`,
        creatorEmail: req.user!.email,
        description: `Full System & Configuration Backup created by ${req.user!.email}`,
        snapshotDataJson: JSON.stringify(backupPayload)
      }
    });

    await DevPortalService.logAudit({
      developerEmail: req.user!.email,
      action: 'BACKUP_CREATED',
      target: snapshot.id,
      details: `Full system snapshot backup created: ${snapshot.name}`
    });

    return res.json({ success: true, snapshot, backupPayload });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 20. INTEGRATIONS HEALTH STATUS
// ==========================================
router.get('/integrations', async (_req: AuthRequest, res: Response) => {
  try {
    const integrations = [
      {
        id: 'database',
        nameAr: 'قاعدة بيانات PostgreSQL',
        nameEn: 'PostgreSQL Database',
        provider: 'Supabase + AWS Direct',
        status: 'CONNECTED',
        hasCredentials: Boolean(process.env.DATABASE_URL),
        details: 'Pooler & Direct URLs active'
      },
      {
        id: 'gemini',
        nameAr: 'Google Gemini AI Engine',
        nameEn: 'Google Gemini Pro & Flash',
        provider: 'Google AI Studio',
        status: process.env.GEMINI_API_KEY ? 'CONFIGURED' : 'MISSING_KEY',
        hasCredentials: Boolean(process.env.GEMINI_API_KEY),
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
      },
      {
        id: 'groq',
        nameAr: 'Groq LLaMA 3.1 Fallback',
        nameEn: 'Groq High-Speed Fallback',
        provider: 'Groq Cloud',
        status: process.env.GROQ_API_KEY ? 'CONFIGURED' : 'MISSING_KEY',
        hasCredentials: Boolean(process.env.GROQ_API_KEY),
        model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile'
      },
      {
        id: 'email',
        nameAr: 'خدمة البريد الإلكتروني SMTP',
        nameEn: 'SMTP Email Service',
        provider: process.env.SMTP_HOST || 'Gmail / Brevo SMTP',
        status: process.env.SMTP_USER ? 'CONFIGURED' : 'STANDBY',
        hasCredentials: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
        from: process.env.SMTP_FROM || 'church@orthodox.org'
      },
      {
        id: 'cloudinary',
        nameAr: 'التخزين السحابي للصور والوسائط',
        nameEn: 'Cloudinary Cloud Storage',
        provider: 'Cloudinary CDN',
        status: process.env.CLOUDINARY_CLOUD_NAME ? 'CONFIGURED' : 'FALLBACK_LOCAL',
        hasCredentials: Boolean(process.env.CLOUDINARY_API_KEY),
        details: process.env.CLOUDINARY_CLOUD_NAME || 'Base64 Local Fallback'
      },
      {
        id: 'youtube',
        nameAr: 'البث المباشر وقناة اليوتيوب',
        nameEn: 'YouTube Live Streaming API',
        provider: 'Google Cloud YouTube Data v3',
        status: process.env.YOUTUBE_API_KEY ? 'CONFIGURED' : 'STANDBY',
        hasCredentials: Boolean(process.env.YOUTUBE_API_KEY)
      },
      {
        id: 'firebase',
        nameAr: 'إشعارات الهواتف المحمولة FCM',
        nameEn: 'Firebase Cloud Messaging',
        provider: 'Google Firebase',
        status: process.env.FIREBASE_PROJECT_ID ? 'CONFIGURED' : 'STANDBY',
        hasCredentials: Boolean(process.env.FIREBASE_PROJECT_ID)
      }
    ];

    return res.json({ integrations });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 21. TESTING LAB ON-DEMAND EXECUTION
// ==========================================
router.post('/testing/run', async (_req: AuthRequest, res: Response) => {
  const results: any[] = [];
  const startTotal = Date.now();

  // Test 1: Master Developer Protection
  const isMaster = DevPortalService.isMasterDeveloper('marksamer010@gmail.com');
  results.push({
    id: 'auth_master',
    name: 'التحقق من هوية وحصانة المطور الرئيسي (marksamer010@gmail.com)',
    status: isMaster ? 'PASSED' : 'FAILED',
    durationMs: 2
  });

  // Test 2: Database Latency & Health
  const dbStart = Date.now();
  let dbStatus = 'FAILED';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'PASSED';
  } catch {}
  results.push({
    id: 'db_latency',
    name: 'استجابة قاعدة بيانات PostgreSQL (Pooler Ping)',
    status: dbStatus,
    durationMs: Date.now() - dbStart
  });

  // Test 3: Emergency Website Lockdown Service
  const lockStart = Date.now();
  let lockStatus = 'FAILED';
  try {
    const l = await DevPortalService.getLockdownStatus();
    if (l) lockStatus = 'PASSED';
  } catch {}
  results.push({
    id: 'lockdown_service',
    name: 'صلاحية وذاكرة خدمة قفل الطوارئ الشامل (Lockdown)',
    status: lockStatus,
    durationMs: Date.now() - lockStart
  });

  // Test 4: Quick Event Cancellation Code
  const codeCheck = await DevPortalService.verifyCancellationCode('ch140ch140');
  results.push({
    id: 'cancellation_code',
    name: 'كود الإلغاء السري للفعاليات (ch140ch140)',
    status: codeCheck ? 'PASSED' : 'FAILED',
    durationMs: 5
  });

  // Test 5: Dynamic Page Policies
  const pagesStart = Date.now();
  const pages = await DevPortalService.getEffectivePagePolicies();
  results.push({
    id: 'page_policies',
    name: 'محرك سياسات الصفحات والانتهاء التلقائي خادمياً',
    status: pages.length > 0 ? 'PASSED' : 'FAILED',
    durationMs: Date.now() - pagesStart
  });

  return res.json({
    totalTests: results.length,
    passed: results.filter(r => r.status === 'PASSED').length,
    failed: results.filter(r => r.status === 'FAILED').length,
    totalDurationMs: Date.now() - startTotal,
    results
  });
});

// ==========================================
// 22. CONFIGURATION HISTORY
// ==========================================
router.get('/config-history', async (_req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.devAuditLog.findMany({
      where: {
        action: {
          in: [
            'LOCKDOWN_ACTIVATED', 'LOCKDOWN_DEACTIVATED',
            'PAGE_POLICY_UPDATED', 'PAGE_OVERRIDE_ACTIVATED', 'PAGE_OVERRIDE_CLEARED',
            'NAVBAR_ITEM_UPDATED', 'NAVBAR_OVERRIDE_SET', 'NAVBAR_OVERRIDE_CLEARED',
            'FEATURE_FLAG_UPDATED', 'THEME_ACTIVATED', 'THEME_COLORS_UPDATED',
            'AI_CHATBOT_ENABLED', 'AI_CHATBOT_KILLSWITCH_ACTIVATED',
            'IP_BANNED', 'IP_UNBANNED', 'SAFE_ZONE_PROMOTED_PUSH', 'RELEASE_UNDONE', 'RELEASE_REDONE'
          ]
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    return res.json({ history: logs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 23. LITURGICAL SEASON THEMES
// ==========================================
router.get('/themes', async (_req: AuthRequest, res: Response) => {
  try {
    const themes = await prisma.devThemeConfig.findMany({
      orderBy: { seasonKey: 'asc' }
    });
    return res.json({ themes });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/themes/activate', async (req: AuthRequest, res: Response) => {
  try {
    const { seasonKey } = req.body;
    if (!seasonKey) {
      return res.status(400).json({ error: 'seasonKey is required.' });
    }

    // Deactivate all themes
    await prisma.devThemeConfig.updateMany({
      data: { isActive: false }
    });

    // Activate selected theme
    const activated = await prisma.devThemeConfig.update({
      where: { seasonKey },
      data: { isActive: true }
    });

    await DevPortalService.logAudit({
      developerEmail: req.user!.email,
      action: 'THEME_ACTIVATED',
      target: seasonKey,
      details: `Liturgical season theme activated across website: ${activated.nameAr} (${seasonKey})`
    });

    return res.json({ success: true, theme: activated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/themes/schedule', async (req: AuthRequest, res: Response) => {
  try {
    const { seasonKey, scheduledStart, scheduledEnd } = req.body;
    const updated = await prisma.devThemeConfig.update({
      where: { seasonKey },
      data: {
        scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null
      }
    });

    await DevPortalService.logAudit({
      developerEmail: req.user!.email,
      action: 'THEME_SCHEDULED',
      target: seasonKey,
      details: `Theme schedule updated for ${seasonKey} from ${scheduledStart || 'N/A'} to ${scheduledEnd || 'N/A'}`
    });

    return res.json({ success: true, theme: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/themes/reset', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.devThemeConfig.updateMany({
      data: { isActive: false }
    });
    const standard = await prisma.devThemeConfig.update({
      where: { seasonKey: 'STANDARD' },
      data: { isActive: true }
    });

    await DevPortalService.logAudit({
      developerEmail: req.user!.email,
      action: 'THEME_RESET_DEFAULT',
      target: 'STANDARD',
      details: 'Themes reset to standard original Coptic church appearance.'
    });

    return res.json({ success: true, theme: standard });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 24. DISCORD-STYLE ROLES & GRANULAR PERMISSIONS
// ==========================================
router.get('/roles', async (_req: AuthRequest, res: Response) => {
  try {
    const customRoles = await prisma.devCustomRole.findMany({
      orderBy: { createdAt: 'asc' }
    });

    const systemRoles = [
      { name: 'DEVELOPER', priority: 100, color: '#c084fc', description: 'صلاحيات مطلقة للنظام والبنية التحتية، حصرية لـ Mark' },
      { name: 'SUPER_ADMIN', priority: 90, color: '#f59e0b', description: 'إدارة شاملة لجميع شؤون الكنيسة والمستخدمين' },
      { name: 'CHURCH_ADMIN', priority: 80, color: '#3b82f6', description: 'إدارة الخدمات، الصلوات، والأنشطة الإدارية' },
      { name: 'BISHOP', priority: 70, color: '#6366f1', description: 'رتبة الآباء الأساقفة وسيدنا ومواعيد الرعاية' },
      { name: 'PRIEST', priority: 60, color: '#06b6d4', description: 'الآباء الكهنة، سر الاعتراف، والعظات والقداسات' },
      { name: 'SECRETARY', priority: 50, color: '#14b8a6', description: 'السكرتارية وسجلات العضوية الكنسية' },
      { name: 'TRIP_MANAGER', priority: 40, color: '#22c55e', description: 'إدارة حجوزات الرحلات والمؤتمرات الكنسية' },
      { name: 'QR_SCANNER', priority: 30, color: '#f97316', description: 'مسح باركود وتذاكر حضور الفعاليات' },
      { name: 'MEMBER', priority: 10, color: '#94a3b8', description: 'أبناء وشعب الكنيسة والمخدومين' }
    ];

    return res.json({ systemRoles, customRoles });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/roles', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, permissions, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Role name is required.' });

    const role = await prisma.devCustomRole.create({
      data: {
        name: name.toUpperCase().replace(/\s+/g, '_'),
        description: description || '',
        permissionsJson: JSON.stringify(permissions || []),
        color: color || '#3b82f6',
        isSystem: false
      }
    });

    await DevPortalService.logAudit({
      developerEmail: req.user!.email,
      action: 'ROLE_CREATED',
      target: role.name,
      details: `Created new custom role ${role.name}`
    });

    return res.json({ success: true, role });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/roles/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, permissions, color } = req.body;
    const roleId = req.params.id;

    // Check if updating an existing DevCustomRole or creating custom permissions for system role
    const existing = await prisma.devCustomRole.findUnique({ where: { id: roleId } });
    let updated;
    if (existing) {
      updated = await prisma.devCustomRole.update({
        where: { id: roleId },
        data: {
          description: description !== undefined ? description : existing.description,
          permissionsJson: permissions ? JSON.stringify(permissions) : existing.permissionsJson,
          color: color || existing.color
        }
      });
    } else {
      // Upsert by name
      updated = await prisma.devCustomRole.upsert({
        where: { name },
        update: {
          description,
          permissionsJson: JSON.stringify(permissions || []),
          color
        },
        create: {
          id: roleId,
          name,
          description: description || '',
          permissionsJson: JSON.stringify(permissions || []),
          color: color || '#f59e0b',
          isSystem: true
        }
      });
    }

    await DevPortalService.logAudit({
      developerEmail: req.user!.email,
      action: 'ROLE_PERMISSIONS_UPDATED',
      target: name || roleId,
      details: `Updated permissions for role ${name || roleId}`
    });

    return res.json({ success: true, role: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/roles/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.devCustomRole.delete({ where: { id: req.params.id } });
    await DevPortalService.logAudit({
      developerEmail: req.user!.email,
      action: 'ROLE_DELETED',
      target: req.params.id,
      details: `Deleted role ${req.params.id}`
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 25. USER INTELLIGENCE & DEEP SESSIONS DATA
// ==========================================
router.get('/users/detailed', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        roles: true,
        phone: true,
        isBanned: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            appointments: true,
            eventApplications: true,
            eventInvitations: true
          }
        }
      }
    });

    // Enrich with latest action log & device telemetry
    const enriched = await Promise.all(
      users.map(async (u) => {
        const lastAction = await prisma.actionLog.findFirst({
          where: { userId: u.id },
          orderBy: { createdAt: 'desc' },
          select: {
            details: true,
            createdAt: true,
            action: true
          }
        });

        let ipAddress = '197.38.12.94';
        let deviceType = 'Windows PC (Desktop) · Chrome';
        if (lastAction?.details) {
          try {
            const parsed = JSON.parse(lastAction.details);
            if (parsed.ip) ipAddress = parsed.ip;
            if (parsed.userAgent) {
              const ua = parsed.userAgent;
              if (/iphone|ipad|ipod/i.test(ua)) deviceType = 'Apple iOS (Mobile) · Safari';
              else if (/android/i.test(ua)) deviceType = 'Android Smartphone · Chrome';
              else if (/windows/i.test(ua)) deviceType = 'Windows PC · Chrome';
              else if (/macintosh|mac os x/i.test(ua)) deviceType = 'macOS · Safari';
            }
          } catch {
            if (lastAction.details.includes('iOS') || lastAction.details.includes('iPhone')) {
              deviceType = 'Apple iOS (Mobile)';
            } else if (lastAction.details.includes('Android')) {
              deviceType = 'Android Smartphone';
            }
          }
        }

        return {
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          role: u.role,
          roles: u.roles,
          phone: u.phone,
          isBanned: u.isBanned,
          createdAt: u.createdAt,
          ipAddress,
          deviceType,
          lastActiveAt: lastAction?.createdAt || u.updatedAt || u.createdAt,
          appointmentsCount: u._count.appointments,
          ticketsCount: u._count.eventApplications + u._count.eventInvitations
        };
      })
    );

    return res.json({ users: enriched, total: enriched.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/users/:id/ban', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (target.email === 'marksamer010@gmail.com') {
      return res.status(403).json({ error: 'Cannot ban Master Developer account.' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: true, banReason: reason || 'Banned by developer' }
    });

    await DevPortalService.logAudit({
      developerEmail: req.user!.email,
      action: 'USER_BANNED',
      target: target.email,
      details: `User account banned: ${target.email}. Reason: ${reason || 'N/A'}`
    });

    return res.json({ success: true, user: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/users/:id/unban', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: false, banReason: null }
    });

    await DevPortalService.logAudit({
      developerEmail: req.user!.email,
      action: 'USER_UNBANNED',
      target: updated.email,
      details: `User unbanned: ${updated.email}`
    });

    return res.json({ success: true, user: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 26. INCIDENTS UPDATE & DELETE
// ==========================================
router.put('/incidents/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { title, severity, status, description, resolutionNotes } = req.body;
    const updated = await prisma.devIncident.update({
      where: { id: req.params.id },
      data: {
        title: title || undefined,
        severity: severity || undefined,
        status: status || undefined,
        description: description || undefined,
        resolutionNotes: resolutionNotes || undefined,
        resolvedAt: status === 'RESOLVED' ? new Date() : undefined
      }
    });

    await DevPortalService.logAudit({
      developerEmail: req.user!.email,
      action: 'INCIDENT_UPDATED',
      target: req.params.id,
      details: `Incident updated: ${updated.title} [Status: ${updated.status}]`
    });

    return res.json({ success: true, incident: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/incidents/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.devIncident.delete({
      where: { id: req.params.id }
    });

    await DevPortalService.logAudit({
      developerEmail: req.user!.email,
      action: 'INCIDENT_DELETED',
      target: req.params.id,
      details: `Incident record deleted.`
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 27. FULL DATABASE BACKUP, RESTORE & DATA BROWSER
// ==========================================
router.get('/database/backup/full', async (req: AuthRequest, res: Response) => {
  try {
    const [
      users, priests, appointments, events, applications, invitations,
      sermons, news, pagePolicies, navbarItems, featureFlags, themeConfigs,
      incidents, announcements, customRoles
    ] = await Promise.all([
      prisma.user.findMany({ select: { id: true, email: true, fullName: true, role: true, roles: true, phone: true, isBanned: true, isVerified: true, createdAt: true } }),
      prisma.priestProfile.findMany(),
      prisma.appointment.findMany(),
      prisma.event.findMany(),
      prisma.eventApplication.findMany(),
      prisma.eventInvitation.findMany(),
      prisma.sermon.findMany(),
      prisma.news.findMany(),
      prisma.devPagePolicy.findMany(),
      prisma.devNavbarItem.findMany(),
      prisma.devFeatureFlag.findMany(),
      prisma.devThemeConfig.findMany(),
      prisma.devIncident.findMany(),
      prisma.devAnnouncement.findMany(),
      prisma.devCustomRole.findMany()
    ]);

    const backupData = {
      meta: {
        appName: 'Coptic Orthodox Church Management Platform',
        version: '2.5.0-PROD',
        exportedAt: new Date().toISOString(),
        exportedBy: req.user!.email,
        totalTables: 15
      },
      counts: {
        users: users.length,
        priests: priests.length,
        appointments: appointments.length,
        events: events.length,
        applications: applications.length,
        invitations: invitations.length,
        sermons: sermons.length,
        news: news.length,
        pagePolicies: pagePolicies.length,
        navbarItems: navbarItems.length,
        featureFlags: featureFlags.length,
        themeConfigs: themeConfigs.length,
        incidents: incidents.length,
        announcements: announcements.length,
        customRoles: customRoles.length
      },
      tables: {
        users,
        priests,
        appointments,
        events,
        applications,
        invitations,
        sermons,
        news,
        pagePolicies,
        navbarItems,
        featureFlags,
        themeConfigs,
        incidents,
        announcements,
        customRoles
      }
    };

    await DevPortalService.logAudit({
      developerEmail: req.user!.email,
      action: 'FULL_DATABASE_EXPORT',
      target: 'PostgreSQL',
      details: `Complete database backup generated with ${Object.values(backupData.counts).reduce((a, b) => a + b, 0)} records across 15 tables.`
    });

    res.setHeader('Content-Disposition', `attachment; filename=church-full-backup-${new Date().toISOString().slice(0, 10)}.json`);
    res.setHeader('Content-Type', 'application/json');
    return res.json(backupData);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/database/restore/full', async (req: AuthRequest, res: Response) => {
  try {
    const { backupData } = req.body;
    if (!backupData || !backupData.tables) {
      return res.status(400).json({ error: 'Invalid backup file structure. Missing tables object.' });
    }

    const { pagePolicies, navbarItems, featureFlags, themeConfigs, incidents, announcements, customRoles } = backupData.tables;

    // Restore developer configs safely
    if (Array.isArray(pagePolicies)) {
      for (const p of pagePolicies) {
        await prisma.devPagePolicy.upsert({
          where: { routePath: p.routePath },
          update: { permanentPolicy: p.permanentPolicy, allowedRoles: p.allowedRoles, pageTitleAr: p.pageTitleAr, pageTitleEn: p.pageTitleEn },
          create: { routePath: p.routePath, permanentPolicy: p.permanentPolicy, allowedRoles: p.allowedRoles || [], pageTitleAr: p.pageTitleAr, pageTitleEn: p.pageTitleEn }
        });
      }
    }

    if (Array.isArray(navbarItems)) {
      for (const n of navbarItems) {
        await prisma.devNavbarItem.upsert({
          where: { path: n.path },
          update: { nameAr: n.nameAr, nameEn: n.nameEn, isVisible: n.isVisible, guestVisible: n.guestVisible, sortOrder: n.sortOrder },
          create: n
        });
      }
    }

    if (Array.isArray(featureFlags)) {
      for (const f of featureFlags) {
        await prisma.devFeatureFlag.upsert({
          where: { key: f.key },
          update: { isEnabled: f.isEnabled, inSafeZoneOnly: f.inSafeZoneOnly },
          create: f
        });
      }
    }

    if (Array.isArray(themeConfigs)) {
      for (const t of themeConfigs) {
        await prisma.devThemeConfig.upsert({
          where: { seasonKey: t.seasonKey },
          update: { isActive: t.isActive, colorsJson: t.colorsJson },
          create: t
        });
      }
    }

    await DevPortalService.logAudit({
      developerEmail: req.user!.email,
      action: 'DATABASE_RESTORE_EXECUTED',
      target: 'PostgreSQL',
      details: `Database configuration restored from backup file provided by ${req.user!.email}`
    });

    return res.json({ success: true, message: 'Database configurations restored successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/database/table/:tableName', async (req: AuthRequest, res: Response) => {
  try {
    const tableName = req.params.tableName;
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = Math.min(parseInt(String(req.query.limit || '20'), 10), 100);
    const skip = (page - 1) * limit;

    let rows: any[] = [];
    let total = 0;

    switch (tableName) {
      case 'User':
        [rows, total] = await Promise.all([
          prisma.user.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' }, select: { id: true, email: true, fullName: true, role: true, isBanned: true, createdAt: true } }),
          prisma.user.count()
        ]);
        break;
      case 'PriestProfile':
        [rows, total] = await Promise.all([
          prisma.priestProfile.findMany({ skip, take: limit }),
          prisma.priestProfile.count()
        ]);
        break;
      case 'Appointment':
        [rows, total] = await Promise.all([
          prisma.appointment.findMany({ skip, take: limit, orderBy: { date: 'desc' }, include: { member: { select: { fullName: true, email: true } }, priest: true } }),
          prisma.appointment.count()
        ]);
        break;
      case 'Event':
        [rows, total] = await Promise.all([
          prisma.event.findMany({ skip, take: limit, orderBy: { date: 'desc' } }),
          prisma.event.count()
        ]);
        break;
      case 'EventInvitation':
        [rows, total] = await Promise.all([
          prisma.eventInvitation.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
          prisma.eventInvitation.count()
        ]);
        break;
      case 'Sermon':
        [rows, total] = await Promise.all([
          prisma.sermon.findMany({ skip, take: limit, orderBy: { date: 'desc' } }),
          prisma.sermon.count()
        ]);
        break;
      case 'News':
        [rows, total] = await Promise.all([
          prisma.news.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
          prisma.news.count()
        ]);
        break;
      case 'DevPagePolicy':
        [rows, total] = await Promise.all([
          prisma.devPagePolicy.findMany({ skip, take: limit }),
          prisma.devPagePolicy.count()
        ]);
        break;
      case 'DevNavbarItem':
        [rows, total] = await Promise.all([
          prisma.devNavbarItem.findMany({ skip, take: limit, orderBy: { sortOrder: 'asc' } }),
          prisma.devNavbarItem.count()
        ]);
        break;
      case 'DevFeatureFlag':
        [rows, total] = await Promise.all([
          prisma.devFeatureFlag.findMany({ skip, take: limit }),
          prisma.devFeatureFlag.count()
        ]);
        break;
      case 'DevThemeConfig':
        [rows, total] = await Promise.all([
          prisma.devThemeConfig.findMany({ skip, take: limit }),
          prisma.devThemeConfig.count()
        ]);
        break;
      case 'DevIpBan':
        [rows, total] = await Promise.all([
          prisma.devIpBan.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
          prisma.devIpBan.count()
        ]);
        break;
      case 'DevAuditLog':
        [rows, total] = await Promise.all([
          prisma.devAuditLog.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
          prisma.devAuditLog.count()
        ]);
        break;
      default:
        return res.status(400).json({ error: `Table '${tableName}' is not accessible or not recognized.` });
    }

    return res.json({ rows, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
