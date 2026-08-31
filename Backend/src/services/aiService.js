import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError, NotFoundError, ForbiddenError } from '../utils/errors.js';

/**
 * Helper to execute HTTP request to Python AI service.
 * Returns the parsed JSON body on success, or null on failure (for mock fallback).
 */
const callExternalAiService = async (endpoint, payload) => {
  if (config.AI_MOCK_MODE) {
    return null; // Force mock fallback
  }

  try {
    const url = `${config.AI_SERVICE_URL}${endpoint}`;
    logger.info(`AI Service → POST ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120000) // 120s timeout for local LLM inference
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      logger.warn(`AI service returned ${response.status}: ${errorBody}`);
      throw new AppError(
        `AI service returned HTTP ${response.status}`,
        502,
        'AI_SERVICE_ERROR'
      );
    }

    const json = await response.json();

    // Validate the AI envelope
    if (!json || typeof json !== 'object') {
      throw new AppError('AI service returned malformed response', 502, 'AI_MALFORMED_RESPONSE');
    }

    return json;
  } catch (error) {
    // Re-throw AppErrors (our own errors from above)
    if (error instanceof AppError) {
      throw error;
    }

    // Network / timeout errors
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new AppError(
        'AI service request timed out',
        504,
        'AI_TIMEOUT'
      );
    }

    // Connection refused / DNS errors
    throw new AppError(
      `AI service unavailable: ${error.message}`,
      503,
      'AI_SERVICE_UNAVAILABLE'
    );
  }
};

/**
 * Brain 1 — Challenge Copilot
 *
 * Calls POST /ai/challenge on the Python AI service.
 * Input must match ChallengeCopilotRequest schema.
 * Returns ChallengeCopilotResponse fields.
 */
export const generateChallenge = async (input) => {
  // Attempt real AI service call
  const externalResult = await callExternalAiService('/ai/challenge', input);

  if (externalResult) {
    // AI service returns { success: true, data: { ...ChallengeCopilotResponse } }
    if (externalResult.success && externalResult.data) {
      return {
        ...externalResult.data,
        ai_metadata: { mode: 'live' }
      };
    }

    // AI returned an unexpected envelope shape
    throw new AppError('AI service returned unexpected response structure', 502, 'AI_MALFORMED_RESPONSE');
  }

  // Mock mode fallback — mirrors the real ChallengeCopilotResponse schema exactly
  const title = input.problem?.title || 'Government Innovation Challenge';
  const description = input.problem?.description || '';

  return {
    // Analyze
    problem_summary: `Government operational problem: ${title}. ${description}`.trim(),
    stakeholders: [
      'Department officials and administrative staff',
      'Citizens and service beneficiaries',
      'IT infrastructure and operations teams'
    ],
    root_cause_hypotheses: [
      'Manual processes creating operational bottlenecks (Hypothesis requiring validation)',
      'Insufficient digital infrastructure for service delivery (Hypothesis requiring validation)',
      'Lack of real-time monitoring and data-driven decision support (Hypothesis requiring validation)'
    ],
    // Suggest
    desired_outcome: input.outcome?.desired_outcome || null,
    success_definition: input.outcome?.success_definition || null,
    suggested_kpis: (input.measurement?.kpis || []).length > 0
      ? input.measurement.kpis.map(kpi => ({
          name: kpi.name,
          description: kpi.description || `Measures ${kpi.name}`,
          unit: kpi.unit || null,
          baseline: kpi.baseline ?? null,
          target: kpi.target ?? null,
          direction: kpi.direction || null,
          measurement_method: kpi.measurement_method || null,
          suggested_weight: kpi.weight ?? null,
          reason: 'User-provided KPI'
        }))
      : [
          {
            name: 'Service Delivery Time',
            description: 'Average time from citizen request to service completion',
            unit: 'minutes',
            baseline: null,
            target: null,
            direction: 'decrease',
            measurement_method: 'System timestamp analysis',
            suggested_weight: 30,
            reason: 'Core operational efficiency metric'
          },
          {
            name: 'Process Digitization Rate',
            description: 'Percentage of processes completed digitally end-to-end',
            unit: 'percent',
            baseline: null,
            target: null,
            direction: 'increase',
            measurement_method: 'Digital transaction audit',
            suggested_weight: 25,
            reason: 'Digital transformation indicator'
          },
          {
            name: 'Citizen Satisfaction Score',
            description: 'Citizen feedback score on service quality',
            unit: 'score (1-5)',
            baseline: null,
            target: null,
            direction: 'increase',
            measurement_method: 'Post-service survey',
            suggested_weight: 25,
            reason: 'Outcome quality measure'
          }
        ],
    pilot_recommendation: {
      suggested_duration: input.pilot?.duration || '60 days',
      suggested_sites: input.pilot?.sites || null,
      suggested_budget_considerations: input.pilot?.budget || null,
      rationale: 'Standard pilot duration for field validation of government technology solutions.'
    },
    technology_categories: input.requirements?.technologies || ['AI / ML', 'Cloud Platform', 'Mobile Interface'],
    domain: input.requirements?.domain || null,
    eligibility_considerations: [
      'DPIIT-recognized startup entity',
      'Relevant domain experience in government or public sector projects',
      'Demonstrated technical capability in proposed technology stack'
    ],
    suggested_documents: [
      'Technical architecture document',
      'Implementation timeline and milestone plan',
      'Cost breakdown and budget justification',
      'Team qualifications and past project references'
    ],
    // Validate
    missing_information: _computeMockMissingInfo(input),
    assumptions: [
      'Subject to pilot validation: Current manual processes can be digitized within the proposed timeline',
      'Subject to pilot validation: Existing IT infrastructure supports proposed solution integration'
    ],
    warnings: [],
    // Deterministic
    readiness: _computeMockReadiness(input),
    // Metadata
    ai_metadata: {
      model: 'SetuGov-Challenge-Copilot-Mock',
      mode: 'mock',
      disclaimer: 'This analysis is generated by deterministic heuristics. Government officials must review and validate before publishing.'
    }
  };
};

/**
 * Brain 2 — Startup Match Explanation
 *
 * Calls POST /ai/match on the Python AI service.
 * Input must match MatchExplanationRequest schema.
 * Returns MatchExplanationResponse qualitative explanation fields.
 * NOTE: The deterministic score calculated by the Backend remains authoritative.
 */
export const explainMatch = async (input) => {
  const challenge = input.challenge || {};
  const startup = input.startup || {};

  try {
    const externalResult = await callExternalAiService('/ai/match', input);
    if (externalResult && externalResult.success && externalResult.data) {
      return {
        ...externalResult.data,
        ai_metadata: { mode: 'live' }
      };
    }
  } catch (err) {
    logger.warn(`Brain 2 match explanation live call failed: ${err.message}. Using deterministic fallback explanation.`);
  }

  // Mock / Fallback deterministic explanation matching Brain 2 contract
  const techCategories = challenge.technology_categories || [];
  const startupTechs = startup.technologies || [];
  const overlap = techCategories.filter(tc =>
    startupTechs.some(st => st.toLowerCase().includes(tc.toLowerCase()) || tc.toLowerCase().includes(st.toLowerCase()))
  );

  const strengths = [];
  if (overlap.length > 0) {
    strengths.push(`Stated alignment in core technologies: ${overlap.join(', ')}.`);
  } else if (startupTechs.length > 0) {
    strengths.push(`Relevant technical stack capabilities: ${startupTechs.slice(0, 3).join(', ')}.`);
  }
  if (startup.domain && challenge.domain && startup.domain.toLowerCase() === challenge.domain.toLowerCase()) {
    strengths.push(`Direct sector alignment in ${startup.domain}.`);
  }
  if (startup.experience) {
    strengths.push(`Reported track record: ${startup.experience}.`);
  }
  if (strengths.length === 0) {
    strengths.push(`Verified startup profile in ${startup.domain || 'innovation'} sector.`);
  }

  const concerns = [
    'Capabilities based on self-reported startup profile; independent technical audit recommended prior to deployment.',
    'Integration readiness with legacy departmental infrastructure must be validated during pilot.'
  ];

  const missingInfo = [];
  if (!startup.certifications || startup.certifications.length === 0) {
    missingInfo.push('Third-party certifications and security compliance audits not attached to profile.');
  }
  if (!startup.deployments || startup.deployments.length === 0) {
    missingInfo.push('Detailed public sector deployment case studies not listed.');
  }

  const deploymentConsiderations = [
    challenge.location ? `Target deployment location: ${challenge.location}.` : 'Field deployment site readiness required.',
    'Requires departmental nodal officer coordination for milestone tracking.'
  ];

  return {
    score: {
      technology_fit: overlap.length > 0 ? 25.0 : 10.0,
      domain_fit: 20.0,
      readiness: 15.0,
      experience: 10.0,
      deployment_fit: 8.0,
      total: 78.0
    },
    why_matched: `Startup ${startup.name || 'Entity'} demonstrates relevant operational capabilities for "${challenge.title || 'the Challenge'}" in ${challenge.domain || 'the target domain'}.`,
    strengths,
    concerns,
    missing_information: missingInfo,
    deployment_considerations: deploymentConsiderations,
    ai_metadata: {
      model: 'SetuGov-Match-Copilot-Mock',
      mode: 'mock',
      notice: 'AI explanation is an advisory input. Deterministic scoring remains authoritative.'
    }
  };
};

/**
 * Compute mock readiness score mirroring ReadinessScore schema
 */
const _computeMockReadiness = (input) => {
  const problemClarity = (input.problem?.description?.length || 0) > 50 ? 18.0 : 10.0;
  const baselineCompleteness = input.problem?.baseline ? 12.0 : 3.0;
  const outcomeMeasurability = input.outcome?.desired_outcome ? 16.0 : 5.0;
  const kpiCompleteness = (input.measurement?.kpis?.length || 0) >= 2 ? 16.0 : 4.0;
  const pilotReadiness = input.pilot?.duration ? 8.0 : 3.0;
  const requirementsClarity = (input.requirements?.technologies?.length || 0) >= 1 ? 8.0 : 2.0;
  const evidencePlanning = (input.measurement?.kpis?.length || 0) >= 1 ? 4.0 : 1.0;

  const score = Math.min(100, problemClarity + baselineCompleteness + outcomeMeasurability +
    kpiCompleteness + pilotReadiness + requirementsClarity + evidencePlanning);

  return {
    score: Math.round(score * 10) / 10,
    problem_clarity: problemClarity,
    baseline_completeness: baselineCompleteness,
    outcome_measurability: outcomeMeasurability,
    kpi_completeness: kpiCompleteness,
    pilot_readiness: pilotReadiness,
    requirements_clarity: requirementsClarity,
    evidence_planning: evidencePlanning
  };
};

/**
 * Compute mock missing information based on what was not provided
 */
const _computeMockMissingInfo = (input) => {
  const missing = [];
  if (!input.problem?.baseline) missing.push('Current operational baseline data not provided.');
  if (!input.problem?.current_process) missing.push('Current process description not provided.');
  if (!input.outcome?.desired_outcome) missing.push('Desired outcome not specified.');
  if (!input.outcome?.success_definition) missing.push('Success definition not specified.');
  if (!input.measurement?.kpis?.length) missing.push('No KPIs defined for measurement.');
  if (!input.pilot?.duration) missing.push('Pilot duration not specified.');
  if (!input.pilot?.sites?.length) missing.push('Pilot sites not specified.');
  if (!input.pilot?.budget) missing.push('Pilot budget not specified.');
  if (!input.requirements?.technologies?.length) missing.push('Required technology categories not specified.');
  return missing;
};

/**
 * Brain 4 — Pilot Intelligence / Pilot Analysis
 *
 * Calls POST /ai/pilot on the Python AI service.
 * Input must match PilotIntelligenceRequest schema.
 * Returns PilotIntelligenceResponse fields for pilot interpretation.
 */
export const analyzePilot = async (input) => {
  const challengeTitle = input.challenge_title || 'Pilot Challenge';
  const startupName = input.startup_name || 'Startup';
  const kpiResults = Array.isArray(input.kpi_results) ? input.kpi_results : [];
  const milestones = Array.isArray(input.milestones) ? input.milestones : [];
  const risks = Array.isArray(input.risks) ? input.risks : [];
  const evidence = Array.isArray(input.evidence) ? input.evidence : [];

  try {
    const externalResult = await callExternalAiService('/ai/pilot', input);
    if (externalResult && externalResult.success && externalResult.data) {
      return {
        ...externalResult.data,
        ai_metadata: { mode: 'live' }
      };
    }
  } catch (err) {
    logger.warn(`Brain 4 pilot analysis live call failed: ${err.message}. Using deterministic fallback interpretation.`);
  }

  // Deterministic calculations matching Python DecisionEngine
  const kpiAnalyses = kpiResults.map(kpi => {
    const baseline = kpi.baseline != null ? Number(kpi.baseline) : null;
    const target = kpi.target != null ? Number(kpi.target) : null;
    const actual = kpi.actual != null ? Number(kpi.actual) : null;

    let improvementPct = null;
    let targetAchievementPct = null;
    let status = 'INSUFFICIENT_DATA';
    let observation = null;

    if (baseline !== null && target !== null && actual !== null) {
      const isDecrease = kpi.direction === 'decrease' || target < baseline;

      if (isDecrease) {
        // e.g. baseline 90, target 60, actual 54
        const expectedDiff = baseline - target;
        const actualDiff = baseline - actual;
        improvementPct = baseline > 0 ? parseFloat(((actualDiff / baseline) * 100).toFixed(2)) : 0;
        targetAchievementPct = expectedDiff > 0 ? parseFloat(((actualDiff / expectedDiff) * 100).toFixed(2)) : 100;
      } else {
        const expectedDiff = target - baseline;
        const actualDiff = actual - baseline;
        improvementPct = baseline > 0 ? parseFloat(((actualDiff / baseline) * 100).toFixed(2)) : 0;
        targetAchievementPct = expectedDiff > 0 ? parseFloat(((actualDiff / expectedDiff) * 100).toFixed(2)) : 100;
      }

      if (targetAchievementPct >= 110) {
        status = 'EXCEEDED';
        observation = `Target significantly exceeded by ${(targetAchievementPct - 100).toFixed(1)}%.`;
      } else if (targetAchievementPct >= 95) {
        status = 'MET';
        observation = `Target successfully met with ${targetAchievementPct}% achievement.`;
      } else if (targetAchievementPct >= 75) {
        status = 'ON_TRACK';
        observation = `Progress is on track towards target milestone.`;
      } else if (targetAchievementPct >= 50) {
        status = 'AT_RISK';
        observation = `Performance is below expected target trajectory.`;
      } else {
        status = 'CRITICAL';
        observation = `Significant performance gap against baseline and target.`;
      }
    }

    return {
      name: kpi.name,
      baseline,
      target,
      actual,
      improvement_pct: improvementPct,
      target_achievement_pct: targetAchievementPct,
      status,
      observation
    };
  });

  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const milestoneCompletionRate = totalMilestones > 0
    ? parseFloat(((completedMilestones / totalMilestones) * 100).toFixed(2))
    : null;

  const riskCounts = {
    HIGH: risks.filter(r => (r.severity || '').toUpperCase() === 'HIGH' || (r.severity || '').toUpperCase() === 'CRITICAL').length,
    MEDIUM: risks.filter(r => (r.severity || '').toUpperCase() === 'MEDIUM').length,
    LOW: risks.filter(r => (r.severity || '').toUpperCase() === 'LOW').length
  };
  const riskSummary = `HIGH: ${riskCounts.HIGH}, MEDIUM: ${riskCounts.MEDIUM}, LOW: ${riskCounts.LOW}`;

  const observations = [
    `Pilot deployed by ${startupName} for "${challengeTitle}".`,
    `Tracked ${kpiResults.length} key performance indicators across designated locations.`
  ];
  if (milestoneCompletionRate !== null) {
    observations.push(`Milestone completion is currently at ${milestoneCompletionRate}%.`);
  }

  const concerns = [];
  if (riskCounts.HIGH > 0) {
    concerns.push(`${riskCounts.HIGH} high-severity risk(s) identified requiring active mitigation.`);
  }
  const unverifiedEvidence = evidence.filter(e => !e.verified).length;
  if (unverifiedEvidence > 0) {
    concerns.push(`${unverifiedEvidence} evidence submission(s) pending formal department verification.`);
  }

  const evidenceGaps = [];
  if (evidence.length === 0) {
    evidenceGaps.push('No telemetry logs or independent evidence uploaded for pilot deployment.');
  }

  const recommendedActions = [
    'Review latest telemetry measurements and confirm data verification status.',
    'Ensure all pending milestone deliverables have verified evidence attached.',
    'Address active technical and operational risks before final validation.'
  ];

  return {
    kpi_analyses: kpiAnalyses,
    milestone_completion_rate: milestoneCompletionRate,
    risk_summary: riskSummary,
    risk_counts: riskCounts,
    overall_assessment: `Pilot for "${challengeTitle}" by ${startupName} demonstrates active execution with ${kpiAnalyses.length} tracked metrics and ${riskCounts.HIGH} high risks.`,
    observations,
    concerns,
    evidence_gaps: evidenceGaps,
    recommended_actions: recommendedActions,
    ai_metadata: {
      model: 'SetuGov-Pilot-Intelligence-Mock',
      mode: 'mock',
      notice: 'AI pilot intelligence is an advisory input. Procurement and scaling decisions must be made by authorized officials.'
    }
  };
};

/**
 * Loads a Pilot and all related records from DB,
 * enforces tenant and RBAC authorization, maps data to Brain 4 request,
 * and calls analyzePilot without mutating database state.
 */
export const analyzePilotById = async (pilotId, user) => {
  const pilot = await prisma.pilot.findUnique({
    where: { id: pilotId },
    include: {
      challenge: { include: { department: true } },
      startup: true,
      kpis: {
        include: {
          measurements: {
            orderBy: { measurement_date: 'desc' }
          }
        }
      },
      milestones: {
        orderBy: { due_date: 'asc' }
      },
      evidence: {
        orderBy: { date: 'desc' }
      },
      risks: {
        orderBy: { created_at: 'desc' }
      },
      validations: {
        include: { validator: true },
        orderBy: { created_at: 'desc' }
      }
    }
  });

  if (!pilot) {
    throw new NotFoundError(`Pilot with ID ${pilotId} not found.`);
  }

  // Authorization check
  if (user) {
    if (user.role === 'ADMIN' || user.role === 'EVALUATOR') {
      // Allowed
    } else if (user.role === 'GOVERNMENT') {
      if (!user.department_id || pilot.challenge.department_id !== user.department_id) {
        throw new ForbiddenError('You can only analyze pilots for challenges belonging to your assigned department.');
      }
    } else {
      throw new ForbiddenError('Startups are not authorized to access AI pilot intelligence.');
    }
  }

  // Map to Brain 4 request payload
  const startDate = new Date(pilot.start_date);
  const endDate = new Date(pilot.end_date);
  const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));

  const kpiResults = (pilot.kpis || []).map(k => {
    const latestMeasurement = k.measurements && k.measurements.length > 0 ? k.measurements[0].value : null;
    const actual = latestMeasurement !== null ? latestMeasurement : (k.actual_value !== null ? k.actual_value : null);
    const direction = (k.target_value !== null && k.baseline_value !== null)
      ? (k.target_value < k.baseline_value ? 'decrease' : 'increase')
      : null;

    return {
      name: k.name,
      unit: k.unit || null,
      baseline: k.baseline_value !== null ? Number(k.baseline_value) : null,
      target: k.target_value !== null ? Number(k.target_value) : null,
      actual: actual !== null ? Number(actual) : null,
      direction
    };
  });

  const milestones = (pilot.milestones || []).map(m => ({
    name: m.name,
    expected_date: m.due_date ? new Date(m.due_date).toISOString().split('T')[0] : null,
    actual_date: null,
    status: (m.status || (m.completion_percentage === 100 ? 'completed' : 'pending')).toLowerCase(),
    notes: m.description || null
  }));

  const risks = (pilot.risks || []).map(r => ({
    category: (r.category || 'operational').toLowerCase(),
    description: r.description,
    severity: (r.severity || 'LOW').toUpperCase(),
    mitigation: r.mitigation || null
  }));

  const evidence = (pilot.evidence || []).map(e => ({
    description: e.description,
    source: e.source || null,
    verified: e.verification_status === 'VERIFIED'
  }));

  const latestValidation = pilot.validations && pilot.validations.length > 0 ? pilot.validations[0] : null;

  const payload = {
    challenge_title: pilot.challenge.title,
    startup_name: pilot.startup.company_name,
    pilot_duration: `${totalDays} days`,
    pilot_sites: pilot.location ? [pilot.location] : null,
    kpi_results: kpiResults,
    milestones,
    risks,
    evidence,
    user_feedback: latestValidation?.comments || null,
    technical_stability: latestValidation?.technical_stability_score != null ? `Technical stability score: ${latestValidation.technical_stability_score}%` : null,
    independent_validation: latestValidation ? `Validation score: ${latestValidation.performance_score}% (${latestValidation.status})` : null
  };

  try {
    const analysis = await analyzePilot(payload);
    return analysis;
  } catch (err) {
    logger.warn(`AI pilot analysis failure: ${err.message}. Returning fallback analysis response.`);
    return {
      kpi_analyses: [],
      milestone_completion_rate: null,
      risk_summary: "AI pilot analysis unavailable.",
      risk_counts: {
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0
      },
      overall_assessment: "Pilot analysis service is currently unavailable.",
      observations: [],
      concerns: [
        "AI analysis service unavailable."
      ],
      evidence_gaps: [],
      recommended_actions: [
        "Retry pilot analysis when the AI service is available."
      ],
      ai_metadata: {
        model: "SetuGov-Pilot-Intelligence-Fallback",
        mode: "fallback",
        notice: "AI analysis service is unavailable. Reviewers may continue monitoring pilots directly."
      }
    };
  }
};


/**
 * Brain 3 — Proposal Analysis / Application Intelligence
 *
 * Calls POST /ai/proposal on the Python AI service.
 * Input must match ProposalAnalysisRequest schema.
 * Returns ProposalAnalysisResponse fields for evaluator assistance.
 */
export const analyzeProposal = async (input) => {
  const challenge = input.challenge || {};
  const startup = input.startup || {};
  const proposal = input.proposal || {};
  const eligibility = input.eligibility || {};

  try {
    const externalResult = await callExternalAiService('/ai/proposal', input);
    if (externalResult && externalResult.success && externalResult.data) {
      return {
        ...externalResult.data,
        ai_metadata: { mode: 'live' }
      };
    }
  } catch (err) {
    logger.warn(`Brain 3 proposal analysis live call failed: ${err.message}. Using deterministic fallback explanation.`);
  }

  // Mock / Fallback proposal analysis matching Brain 3 contract
  const summary = proposal.summary || 'Startup solution proposal submitted for the challenge.';
  const techApproach = proposal.technical_approach || 'Solution approach leverages stated technologies for deployment.';
  const expectedImpact = proposal.expected_impact || 'Aims to achieve specified challenge performance targets.';
  const cost = proposal.estimated_cost ? String(proposal.estimated_cost) : null;
  const timeline = proposal.implementation_timeline ? String(proposal.implementation_timeline) : null;

  const risks = [
    {
      category: 'technical',
      description: 'Integration complexity with existing department infrastructure.',
      severity: 'MEDIUM',
      mitigation_suggestion: 'Conduct pre-pilot architecture review and sandbox testing.'
    },
    {
      category: 'operational',
      description: 'Operational adoption by field staff across designated locations.',
      severity: 'LOW',
      mitigation_suggestion: 'Provide structured training and milestone-based rollout.'
    }
  ];

  const missingInfo = [];
  if (!proposal.team_composition) {
    missingInfo.push('Detailed team composition and key personnel profiles not attached to proposal.');
  }
  if (!eligibility.dpiit_registered) {
    missingInfo.push('DPIIT registration certificate not verified in profile.');
  }
  if (!startup.certifications || startup.certifications.length === 0) {
    missingInfo.push('Relevant compliance and cybersecurity certifications not provided.');
  }

  const questionsForEvaluator = [
    `How does the proposed technical architecture ensure high availability during peak departmental workload?`,
    `Are the milestone payment terms and estimated cost of ${cost || 'the proposal'} aligned with standard public procurement benchmarks?`,
    `What specific data security and privacy measures will be implemented for public data protection?`
  ];

  return {
    executive_summary: `Proposal from ${startup.name || 'Startup'} addresses "${challenge.title || 'the Challenge'}" with focus on ${startup.technologies?.join(', ') || 'stated technologies'}. ${summary}`,
    technical_approach: techApproach,
    expected_impact: expectedImpact,
    technology_readiness: `The submitted proposal describes ${startup.technologies?.join(', ') || 'stated'} technologies. Available information is insufficient to independently assess technology maturity.`,
    risks,
    estimated_cost: cost,
    implementation_timeline: timeline,
    missing_information: missingInfo,
    questions_for_evaluator: questionsForEvaluator,
    ai_metadata: {
      model: 'SetuGov-Proposal-Copilot-Mock',
      mode: 'mock',
      notice: 'AI proposal analysis is an advisory input for evaluators. Final procurement decision must be made by authorized officials.'
    }
  };
};

/**
 * Loads an Application and its Challenge and Startup from DB,
 * checks authorization, maps data to Brain 3 request, and returns AI proposal analysis.
 * NOTE: Application status and records are NEVER modified by this method.
 */
export const analyzeApplicationProposal = async (applicationId, user) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      challenge: {
        include: { department: true }
      },
      startup: {
        include: {
          documents: true
        }
      }
    }
  });

  if (!application) {
    throw new NotFoundError(`Application with ID ${applicationId} not found.`);
  }

  // Authorization check
  if (user) {
    if (user.role === 'ADMIN' || user.role === 'EVALUATOR') {
      // Allowed
    } else if (user.role === 'GOVERNMENT') {
      if (!user.department_id || application.challenge.department_id !== user.department_id) {
        throw new ForbiddenError('You can only analyze applications for challenges belonging to your assigned department.');
      }
    } else {
      throw new ForbiddenError('You are not authorized to access AI proposal analysis.');
    }
  }

  // Map to Brain 3 request payload
  const verifiedDocs = (application.startup.documents || []).filter(d => d.verification_status === 'VERIFIED');
  const allDocs = (application.startup.documents || []).map(d => d.document_type);

  const payload = {
    challenge: {
      title: application.challenge.title,
      description: application.challenge.problem_description,
      domain: application.challenge.department?.name || application.startup.domain || null,
      technology_categories: application.challenge.required_technologies || [],
      location: application.challenge.location || null,
      kpis: application.challenge.desired_outcome || application.challenge.current_baseline ? [
        {
          name: 'Target Outcome',
          description: application.challenge.desired_outcome || application.challenge.current_baseline,
          unit: null,
          baseline: null,
          target: null,
          direction: null,
          measurement_method: null,
          weight: null
        }
      ] : []
    },
    startup: {
      name: application.startup.company_name,
      description: application.startup.description,
      technologies: application.startup.technologies || [],
      domain: application.startup.domain || null,
      experience: `${application.startup.years_experience || 0} years in domain`,
      deployments: application.startup.previous_deployments > 0
        ? [`${application.startup.previous_deployments} verified deployments`]
        : [],
      certifications: verifiedDocs.map(d => d.document_type),
      team_size: null,
      location: application.startup.location || null
    },
    proposal: {
      summary: application.proposal,
      technical_approach: application.technical_approach,
      implementation_timeline: application.timeline,
      estimated_cost: application.estimated_cost != null ? String(application.estimated_cost) : null,
      expected_impact: application.expected_impact,
      team_composition: null,
      past_experience: `${application.startup.years_experience || 0} years experience; ${application.startup.previous_deployments || 0} previous deployments`
    },
    eligibility: {
      dpiit_registered: (application.startup.documents || []).some(d => d.document_type === 'DPIIT_RECOGNITION' && d.verification_status === 'VERIFIED'),
      incorporation_date: null,
      annual_turnover: null,
      certifications: verifiedDocs.map(d => d.document_type),
      additional_documents: allDocs
    },
    available_documents: allDocs
  };

  try {
    const analysis = await analyzeProposal(payload);
    return analysis;
  } catch (err) {
    logger.warn(`AI proposal analysis failure: ${err.message}. Returning fallback analysis response.`);
    return {
      executive_summary: "AI proposal analysis is currently unavailable.",
      technical_approach: null,
      expected_impact: null,
      technology_readiness: null,
      risks: [],
      estimated_cost: null,
      implementation_timeline: null,
      missing_information: [
        "AI analysis service unavailable."
      ],
      questions_for_evaluator: [],
      ai_metadata: {
        model: "SetuGov-Proposal-Copilot-Fallback",
        mode: "fallback",
        notice: "AI analysis service is unavailable. Reviewers may continue evaluating proposals directly."
      }
    };
  }
};

/**
 * Brain 5 — Document Assistance & Governance Drafting
 *
 * Calls POST /ai/document on the Python AI service.
 * Input must match DocumentAssistanceRequest schema.
 * Returns DocumentAssistanceResponse fields for structured document drafting.
 */
export const generateDocumentDraft = async (input) => {
  const docType = input.document_type || 'PILOT_AGREEMENT_DRAFT';
  const challengeTitle = input.challenge_title || 'Government Innovation Pilot';
  const challengeDescription = input.challenge_description || 'Innovation procurement pilot program.';
  const startupName = input.startup_name || 'Selected Startup Partner';
  const pilotDuration = input.pilot_duration || null;
  const pilotSites = Array.isArray(input.pilot_sites) && input.pilot_sites.length > 0 ? input.pilot_sites : null;
  const pilotBudget = input.pilot_budget || null;
  const kpis = Array.isArray(input.kpis) ? input.kpis : [];
  const objectives = Array.isArray(input.objectives) ? input.objectives : [];
  const additionalContext = input.additional_context || null;

  try {
    const externalResult = await callExternalAiService('/ai/document', input);
    if (externalResult && externalResult.success && externalResult.data) {
      return {
        ...externalResult.data,
        ai_metadata: { mode: 'live' }
      };
    }
  } catch (err) {
    logger.warn(`Brain 5 document assistance live call failed: ${err.message}. Using deterministic fallback drafting.`);
  }

  // Deterministic mock generation matching Python service specifications
  const reviewLabel = "AI-generated draft — requires authorized review.";
  let title = '';
  let content = '';
  let sections = [];
  const missingInfo = [];

  if (docType === 'PILOT_AGREEMENT_DRAFT') {
    title = `Pilot Agreement Draft — ${startupName} / ${challengeTitle}`;
    sections = [
      "1. Pilot Scope",
      "2. Objectives",
      "3. Duration & Timeline",
      "4. Pilot Sites",
      "5. Government & Startup Responsibilities",
      "6. Milestones & Deliverables",
      "7. Key Performance Indicators & Target Outcomes",
      "8. Budget & Payment Terms",
      "9. Data Governance & Handling",
      "10. Intellectual Property Considerations",
      "11. Cybersecurity Responsibilities",
      "12. Risk Management",
      "13. Termination Conditions",
      "14. Extension Conditions",
      "15. Review & Authorized Signatories"
    ];

    const kpiSummary = kpis.length > 0
      ? kpis.map(k => `- ${k.name}: baseline ${k.baseline ?? 'N/A'} ${k.unit || ''}, target ${k.target ?? 'N/A'} ${k.unit || ''} (${k.direction || 'optimize'})`).join('\n')
      : '[SPECIFIC KPIS NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]';

    const objSummary = objectives.length > 0
      ? objectives.map(o => `- ${o}`).join('\n')
      : '- Deploy and validate innovation technology in live operational environment.';

    content = [
      `# ${title}`,
      `> **Disclaimer**: ${reviewLabel}`,
      '',
      '## 1. Pilot Scope',
      `This non-binding pilot agreement draft outlines the operational scope for deploying technology solutions addressing "${challengeTitle}". The pilot will be executed by ${startupName} in designated administrative jurisdictions.`,
      '',
      '## 2. Objectives',
      objSummary,
      '',
      '## 3. Duration & Timeline',
      `The scheduled pilot duration is ${pilotDuration || '[DURATION NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]'}. Detailed sprint schedules are subject to department confirmation.`,
      '',
      '## 4. Pilot Sites',
      pilotSites ? `Designated deployment sites: ${pilotSites.join(', ')}.` : '[PILOT SITES NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]',
      '',
      '## 5. Government & Startup Responsibilities',
      `The host department shall provide designated test facilities and baseline operational telemetry access. ${startupName} shall deploy hardware/software assets and deliver regular progress reporting.`,
      '',
      '## 6. Milestones & Deliverables',
      'Phase 1: Initial deployment & telemetry setup.\nPhase 2: Operational testing & mid-term review.\nPhase 3: Validation report submission & final review.',
      '',
      '## 7. Key Performance Indicators & Target Outcomes',
      kpiSummary,
      '',
      '## 8. Budget & Payment Terms',
      `The estimated pilot budget is ${pilotBudget || '[BUDGET NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]'}.\n[PAYMENT SCHEDULE NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]`,
      '',
      '## 9. Data Governance & Handling',
      '[DATA GOVERNANCE PROTOCOL — SUBJECT TO AUTHORIZED REVIEW]',
      '',
      '## 10. Intellectual Property Considerations',
      '[IP OWNERSHIP TERMS NOT SPECIFIED — SUBJECT TO AUTHORIZED LEGAL REVIEW]',
      '',
      '## 11. Cybersecurity Responsibilities',
      '[CYBERSECURITY STANDARDS NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]',
      '',
      '## 12. Risk Management',
      'Both parties shall maintain an active risk log and meet bi-weekly to review operational stability.',
      '',
      '## 13. Termination Conditions',
      '[TERMINATION CONDITIONS NOT SPECIFIED — SUBJECT TO AUTHORIZED REVIEW]',
      '',
      '## 14. Extension Conditions',
      '[EXTENSION CONDITIONS NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]',
      '',
      '## 15. Review & Authorized Signatories',
      '[AUTHORIZED SIGNATORIES AND OFFICIAL ENTITY ADDRESSES NOT PROVIDED — REQUIRES AUTHORIZED REVIEW]'
    ].join('\n');

    if (!pilotBudget) missingInfo.push('Pilot budget not provided — requires authorized review.');
    if (!pilotDuration) missingInfo.push('Pilot duration not provided — requires authorized review.');
    if (!pilotSites) missingInfo.push('Pilot sites not specified — requires authorized review.');
    missingInfo.push('Payment installment schedule not specified — requires authorized review.');
    missingInfo.push('IP ownership and licensing terms not specified — requires authorized legal review.');
    missingInfo.push('Authorized signatories not specified — requires authorized review.');

  } else if (docType === 'CHALLENGE_STATEMENT') {
    title = `Innovation Challenge Statement — ${challengeTitle}`;
    sections = [
      "1. Problem Statement",
      "2. Operational Background",
      "3. Desired Outcomes",
      "4. Success Criteria & KPIs",
      "5. Pilot Deployment Scope",
      "6. Eligibility Guidelines",
      "7. Submission & Review Timeline"
    ];

    content = [
      `# ${title}`,
      `> **Disclaimer**: ${reviewLabel}`,
      '',
      '## 1. Problem Statement',
      challengeDescription,
      '',
      '## 2. Operational Background',
      additionalContext || 'Government operational department requires technology-driven innovation to improve public service efficiency.',
      '',
      '## 3. Desired Outcomes',
      objectives.length > 0 ? objectives.map(o => `- ${o}`).join('\n') : '- Achieve measurable operational improvements over current baseline.',
      '',
      '## 4. Success Criteria & KPIs',
      kpis.length > 0 ? kpis.map(k => `- ${k.name}: Target ${k.target ?? 'TBD'} ${k.unit || ''}`).join('\n') : '[KPIS NOT SPECIFIED — REQUIRES AUTHORIZED REVIEW]',
      '',
      '## 5. Pilot Deployment Scope',
      `Duration: ${pilotDuration || '[TBD]'}. Sites: ${pilotSites ? pilotSites.join(', ') : '[TBD]'}. Budget Range: ${pilotBudget || '[TBD]'}.`,
      '',
      '## 6. Eligibility Guidelines',
      'Open to DPIIT-recognized startups with verifiable solutions in relevant technological domains.',
      '',
      '## 7. Submission & Review Timeline',
      '[SUBMISSION DEADLINES AND EVALUATION SCHEDULE SUBJECT TO OFFICIAL NOTIFICATION]'
    ].join('\n');

    if (kpis.length === 0) missingInfo.push('Success criteria KPIs not specified — requires authorized review.');

  } else if (docType === 'EVALUATION_CRITERIA') {
    title = `Evaluation Criteria & Scoring Framework — ${challengeTitle}`;
    sections = [
      "1. Technical Feasibility (30%)",
      "2. Innovation & Impact (25%)",
      "3. Scalability & Deployment Readiness (20%)",
      "4. Cost & Commercial Realism (15%)",
      "5. Compliance & Security (10%)"
    ];

    content = [
      `# ${title}`,
      `> **Disclaimer**: ${reviewLabel}`,
      '',
      '## 1. Technical Feasibility (30%)',
      'Evaluation of the startup proposal architecture, technology maturity, and integration viability.',
      '',
      '## 2. Innovation & Impact (25%)',
      'Assessment of expected quantitative improvement over baseline operational metrics.',
      '',
      '## 3. Scalability & Deployment Readiness (20%)',
      'Review of past deployment track record, team capability, and statewide scale potential.',
      '',
      '## 4. Cost & Commercial Realism (15%)',
      `Evaluation of proposed deployment budget (${pilotBudget || 'within challenge envelope'}) and cost breakdown reasonableness.`,
      '',
      '## 5. Compliance & Security (10%)',
      'Verification of DPIIT status, statutory certifications, and data security posture.'
    ].join('\n');

  } else if (docType === 'GOVERNANCE_CHECKLIST') {
    title = `Pilot Governance & Compliance Checklist — ${challengeTitle}`;
    sections = [
      "1. Pre-Pilot Authorization",
      "2. Deployment Site Readiness",
      "3. Data Security & Privacy Compliance",
      "4. Milestones & Telemetry Verification",
      "5. Post-Pilot Assessment & Scale Readiness"
    ];

    content = [
      `# ${title}`,
      `> **Disclaimer**: ${reviewLabel}`,
      '',
      '## 1. Pre-Pilot Authorization',
      `- [ ] Department administrative sanction confirmed for budget ${pilotBudget || '[TBD]'}.\n- [ ] Designated nodal officer appointed.\n- [ ] Pilot agreement draft reviewed and approved.`,
      '',
      '## 2. Deployment Site Readiness',
      `- [ ] Physical/network infrastructure ready at sites: ${pilotSites ? pilotSites.join(', ') : '[TBD]'}.\n- [ ] Hardware installation clearances obtained.`,
      '',
      '## 3. Data Security & Privacy Compliance',
      '- [ ] Data classification and anonymization procedures documented.\n- [ ] Access control policies enforced for pilot telemetry.',
      '',
      '## 4. Milestones & Telemetry Verification',
      '- [ ] Automated telemetry measurement feeds established.\n- [ ] Bi-weekly risk register reviewed by departmental committee.',
      '',
      '## 5. Post-Pilot Assessment & Scale Readiness',
      '- [ ] Independent third-party validation report filed.\n- [ ] Scale decision committee convened for statewide procurement evaluation.'
    ].join('\n');

  } else {
    // PROCUREMENT_PATHWAY_SUMMARY
    title = `Procurement Pathway & Scaling Summary — ${challengeTitle}`;
    sections = [
      "1. Procurement Route & Authority",
      "2. Pilot Scale-Up Thresholds",
      "3. Financial & Commercial Model",
      "4. Risk & Compliance Requirements",
      "5. Transition to Statewide Procurement"
    ];

    content = [
      `# ${title}`,
      `> **Disclaimer**: ${reviewLabel}`,
      '',
      '## 1. Procurement Route & Authority',
      'Pilot executed under State Innovation Procurement Framework allowing direct pilot validation prior to scale tender.',
      '',
      '## 2. Pilot Scale-Up Thresholds',
      `Success requires meeting target thresholds for key indicators:\n${kpis.length > 0 ? kpis.map(k => `- ${k.name}: >= 90% target achievement`).join('\n') : '- Overall validation score >= 85%.'}`,
      '',
      '## 3. Financial & Commercial Model',
      `Pilot allocation: ${pilotBudget || '[TBD]'}. Scale budget allocation subject to state finance committee approval.`,
      '',
      '## 4. Risk & Compliance Requirements',
      'All pilot deliverables must comply with state cybersecurity guidelines and open API interoperability standards.',
      '',
      '## 5. Transition to Statewide Procurement',
      'Upon successful validation and SCALE decision, host department may initiate single-source or swiss-challenge commercial contracting.'
    ].join('\n');
  }

  return {
    document_type: docType,
    title,
    content,
    sections,
    missing_information: missingInfo,
    review_label: reviewLabel,
    ai_metadata: {
      model: 'SetuGov-Document-Assistant-Mock',
      mode: 'mock',
      notice: 'AI document draft is an advisory template. Official legal authorization and departmental review required.'
    }
  };
};

export default {
  generateChallenge,
  explainMatch,
  analyzeProposal,
  analyzeApplicationProposal,
  analyzePilot,
  analyzePilotById,
  generateDocumentDraft
};



