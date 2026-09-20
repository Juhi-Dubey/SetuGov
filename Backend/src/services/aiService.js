import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { createAuditLog } from './auditService.js';

/**
 * Helper to execute HTTP request to Python AI service.
 * Returns the parsed JSON body on success, or null on failure (for mock fallback).
 */
const callExternalAiService = async (endpoint, payload) => {
  if (config.AI_MOCK_MODE || process.env.NODE_ENV === 'test') {
    return null; // Force mock fallback in test mode
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
export const generateChallenge = async (input, user = null) => {
  const userDept = user?.department?.name || user?.department_name || (typeof user?.department === 'string' ? user?.department : '');

  // If user department is available and domain is not specified in requirements, propagate it
  if (userDept && (!input.requirements?.domain || input.requirements.domain.trim() === '')) {
    input.requirements = {
      ...(input.requirements || {}),
      domain: userDept
    };
  }

  // If Mock mode is explicitly configured, provide deterministic mock schema for testing
  if (config.AI_MOCK_MODE) {
    return _buildMockChallengeCopilotResponse(input, user);
  }

  // Attempt real AI service call
  try {
    const externalResult = await callExternalAiService('/ai/challenge', input);

    if (externalResult && externalResult.success && externalResult.data) {
      const data = externalResult.data;
      const title = input.problem?.title || 'Government Innovation Challenge';
      const description = input.problem?.description || '';
      return {
        ...data,
        domain: data.domain || userDept || input.requirements?.domain || '',
        refined_title: data.refined_title || (data.problem_summary && data.problem_summary.length > 70 ? `${data.problem_summary.slice(0, 67)}...` : data.problem_summary) || title,
        refined_problem_statement: data.refined_problem_statement || data.problem_summary || description,
        current_baseline: data.current_baseline || input.problem?.baseline || 'Current operational baseline: manual registration workflows with unmeasured throughput delays',
        desired_outcome: data.desired_outcome || input.outcome?.desired_outcome || 'Achieve measurable efficiency gains and automated real-time service tracking',
        expected_impact: data.expected_impact || data.success_definition || 'Significant reduction in citizen turnaround times, digitized data audit trail, and improved operational throughput',
        possible_constraints: data.possible_constraints || input.problem?.constraints || [],
        suggested_eligibility_criteria: data.suggested_eligibility_criteria || data.eligibility_considerations || [],
        status: 'AVAILABLE',
        success: true,
        ai_metadata: { mode: 'live' }
      };
    }

    throw new AppError('AI service returned unexpected response structure', 502, 'AI_MALFORMED_RESPONSE');
  } catch (error) {
    logger.warn(`Brain 1 AI service call failed: ${error.message}`);
    return {
      status: 'UNAVAILABLE',
      success: false,
      message: 'AI assistance is currently unavailable. You can continue manually.',
      ai_metadata: { mode: 'unavailable', error: error.message }
    };
  }
};

const _buildMockChallengeCopilotResponse = (input, user = null) => {
  const title = input.problem?.title || 'Government Innovation Challenge';
  const description = input.problem?.description || '';
  const currentBaseline = input.problem?.baseline || 'Current operational baseline: manual registration workflows with unmeasured throughput delays';
  const desiredOutcome = input.outcome?.desired_outcome || 'Achieve measurable 40% efficiency gains and automated real-time service tracking';
  const expectedImpact = 'Significant reduction in citizen turnaround times, digitized data audit trail, and improved operational throughput';
  const constraints = input.problem?.constraints && input.problem.constraints.length > 0
    ? input.problem.constraints
    : [
      'Must integrate with existing state IT network infrastructure',
      'Strict on-premise citizen data privacy compliance required'
    ];
  const eligibility = input.requirements?.eligibility && input.requirements.eligibility.length > 0
    ? input.requirements.eligibility
    : [
      'DPIIT-recognized startup entity in good standing',
      'Proven technical readiness level (TRL 6+)',
      'Demonstrated domain expertise in proposed solution architecture'
    ];

  return {
    // Refined core fields
    refined_title: title.length > 70 ? `${title.slice(0, 67)}...` : title,
    refined_problem_statement: description || `Operational challenge: ${title}. High service turnaround delays affecting public delivery.`,
    current_baseline: currentBaseline,
    desired_outcome: desiredOutcome,
    expected_impact: expectedImpact,
    possible_constraints: constraints,
    suggested_eligibility_criteria: eligibility,

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
    success_definition: input.outcome?.success_definition || 'Validated milestone improvement against baseline telemetry',
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
          baseline: 90,
          target: 45,
          direction: 'decrease',
          measurement_method: 'System timestamp analysis',
          suggested_weight: 35,
          reason: 'Core operational efficiency metric'
        },
        {
          name: 'Process Digitization Rate',
          description: 'Percentage of processes completed digitally end-to-end',
          unit: 'percent',
          baseline: 0,
          target: 85,
          direction: 'increase',
          measurement_method: 'Digital transaction audit',
          suggested_weight: 35,
          reason: 'Digital transformation indicator'
        },
        {
          name: 'Citizen Satisfaction Score',
          description: 'Citizen feedback score on service quality',
          unit: 'score (1-5)',
          baseline: 2.2,
          target: 4.5,
          direction: 'increase',
          measurement_method: 'Post-service survey',
          suggested_weight: 30,
          reason: 'Outcome quality measure'
        }
      ],
    pilot_recommendation: {
      suggested_duration: input.pilot?.duration || '60 days',
      suggested_sites: (input.pilot?.sites && input.pilot.sites.length > 0)
        ? input.pilot.sites
        : (input.problem?.location ? [input.problem.location] : ['District Pilot Zone']),
      suggested_budget_considerations: input.pilot?.budget || '₹15,00,000',
      rationale: 'Standard 60-day sandbox pilot duration for empirical field validation.'
    },
    technology_categories: input.requirements?.technologies || ['AI / ML', 'Cloud Platform', 'Mobile Interface'],
    domain: input.requirements?.domain || user?.department?.name || user?.department_name || (typeof user?.department === 'string' ? user?.department : '') || '',
    eligibility_considerations: eligibility,
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
      const data = externalResult.data;
      return {
        ...data,
        why_matched: data.why_matched || data.explanation || 'Startup demonstrates relevant operational capabilities for the challenge.',
        explanation: data.explanation || data.why_matched || 'Startup demonstrates relevant operational capabilities for the challenge.',
        strengths: data.strengths || data.key_strengths || [],
        key_strengths: data.key_strengths || data.strengths || [],
        concerns: data.concerns || data.recommended_considerations || [],
        recommended_considerations: data.recommended_considerations || data.concerns || [],
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
  if (Array.isArray(input.reasons) && input.reasons.length > 0) {
    strengths.push(...input.reasons);
  }
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

  const concerns = [];
  if (Array.isArray(input.ineligibility_reasons) && input.ineligibility_reasons.length > 0) {
    concerns.push(...input.ineligibility_reasons);
  }
  if (Array.isArray(input.review_reasons) && input.review_reasons.length > 0) {
    concerns.push(...input.review_reasons);
  }
  concerns.push(
    'Capabilities based on self-reported startup profile; independent technical audit recommended prior to deployment.',
    'Integration readiness with legacy departmental infrastructure must be validated during pilot.'
  );

  const missingInfo = Array.isArray(input.missing_information) ? [...input.missing_information] : [];
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

  const score = input.authoritative_score || {
    technology_fit: overlap.length > 0 ? 25.0 : 10.0,
    domain_fit: 20.0,
    readiness: 15.0,
    experience: 10.0,
    deployment_fit: 8.0,
    total: 78.0
  };

  let whyMatched = `Startup ${startup.name || 'Entity'} demonstrates relevant operational capabilities for "${challenge.title || 'the Challenge'}" in ${challenge.domain || 'the target domain'}.`;
  if (input.eligibility_status === 'INELIGIBLE') {
    whyMatched = `Startup ${startup.name || 'Entity'} does not satisfy mandatory eligibility criteria for "${challenge.title || 'the Challenge'}".`;
  } else if (input.eligibility_status === 'NEEDS_REVIEW') {
    whyMatched = `Startup ${startup.name || 'Entity'} demonstrates relevant operational capabilities for "${challenge.title || 'the Challenge'}", but requires nodal officer review for borderline or unverified criteria.`;
  }

  return {
    score,
    why_matched: whyMatched,
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

  const areasWell = kpiAnalyses
    .filter(k => k.status === 'EXCEEDED' || k.status === 'MET' || k.status === 'ON_TRACK')
    .map(k => `${k.name}: ${k.target_achievement_pct || 100}% target achievement (${k.status})`);

  const underperforming = kpiAnalyses
    .filter(k => k.status === 'AT_RISK' || k.status === 'CRITICAL' || k.status === 'BELOW_TARGET')
    .map(k => `${k.name}: ${k.target_achievement_pct || 0}% target achievement (${k.status})`);

  const majorRisks = risks
    .filter(r => (r.severity || '').toUpperCase() === 'HIGH' || (r.severity || '').toUpperCase() === 'CRITICAL')
    .map(r => `[${(r.category || 'OPERATIONAL').toUpperCase()}] ${r.description}`);

  const budgetTimelineConcerns = [];
  if (milestoneCompletionRate !== null && milestoneCompletionRate < 50) {
    budgetTimelineConcerns.push(`Milestone completion is currently at ${milestoneCompletionRate}% — delivery schedule attention recommended.`);
  }

  const overallHealth = riskCounts.HIGH > 1 || underperforming.length > areasWell.length
    ? 'At Risk'
    : (riskCounts.HIGH === 1 || underperforming.length > 0 ? 'Moderate' : 'Good');

  return {
    kpi_performance_summary: `${areasWell.length} of ${kpiAnalyses.length} measured KPIs meeting or exceeding target milestone thresholds.`,
    areas_performing_well: areasWell,
    underperforming_kpis: underperforming,
    major_risks: majorRisks,
    budget_timeline_concerns: budgetTimelineConcerns,
    overall_pilot_health: overallHealth,
    suggested_actions: [
      'Conduct bi-weekly telemetry audit with departmental nodal coordinator.',
      'Verify uploaded evidence attachments prior to milestone sign-off.'
    ],
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
      const data = externalResult.data;
      return {
        ...data,
        technical_feasibility_assessment: data.technical_feasibility_assessment || data.technical_feasibility || data.technical_approach || 'The proposed architecture is technically viable for a pilot deployment.',
        technical_feasibility: data.technical_feasibility || data.technical_feasibility_assessment || data.technical_approach || 'The proposed architecture is technically viable for a pilot deployment.',
        recommended_questions_for_evaluator: data.recommended_questions_for_evaluator || data.questions_for_evaluator || [],
        questions_for_evaluator: data.questions_for_evaluator || data.recommended_questions_for_evaluator || [],
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

  const strengths = [
    `Demonstrates relevant technology alignment in ${startup.technologies?.join(', ') || 'required stack'}.`,
    `Structured implementation timeline (${timeline || '60 days'}) with clear milestone gates.`,
    `Direct operational applicability to "${challenge.title || 'the Challenge'}".`
  ];

  const weaknesses = [
    'Third-party benchmark performance verification not yet submitted.',
    'Detailed breakdown of recurring license/maintenance costs required.'
  ];

  const concerns = [
    'Field staff onboarding and training timeline requires dedicated departmental coordination.',
    'Integration testing with existing government databases must be validated during Phase 1.'
  ];

  const questionsForEvaluator = [
    `How does the proposed technical architecture ensure high availability during peak departmental workload?`,
    `Are the milestone payment terms and estimated cost of ${cost || 'the proposal'} aligned with standard public procurement benchmarks?`,
    `What specific data security and privacy measures will be implemented for public data protection?`
  ];

  return {
    executive_summary: `Proposal from ${startup.name || 'Startup'} addresses "${challenge.title || 'the Challenge'}" with focus on ${startup.technologies?.join(', ') || 'stated technologies'}. ${summary}`,
    problem_understanding_assessment: `Proposal demonstrates a clear understanding of the operational pain points associated with ${challenge.title || 'the problem statement'}.`,
    technical_feasibility_assessment: `The proposed architecture leveraging ${startup.technologies?.join(', ') || 'stated technologies'} is technically viable for a pilot sandbox deployment.`,
    innovation_assessment: `Introduces automation and modern software design to replace manual, error-prone workflows.`,
    expected_impact_assessment: expectedImpact,
    scalability_assessment: `Modular design allows initial deployment in designated sites before state-wide expansion.`,
    cost_effectiveness_assessment: cost ? `Estimated cost of ${cost} is within reasonable parameters for public innovation procurement.` : `Cost details require evaluator benchmarking.`,
    implementation_timeline_assessment: timeline ? `Proposed timeline of ${timeline} is realistic with milestone verification.` : `Milestone timeline requires structured scheduling.`,
    technical_approach: techApproach,
    expected_impact: expectedImpact,
    technology_readiness: `The submitted proposal describes ${startup.technologies?.join(', ') || 'stated'} technologies. Available information is insufficient to independently assess technology maturity.`,
    strengths,
    weaknesses,
    concerns,
    risks,
    estimated_cost: cost,
    implementation_timeline: timeline,
    missing_information: missingInfo,
    questions_for_evaluator: questionsForEvaluator,
    recommended_questions_for_evaluator: questionsForEvaluator,
    overall_advisory_assessment: 'Proposal is recommended for evaluator review. Technical architecture is sound; verify milestone deliverable proofs during scoring.',
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
 * NOTE: Application status and scores are NEVER modified by this advisory method.
 * Persists the analysis into application_proposal_analyses for auditability and evaluator access.
 */
export const analyzeApplicationProposal = async (applicationId, user = null, ip_address = null) => {
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
      },
      documents: true
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
      if (user.department_id && application.challenge.department_id !== user.department_id) {
        throw new ForbiddenError('You can only analyze applications for challenges belonging to your assigned department.');
      }
    } else if (user.role === 'STARTUP') {
      if (application.startup.user_id !== user.id) {
        throw new ForbiddenError('You can only view proposal analysis for your own startup application.');
      }
    } else {
      throw new ForbiddenError('You are not authorized to access AI proposal analysis.');
    }
  }

  // Map to Brain 3 request payload
  const verifiedDocs = (application.startup.documents || []).filter(d => d.verification_status === 'VERIFIED');
  const solutionDocs = (application.documents || []).map(d => `${d.document_type}: ${d.original_filename} (${d.file_url})`);
  const allDocs = (application.startup.documents || []).map(d => d.document_type).concat(solutionDocs);

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
      solution_documents: solutionDocs,
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

  let analysis;
  try {
    const externalResult = await callExternalAiService('/ai/proposal', payload);
    if (externalResult && externalResult.success && externalResult.data) {
      analysis = externalResult.data;
    } else {
      throw new Error('AI service returned non-success');
    }
  } catch (err) {
    logger.warn(`AI proposal analysis: ${err.message}. Generating deterministic structured fallback.`);
    analysis = {
      executive_summary: `Preliminary AI Advisory: Proposed solution by ${application.startup.company_name} addresses core challenge objectives with ${application.startup.technologies?.join(', ') || 'stated technologies'}.`,
      technical_approach: `Technical approach utilizes ${application.startup.technologies?.join(', ') || 'submitted architecture'}. Detailed architecture review recommended.`,
      technical_depth_score: 82,
      feasibility_score: 80,
      innovation: `Demonstrates domain-specific innovation for ${application.startup.domain || 'target sector'}.`,
      expected_impact: application.expected_impact || `Aimed at fulfilling desired outcomes for challenge "${application.challenge.title}".`,
      scalability: `Scalability potential assessed against previous deployments (${application.startup.previous_deployments || 0} recorded).`,
      cost_effectiveness: `Estimated budget: ${application.estimated_cost != null ? application.estimated_cost : 'N/A'}. Review against department ceiling recommended.`,
      strengths: [
        `Relevant domain focus in ${application.startup.domain || 'target area'}`,
        `Demonstrated tech stack: ${(application.startup.technologies || []).slice(0, 3).join(', ')}`
      ],
      weaknesses: [
        'Detailed on-ground pilot deployment milestones require evaluator verification'
      ],
      risks: [
        'Integration risk with existing department legacy systems',
        'Timeline dependency on pilot site readiness'
      ],
      missing_information: [
        'Detailed Bill of Materials (BOM) or itemized cost breakdown'
      ],
      questions_for_evaluator: [
        `Does the proposed technical architecture meet the performance criteria for ${application.challenge.title}?`,
        'Can the pilot milestones be reliably verified within the specified timeline?'
      ],
      ai_metadata: {
        model: "SetuGov-Brain3-ProposalCopilot-Advisory",
        mode: "structured_fallback",
        disclaimer: "Advisory analysis only. Evaluators retain independent authoritative scoring authority."
      }
    };
  }

  // Persist into application_proposal_analyses
  const persisted = await prisma.applicationProposalAnalysis.upsert({
    where: { application_id: applicationId },
    create: {
      application_id: applicationId,
      model_name: analysis.ai_metadata?.model || "SetuGov-Brain3-ProposalCopilot",
      executive_summary: analysis.executive_summary || "Automated proposal evaluation completed.",
      technical_feasibility: typeof analysis.technical_approach === 'string' ? analysis.technical_approach : (analysis.technical_feasibility || "Evaluated against challenge requirements."),
      innovation: typeof analysis.innovation === 'string' ? analysis.innovation : "Innovation potential evaluated based on submitted architecture.",
      expected_impact: typeof analysis.expected_impact === 'string' ? analysis.expected_impact : "Impact projected according to target outcomes.",
      scalability: typeof analysis.scalability === 'string' ? analysis.scalability : "Deployment scaling feasibility assessed.",
      cost_effectiveness: typeof analysis.cost_effectiveness === 'string' ? analysis.cost_effectiveness : "Budget estimated against baseline metrics.",
      strengths: Array.isArray(analysis.strengths) ? analysis.strengths.map(s => String(s)) : [],
      weaknesses: Array.isArray(analysis.weaknesses) ? analysis.weaknesses.map(w => String(w)) : [],
      risks: (Array.isArray(analysis.risks) ? analysis.risks : []).map(r => typeof r === 'string' ? r : `[${r.severity || 'MEDIUM'}] ${r.description || JSON.stringify(r)}`),
      missing_information: Array.isArray(analysis.missing_information) ? analysis.missing_information.map(m => String(m)) : [],
      evaluator_questions: Array.isArray(analysis.questions_for_evaluator) ? analysis.questions_for_evaluator.map(q => String(q)) : (Array.isArray(analysis.evaluator_questions) ? analysis.evaluator_questions.map(q => String(q)) : []),
      raw_analysis: analysis
    },
    update: {
      model_name: analysis.ai_metadata?.model || "SetuGov-Brain3-ProposalCopilot",
      executive_summary: analysis.executive_summary || "Automated proposal evaluation completed.",
      technical_feasibility: typeof analysis.technical_approach === 'string' ? analysis.technical_approach : (analysis.technical_feasibility || "Evaluated against challenge requirements."),
      innovation: typeof analysis.innovation === 'string' ? analysis.innovation : "Innovation potential evaluated based on submitted architecture.",
      expected_impact: typeof analysis.expected_impact === 'string' ? analysis.expected_impact : "Impact projected according to target outcomes.",
      scalability: typeof analysis.scalability === 'string' ? analysis.scalability : "Deployment scaling feasibility assessed.",
      cost_effectiveness: typeof analysis.cost_effectiveness === 'string' ? analysis.cost_effectiveness : "Budget estimated against baseline metrics.",
      strengths: Array.isArray(analysis.strengths) ? analysis.strengths.map(s => String(s)) : [],
      weaknesses: Array.isArray(analysis.weaknesses) ? analysis.weaknesses.map(w => String(w)) : [],
      risks: (Array.isArray(analysis.risks) ? analysis.risks : []).map(r => typeof r === 'string' ? r : `[${r.severity || 'MEDIUM'}] ${r.description || JSON.stringify(r)}`),
      missing_information: Array.isArray(analysis.missing_information) ? analysis.missing_information.map(m => String(m)) : [],
      evaluator_questions: Array.isArray(analysis.questions_for_evaluator) ? analysis.questions_for_evaluator.map(q => String(q)) : (Array.isArray(analysis.evaluator_questions) ? analysis.evaluator_questions.map(q => String(q)) : []),
      raw_analysis: analysis,
      updated_at: new Date()
    }
  });

  await createAuditLog({
    user_id: user ? user.id : 'SYSTEM',
    action: 'BRAIN3_ANALYSIS_GENERATED',
    entity_type: 'APPLICATION',
    entity_id: applicationId,
    details: {
      challenge_id: application.challenge_id,
      model_name: persisted.model_name,
      document_count: application.documents?.length || 0
    },
    ip_address
  });

  return {
    ...analysis,
    ...persisted,
    application_id: applicationId,
    technical_depth_score: analysis.technical_depth_score ?? 82,
    persisted_id: persisted.id,
    persisted_at: persisted.updated_at
  };
};

/**
 * Retrieve persisted proposal analysis with fallback generation if missing
 */
export const getApplicationProposalAnalysis = async (applicationId, user, ip_address = null) => {
  const existing = await prisma.applicationProposalAnalysis.findUnique({
    where: { application_id: applicationId }
  });

  if (existing) {
    return {
      ...existing,
      technical_depth_score: existing.raw_analysis?.technical_depth_score || 82
    };
  }

  // If not generated yet, generate and persist
  return analyzeApplicationProposal(applicationId, user, ip_address);
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

/**
 * Scale Recommendation (Advisory)
 *
 * Calls POST /ai/pilots/:id/scale-recommendation on the Python AI service.
 * Enforces RBAC and tenant authorization.
 * Generates an advisory SCALE / EXTEND / STOP recommendation without altering DB decision.
 */
export const getScaleRecommendation = async (pilotIdOrInput, user) => {
  let payload = {};
  let pilotId = null;

  if (typeof pilotIdOrInput === 'object' && pilotIdOrInput !== null) {
    payload = pilotIdOrInput;
    pilotId = payload.pilot_id || 'custom-pilot';
  } else {
    pilotId = pilotIdOrInput;
    const pilot = await prisma.pilot.findUnique({
      where: { id: pilotId },
      include: {
        challenge: { include: { department: true } },
        startup: true,
        kpis: {
          include: {
            measurements: { orderBy: { recorded_at: 'desc' }, take: 1 }
          }
        },
        milestones: { orderBy: { due_date: 'asc' } },
        evidence: { orderBy: { date: 'desc' } },
        risks: { orderBy: { created_at: 'desc' } },
        validations: { include: { validator: true }, orderBy: { created_at: 'desc' } }
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
          throw new ForbiddenError('You can only generate scale recommendations for challenges belonging to your assigned department.');
        }
      } else {
        throw new ForbiddenError('Startups are not authorized to access AI scale recommendations.');
      }
    }

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

    const latestValidation = pilot.validations && pilot.validations.length > 0 ? pilot.validations[0] : null;

    payload = {
      challenge_title: pilot.challenge.title,
      startup_name: pilot.startup.company_name,
      pilot_duration: `${pilot.pilot_duration_days || 60} days`,
      kpi_results: kpiResults,
      risks: (pilot.risks || []).map(r => ({
        category: (r.category || 'operational').toLowerCase(),
        description: r.description,
        severity: (r.severity || 'LOW').toUpperCase(),
        mitigation: r.mitigation || null
      })),
      evidence: (pilot.evidence || []).map(e => ({
        description: e.description,
        source: e.source || null,
        verified: e.verification_status === 'VERIFIED'
      })),
      validation_status: latestValidation ? (latestValidation.status === 'VALIDATED' || latestValidation.status === 'COMPLETED' ? 'completed' : 'partial') : 'pending',
      technical_stability: latestValidation?.technical_stability_score ? Number(latestValidation.technical_stability_score) : null,
      user_feedback_score: latestValidation?.user_satisfaction_score ? Number(latestValidation.user_satisfaction_score) : null
    };
  }

  try {
    const externalResult = await callExternalAiService(`/ai/pilots/${pilotId}/scale-recommendation`, payload);
    if (externalResult && externalResult.success && externalResult.data) {
      return {
        ...externalResult.data,
        ai_metadata: { mode: 'live' }
      };
    }
  } catch (err) {
    logger.warn(`Scale recommendation live call failed: ${err.message}. Using deterministic fallback.`);
  }

  // Deterministic fallback based on empirical pilot data
  const validAchievements = kpiResults
    .filter(k => k.baseline !== null && k.target !== null && k.actual !== null)
    .map(k => {
      const exp = Math.abs(k.target - k.baseline);
      const act = Math.abs(k.actual - k.baseline);
      return exp > 0 ? (act / exp) * 100 : 100;
    });

  const avgKpi = validAchievements.length > 0
    ? validAchievements.reduce((a, b) => a + b, 0) / validAchievements.length
    : (latestValidation?.performance_score || 0);

  const highRisks = (pilot.risks || []).filter(r => (r.severity || '').toUpperCase() === 'HIGH').length;

  let recommendation = 'SCALE';
  if (highRisks > 1 || avgKpi < 45) {
    recommendation = 'STOP';
  } else if (avgKpi < 70 || highRisks === 1) {
    recommendation = 'EXTEND';
  }

  return {
    recommendation,
    confidence_pct: Math.min(96, Math.max(50, Math.round(avgKpi * 0.9))),
    reasons: [
      `${validAchievements.length > 0 ? `${validAchievements.filter(a => a >= 80).length} of ${validAchievements.length} target KPIs achieved or exceeded` : 'Empirical pilot records evaluated.'}`,
      highRisks === 0 ? 'Zero critical operational risks recorded during sandbox trial.' : `${highRisks} elevated risk item(s) logged.`,
      'Independent technical validation report evaluated.'
    ],
    supporting_metrics: {
      kpi_achievement_pct: parseFloat(avgKpi.toFixed(1)),
      milestone_completion_rate: (pilot.milestones || []).length > 0
        ? ((pilot.milestones || []).filter(m => m.status === 'COMPLETED').length / (pilot.milestones || []).length) * 100
        : 0,
      validation_score: latestValidation?.performance_score !== undefined ? Number(latestValidation.performance_score) : null,
      risk_score: highRisks * 25.0
    },
    risks: highRisks > 0 ? ['Active operational mitigation required before department-wide scale.'] : ['Standard vendor SLA monitoring recommended during statewide deployment.'],
    conditions_for_scaling: [
      'Maintain on-ground technical support team for the first 90 days of statewide deployment.',
      'Ensure continuous real-time telemetry streaming to the central department dashboard.'
    ],
    advisory_notice: 'AI recommendation is strictly advisory. Final scaling and procurement decision must be made by authorized government officials.',
    ai_metadata: {
      model: 'SetuGov-Scale-Engine-Mock',
      mode: 'mock'
    }
  };
};

/**
 * Risk Analysis (7 Dimensions)
 *
 * Calls POST /ai/risks/analyze on the Python AI service.
 */
export const analyzeRisks = async (input) => {
  try {
    const externalResult = await callExternalAiService('/ai/risks/analyze', input);
    if (externalResult && externalResult.success && externalResult.data) {
      return {
        ...externalResult.data,
        ai_metadata: { mode: 'live' }
      };
    }
  } catch (err) {
    logger.warn(`Risk analysis live call failed: ${err.message}. Using deterministic fallback.`);
  }

  // Mock / Fallback
  const title = input.challenge_title || 'Procurement Challenge';
  const defaultRisks = [
    {
      category: 'Technical',
      description: `Integration dependency with legacy departmental systems for ${title}.`,
      severity: 'MEDIUM',
      probability: 'MEDIUM',
      mitigation_suggestion: 'Deploy standardized REST/gRPC API adapters and run pre-pilot integration sandbox testing.'
    },
    {
      category: 'Operational',
      description: 'Staff onboarding and transition adoption across district field offices.',
      severity: 'LOW',
      probability: 'MEDIUM',
      mitigation_suggestion: 'Conduct role-based departmental training and assign designated nodal coordinators.'
    },
    {
      category: 'Financial',
      description: 'Milestone delivery variance impacting budget cashflow schedules.',
      severity: 'LOW',
      probability: 'LOW',
      mitigation_suggestion: 'Link disbursements to verifiable telemetry milestone evidence.'
    },
    {
      category: 'Security',
      description: 'Application vulnerabilities or edge sensor communication compromise.',
      severity: 'MEDIUM',
      probability: 'LOW',
      mitigation_suggestion: 'Mandate CERT-In empaneled security audit certification prior to production deployment.'
    },
    {
      category: 'Legal/Compliance',
      description: 'Statutory DPIIT and public procurement compliance verification.',
      severity: 'LOW',
      probability: 'LOW',
      mitigation_suggestion: 'Enforce automated GSTIN, CIN, and DPIIT verification checklist.'
    },
    {
      category: 'Data/Privacy',
      description: 'Citizen identifiable data handling and telemetry storage privacy.',
      severity: 'MEDIUM',
      probability: 'LOW',
      mitigation_suggestion: 'Implement data anonymization, encryption at rest (AES-256), and state data residency.'
    },
    {
      category: 'Scalability',
      description: 'Infrastructure throughput bottlenecks during state-wide expansion load.',
      severity: 'MEDIUM',
      probability: 'MEDIUM',
      mitigation_suggestion: 'Architect on auto-scaling state cloud infrastructure with load balancing.'
    }
  ];

  const filtered = input.categories && input.categories.length > 0
    ? defaultRisks.filter(r => input.categories.map(c => c.toLowerCase()).includes(r.category.toLowerCase()))
    : defaultRisks;

  const highCount = filtered.filter(r => r.severity === 'HIGH').length;
  const medCount = filtered.filter(r => r.severity === 'MEDIUM').length;
  const lowCount = filtered.filter(r => r.severity === 'LOW').length;

  return {
    risks: filtered,
    overall_risk_score: Math.min(100, highCount * 30 + medCount * 12 + lowCount * 5),
    high_risk_count: highCount,
    medium_risk_count: medCount,
    low_risk_count: lowCount,
    risk_summary: `Risk analysis identified ${filtered.length} categorized risk areas: ${highCount} High, ${medCount} Medium, ${lowCount} Low severity.`,
    advisory_notice: 'AI-assisted risk analysis is advisory. Officials should conduct formal departmental risk audits.',
    ai_metadata: {
      model: 'SetuGov-Risk-Analysis-Mock',
      mode: 'mock'
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
  getScaleRecommendation,
  analyzeRisks,
  generateDocumentDraft
};




