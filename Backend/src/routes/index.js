import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import departmentRoutes from './departmentRoutes.js';
import challengeRoutes from './challengeRoutes.js';
import startupRoutes from './startupRoutes.js';
import applicationRoutes from './applicationRoutes.js';
import evaluationRoutes from './evaluationRoutes.js';
import pilotRoutes from './pilotRoutes.js';
import kpiRoutes from './kpiRoutes.js';
import milestoneRoutes from './milestoneRoutes.js';
import evidenceRoutes from './evidenceRoutes.js';
import riskRoutes from './riskRoutes.js';
import validationRoutes from './validationRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import auditLogRoutes from './auditLogRoutes.js';
import adminRoutes from './adminRoutes.js';
import aiRoutes from './aiRoutes.js';
import decisionRoutes from './decisionRoutes.js';

const router = Router();

// Base /api/v1 API info
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SetuGov API v1 is active and running',
    version: '1.0.0',
    documentation: '/api/v1/docs',
    endpoints: {
      health: '/api/v1/health',
      healthAi: '/api/v1/health/ai',
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      departments: '/api/v1/departments',
      challenges: '/api/v1/challenges',
      startups: '/api/v1/startups',
      applications: '/api/v1/applications',
      evaluations: '/api/v1/evaluations',
      decisions: '/api/v1/decisions',
      pilots: '/api/v1/pilots',
      kpis: '/api/v1/kpis',
      milestones: '/api/v1/milestones',
      evidence: '/api/v1/evidence',
      risks: '/api/v1/risks',
      validations: '/api/v1/validations',
      payments: '/api/v1/payments',
      notifications: '/api/v1/notifications',
      auditLogs: '/api/v1/audit-logs',
      admin: '/api/v1/admin',
      ai: '/api/v1/ai'
    }
  });
});

// Mounted Routes
router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/departments', departmentRoutes);
router.use('/challenges', challengeRoutes);
router.use('/startups', startupRoutes);
router.use('/applications', applicationRoutes);
router.use('/evaluations', evaluationRoutes);
router.use('/decisions', decisionRoutes);
router.use('/pilots', pilotRoutes);
router.use('/kpis', kpiRoutes);
router.use('/milestones', milestoneRoutes);
router.use('/evidence', evidenceRoutes);
router.use('/risks', riskRoutes);
router.use('/validations', validationRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/admin', adminRoutes);
router.use('/ai', aiRoutes);

export default router;
