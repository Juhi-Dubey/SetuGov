import { prisma } from '../config/prisma.js';

export const getDashboardOverview = async () => {
  const [
    totalUsers,
    usersByRole,
    totalDepartments,
    totalChallenges,
    challengesByStatus,
    totalStartups,
    startupsByVerification,
    totalApplications,
    applicationsByStatus,
    totalPilots,
    pilotsByStatus,
    recentAuditLogs
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({
      by: ['role'],
      _count: { id: true }
    }),
    prisma.department.count(),
    prisma.challenge.count(),
    prisma.challenge.groupBy({
      by: ['status'],
      _count: { id: true }
    }),
    prisma.startup.count(),
    prisma.startup.groupBy({
      by: ['verification_status'],
      _count: { id: true }
    }),
    prisma.application.count(),
    prisma.application.groupBy({
      by: ['status'],
      _count: { id: true }
    }),
    prisma.pilot.count(),
    prisma.pilot.groupBy({
      by: ['status'],
      _count: { id: true }
    }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })
  ]);

  return {
    summary: {
      totalUsers,
      totalDepartments,
      totalChallenges,
      totalStartups,
      totalApplications,
      totalPilots
    },
    usersBreakdown: usersByRole.reduce((acc, curr) => {
      acc[curr.role] = curr._count.id;
      return acc;
    }, {}),
    challengesBreakdown: challengesByStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {}),
    startupsBreakdown: startupsByVerification.reduce((acc, curr) => {
      acc[curr.verification_status] = curr._count.id;
      return acc;
    }, {}),
    applicationsBreakdown: applicationsByStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {}),
    pilotsBreakdown: pilotsByStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {}),
    recentAuditLogs
  };
};

export default {
  getDashboardOverview
};
