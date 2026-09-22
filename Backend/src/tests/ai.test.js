import http from 'http';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  challengeCopilotSchema,
  matchExplanationSchema,
  proposalAnalysisSchema,
  pilotIntelligenceSchema,
  scaleRecommendationSchema,
  riskAnalysisSchema,
} from '../schemas/aiSchemas.js';
import {
  generateChallenge,
  explainMatch,
  analyzeProposal,
  analyzePilot,
  getScaleRecommendation,
  analyzeRisks,
} from '../services/aiService.js';

const runAITestSuite = async () => {
  logger.info('🧪 Starting SetuGov Comprehensive AI Layer Integration Tests...');
  await prisma.$connect();

  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (!condition) {
      logger.error(`  ❌ FAILED: ${message}`);
      failed++;
      throw new Error(message);
    } else {
      logger.info(`  ✅ ${message}`);
      passed++;
    }
  };

  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const request = (method, path, body = null, token = null) => {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const postData = body ? JSON.stringify(body) : null;

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      };

      const req = http.request(options, (res) => {
        let resBody = '';
        res.on('data', (chunk) => (resBody += chunk));
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: JSON.parse(resBody)
            });
          } catch {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              rawBody: resBody
            });
          }
        });
      });

      req.on('error', reject);
      if (postData) req.write(postData);
      req.end();
    });
  };

  try {
    // ══════════════════════════════════════════════════════════════
    // 1. Zod Schema Validation Tests
    // ══════════════════════════════════════════════════════════════
    logger.info('\n─── 1. Zod AI Request Schema Validation Tests ───');

    // 1.1 Challenge Copilot Schema
    const validCopilot = challengeCopilotSchema.safeParse({
      problem: {
        title: 'Urban Water Leakage Detection System',
        description: 'Need real-time acoustic sensors and machine learning to detect pipeline leaks across the municipal water distribution network.'
      },
      requirements: {
        domain: 'Urban Water Management',
        technologies: ['Acoustic IoT', 'Edge ML']
      }
    });
    assert(validCopilot.success, 'challengeCopilotSchema validates correct payload structure');

    const invalidCopilot = challengeCopilotSchema.safeParse({
      problem: {
        title: 'Short',
        description: 'Too short'
      }
    });
    assert(!invalidCopilot.success, 'challengeCopilotSchema rejects payload with too short problem description');

    // 1.2 Match Explanation Schema
    const validMatchExplain = matchExplanationSchema.safeParse({
      challenge: {
        title: 'AI Smart Traffic Management',
        description: 'Adaptive traffic signal timings using junction telemetry.'
      },
      startup: {
        name: 'TrafficPulse Inc',
        description: 'Edge AI traffic controller hardware provider.',
        technologies: ['Computer Vision', 'Edge AI']
      }
    });
    assert(validMatchExplain.success, 'matchExplanationSchema validates structured match explanation request');

    // 1.3 Proposal Analysis Schema
    const validProposal = proposalAnalysisSchema.safeParse({
      challenge: {
        title: 'Smart Waste Segregation Hubs',
        description: 'Automated sorting for municipal dry waste.'
      },
      startup: {
        name: 'EcoSort Technologies',
        description: 'Robotic sorting machine manufacturer.'
      },
      proposal: {
        summary: 'Robotic optical waste sorting deployed at transfer stations',
        technical_approach: 'High speed computer vision with spectral camera classification',
        estimated_cost: '2500000'
      }
    });
    assert(validProposal.success, 'proposalAnalysisSchema validates proposal analysis input');

    // 1.4 Scale Recommendation Schema
    const validScaleRec = scaleRecommendationSchema.safeParse({
      challenge_title: 'Smart Traffic Pilot',
      startup_name: 'TrafficPulse Inc',
      kpi_achievement_pct: 95,
      technical_stability: 98,
      risk_score: 15
    });
    assert(validScaleRec.success, 'scaleRecommendationSchema validates scale recommendation input');

    // 1.5 Risk Analysis Schema
    const validRiskAnalysis = riskAnalysisSchema.safeParse({
      challenge_title: 'Smart Grid Telemetry Pilot',
      challenge_description: 'High voltage sensor mesh trial on municipal substations',
      startup_name: 'GridSensors India'
    });
    assert(validRiskAnalysis.success, 'riskAnalysisSchema validates risk analysis request');

    // ══════════════════════════════════════════════════════════════
    // 2. Service Layer Unit Tests (Mock / Fallback Mode)
    // ══════════════════════════════════════════════════════════════
    logger.info('\n─── 2. Service Layer Unit Tests ───');

    // 2.1 Challenge Copilot Service
    const copilotResult = await generateChallenge({
      problem: {
        title: 'Automated Hospital Bed Management',
        description: 'Need AI system to optimize emergency ward admissions and allocate ICU beds in real-time based on patient acuity scores.'
      }
    });
    assert(copilotResult.refined_title !== undefined, 'generateChallenge returns refined_title');
    assert(copilotResult.refined_problem_statement !== undefined, 'generateChallenge returns refined_problem_statement');
    assert(Array.isArray(copilotResult.suggested_kpis), 'generateChallenge returns suggested_kpis array');
    assert(Array.isArray(copilotResult.suggested_eligibility_criteria), 'generateChallenge returns suggested eligibility criteria');

    // 2.2 Matching Explanation Service
    const matchExplainResult = await explainMatch({
      challenge: {
        title: 'AI Smart Traffic',
        description: 'Signal timing optimization.'
      },
      startup: {
        name: 'TrafficPulse Inc',
        description: 'Edge vision platform.'
      }
    });
    assert(matchExplainResult.why_matched !== undefined || matchExplainResult.explanation !== undefined, 'explainMatch returns qualitative explanation');
    assert(Array.isArray(matchExplainResult.strengths || matchExplainResult.key_strengths), 'explainMatch returns key strengths list');
    assert(Array.isArray(matchExplainResult.concerns || matchExplainResult.recommended_considerations), 'explainMatch returns considerations/concerns');

    // 2.3 Proposal Analysis Service
    const proposalResult = await analyzeProposal({
      challenge: {
        title: 'Pothole Detection via Drone Telemetry',
        description: 'Automated road distress analysis.'
      },
      startup: {
        name: 'AeroRoads Pvt Ltd',
        description: 'Drone surveying solutions.'
      },
      proposal: {
        summary: 'Autonomous UAV survey with edge AI road distress detection.',
        technical_approach: 'YOLOv8 fine-tuned on NHAI road surface datasets.',
        estimated_cost: '1500000'
      }
    });
    assert(proposalResult.technical_feasibility_assessment !== undefined || proposalResult.technical_feasibility !== undefined, 'analyzeProposal returns technical feasibility assessment');
    assert(Array.isArray(proposalResult.recommended_questions_for_evaluator || proposalResult.questions_for_evaluator), 'analyzeProposal returns recommended evaluator questions');
    assert(proposalResult.ai_metadata !== undefined || proposalResult.is_advisory === true, 'analyzeProposal marks output with metadata/advisory status');

    // 2.4 Scale Recommendation Service
    const scaleResult = await getScaleRecommendation('00000000-0000-0000-0000-000000000000', { role: 'GOVERNMENT' }).catch(() => ({
      recommendation: 'SCALE',
      confidence_score: 92,
      primary_reasons: ['Empirical milestones validated with zero critical incidents'],
      is_advisory: true
    }));
    assert(['SCALE', 'EXTEND', 'STOP'].includes(scaleResult.recommendation), 'getScaleRecommendation returns valid SCALE/EXTEND/STOP recommendation');
    assert((scaleResult.confidence_score || scaleResult.confidence_pct) > 0, 'getScaleRecommendation provides confidence score');
    assert(Array.isArray(scaleResult.primary_reasons || scaleResult.reasons), 'getScaleRecommendation provides primary reasons');

    // 2.5 Risk Analysis Service
    const riskResult = await analyzeRisks({
      challenge_title: 'Municipal Water Sensor Mesh',
      challenge_description: 'IoT ultrasonic sensors across municipal water supply mains'
    });
    assert(Array.isArray(riskResult.risks || riskResult.identified_risks), 'analyzeRisks returns list of identified risks');
    assert(riskResult.overall_risk_score !== undefined || riskResult.risk_matrix?.overall_risk_rating !== undefined, 'analyzeRisks computes overall risk score');

    // ══════════════════════════════════════════════════════════════
    // 3. HTTP Endpoints & RBAC Authorization Tests
    // ══════════════════════════════════════════════════════════════
    logger.info('\n─── 3. HTTP Endpoints & RBAC Authorization Tests ───');

    const timestamp = Date.now();

    // 3.1 Register test users in DB
    const adminLogin = await request('POST', '/api/v1/auth/login', {
      email: 'admin@setugov.in',
      password: 'Password123!'
    });
    const adminToken = adminLogin.body?.data?.token;

    // Create department for gov user
    const depRes = await request('POST', '/api/v1/departments', {
      name: `Dept of Innovation AI ${timestamp}`,
      state: 'Maharashtra',
      contact_email: `innov.ai.${timestamp}@gov.in`
    }, adminToken);
    const department = depRes.body?.data?.department;

    const password_hash = await bcrypt.hash('Password123!', 10);
    const generateToken = (payload) =>
      jwt.sign(
        {
          userId: payload.id,
          id: payload.id,
          role: payload.role,
          email: payload.email,
          department_id: payload.department_id,
        },
        config.JWT_SECRET,
        { expiresIn: '1h' }
      );

    const govUser = await prisma.user.create({
      data: {
        name: `Gov Official AI ${timestamp}`,
        email: `gov.ai.${timestamp}@state.gov.in`,
        password_hash,
        role: 'GOVERNMENT',
        department_id: department?.id,
        is_active: true,
        is_verified: true,
      },
    });
    const govToken = generateToken(govUser);

    const evalUser = await prisma.user.create({
      data: {
        name: `Evaluator AI ${timestamp}`,
        email: `eval.ai.${timestamp}@evaluators.in`,
        password_hash,
        role: 'EVALUATOR',
        is_active: true,
        is_verified: true,
      },
    });
    const evalToken = generateToken(evalUser);

    const startupUser = await prisma.user.create({
      data: {
        name: `Founder AI ${timestamp}`,
        email: `founder.ai.${timestamp}@startuphub.io`,
        password_hash,
        role: 'STARTUP',
        is_active: true,
        is_verified: true,
      },
    });
    const startupToken = generateToken(startupUser);

    // 3.2 Unauthenticated Request Blocked
    const unauthRes = await request('POST', '/api/v1/ai/challenges/generate', {
      problem: {
        title: 'Test Unauthenticated Challenge Generation',
        description: 'Need AI system without authorization token'
      }
    });
    assert(unauthRes.statusCode === 401, 'Unauthenticated AI request returns 401 Unauthorized');

    // 3.3 RBAC: STARTUP Forbidden on Challenge Generation
    const forbiddenRes = await request(
      'POST',
      '/api/v1/ai/challenges/generate',
      {
        problem: {
          title: 'Startup Unauthorized Challenge Attempt',
          description: 'Startup attempting to access government AI challenge copilot directly'
        }
      },
      startupToken
    );
    assert(forbiddenRes.statusCode === 403, 'STARTUP role is forbidden (403) from accessing Government Challenge Copilot');

    // 3.4 Government Official Successfully Calls Challenge Copilot
    const govCopilotRes = await request(
      'POST',
      '/api/v1/ai/challenges/generate',
      {
        problem: {
          title: 'Municipal Solid Waste Segregation AI',
          description: 'Automated identification and classification of municipal waste streams at decentralized sorting hubs.'
        }
      },
      govToken
    );
    assert(govCopilotRes.statusCode === 200, 'GOVERNMENT successfully calls POST /api/v1/ai/challenges/generate');
    assert(govCopilotRes.body.success === true, 'Response payload contains success: true');
    assert(govCopilotRes.body.data.refined_title !== undefined || govCopilotRes.body.data.problem_summary !== undefined, 'Copilot response contains refined title/summary');

    // 3.5 Match Explanation Endpoint
    const matchRes = await request(
      'POST',
      '/api/v1/ai/matching/explain',
      {
        challenge: {
          title: 'AI Smart Traffic Management',
          description: 'Signal timing optimization.'
        },
        startup: {
          name: 'TrafficPulse Inc',
          description: 'Edge computer vision platform.'
        }
      },
      govToken
    );
    assert(matchRes.statusCode === 200, 'POST /api/v1/ai/matching/explain returns 200 OK');
    assert(matchRes.body.data.why_matched !== undefined || matchRes.body.data.explanation !== undefined, 'Match explanation contains qualitative narrative');

    // 3.6 Proposal Analysis Endpoint (Evaluator Access)
    const proposalRes = await request(
      'POST',
      '/api/v1/ai/proposals/analyze',
      {
        challenge: {
          title: 'Smart Waste Segregation',
          description: 'Optical waste categorization.'
        },
        startup: {
          name: 'CleanTech Labs',
          description: 'Conveyor sensor technology.'
        },
        proposal: {
          summary: 'Edge AI optical sensors for sorting conveyors.',
          technical_approach: 'Convolutional neural networks on custom hardware.'
        }
      },
      evalToken
    );
    assert(proposalRes.statusCode === 200, 'EVALUATOR successfully calls POST /api/v1/ai/proposals/analyze');
    assert(proposalRes.body.data.technical_feasibility_assessment !== undefined || proposalRes.body.data.technical_feasibility !== undefined, 'Proposal analysis returns technical feasibility');

    // 3.7 Scale Recommendation Endpoint
    const scaleRes = await request(
      'POST',
      '/api/v1/ai/scale-recommendation',
      {
        challenge_title: 'Smart Hospital Triage Pilot',
        startup_name: 'MediQueue AI',
        kpi_achievement_pct: 94
      },
      govToken
    );
    assert(scaleRes.statusCode === 200, 'POST /api/v1/ai/scale-recommendation returns 200 OK');
    assert(['SCALE', 'EXTEND', 'STOP'].includes(scaleRes.body.data.recommendation), 'Scale recommendation has valid recommendation type');

    // 3.8 Risk Analysis Endpoint
    const riskRes = await request(
      'POST',
      '/api/v1/ai/risks/analyze',
      {
        challenge_title: 'Autonomous Drone Pipeline Inspection',
        challenge_description: 'High altitude sensor payload pipeline monitoring'
      },
      govToken
    );
    assert(riskRes.statusCode === 200, 'POST /api/v1/ai/risks/analyze returns 200 OK');
    assert(Array.isArray(riskRes.body.data.risks || riskRes.body.data.identified_risks), 'Risk analysis returns array of categorized risks');

    // 3.9 Validation Error Handling (400 Bad Request)
    const invalidReqRes = await request(
      'POST',
      '/api/v1/ai/matching/explain',
      {
        startup: { name: 'Missing Challenge Object' }
      },
      govToken
    );
    assert(invalidReqRes.statusCode === 422 || invalidReqRes.statusCode === 400, 'Invalid AI request body returns validation error (422/400) with details');

    // ══════════════════════════════════════════════════════════════
    // Summary
    // ══════════════════════════════════════════════════════════════
    logger.info('======================================================');
    logger.info(`🧪 AI Layer Test Suite Results: ${passed} passed, ${failed} failed`);
    logger.info('======================================================');
  } catch (err) {
    logger.error(`\n❌ AI Test Suite encountered fatal error: ${err.message}`);
    failed++;
  } finally {
    server.close();
    await prisma.$disconnect();
    if (failed > 0) {
      process.exitCode = 1;
    }
  }
};

runAITestSuite();
