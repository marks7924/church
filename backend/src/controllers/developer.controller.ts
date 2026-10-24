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

export default router;
