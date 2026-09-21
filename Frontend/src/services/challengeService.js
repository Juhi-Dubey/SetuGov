import { apiRequest } from "./api.js";

export const getChallenges = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });
  const queryString = query.toString();
  return apiRequest(`/challenges${queryString ? `?${queryString}` : ""}`);
};

export const getChallengeById = async (id) => {
  return apiRequest(`/challenges/${id}`);
};

/**
 * Normalizes user form inputs or AI-assisted challenge objects
 * into the strict primitive types expected by Backend createChallengeSchema.
 */
export const normalizeChallengePayload = (raw = {}) => {
  const extractString = (val, fallback = "") => {
    if (typeof val === "string") return val.trim();
    if (val && typeof val === "object") {
      return (
        val.statement ||
        val.value ||
        val.name ||
        val.title ||
        val.description ||
        val.problem_summary ||
        fallback ||
        ""
      )
        .toString()
        .trim();
    }
    return fallback;
  };

  const parseSafeDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const title = extractString(raw.title, "");
  const problem_description = extractString(
    raw.problemDescription || raw.problem_description,
    ""
  );
  const current_process = extractString(
    raw.currentProcess || raw.current_process,
    ""
  );
  const current_baseline = extractString(
    raw.currentBaseline || raw.current_baseline,
    ""
  );
  const desired_outcome = extractString(
    raw.desiredOutcome || raw.desired_outcome,
    ""
  );
  const location = extractString(raw.location, "");
  const pilot_location = extractString(
    raw.pilotLocation || raw.pilot_location || raw.location,
    ""
  );
  const startup_requirements = extractString(
    raw.startup || raw.startupRequirements || raw.startup_requirements,
    ""
  );
  const cybersecurity_requirements = extractString(
    raw.cybersecurityDocumentation || raw.cybersecurity_requirements || raw.cybersecurityRequirements,
    ""
  );
  const data_compliance = extractString(
    raw.dataCompliance || raw.data_compliance,
    ""
  );

  // Numeric budgets - safely parse and strip currency symbols, commas, and handle 0-overrides
  const parseCleanNumber = (val) => {
    if (val === undefined || val === null || val === "") return undefined;
    if (typeof val === "number") return isNaN(val) ? undefined : val;
    const cleaned = String(val).replace(/[^0-9.]/g, "");
    if (!cleaned) return undefined;
    const num = Number(cleaned);
    return isNaN(num) ? undefined : num;
  };

  const parsedBudget = parseCleanNumber(raw.budget);
  let budget_max = parseCleanNumber(raw.budgetMax ?? raw.budget_max);
  let budget_min = parseCleanNumber(raw.budgetMin ?? raw.budget_min);

  // If budget_max is non-positive or undefined, fallback to parsed general budget
  if ((budget_max === undefined || budget_max <= 0) && parsedBudget !== undefined && parsedBudget > 0) {
    budget_max = parsedBudget;
  }
  // Ensure budget_min defaults to 0 if budget_max is present to satisfy backend schema
  if (budget_min === undefined && budget_max !== undefined) {
    budget_min = 0;
  }

  // Integer positive pilot duration
  let pilot_duration_days = undefined;
  const rawDuration = raw.pilotDurationDays ?? raw.pilot_duration_days;
  if (rawDuration !== undefined && rawDuration !== null && rawDuration !== "") {
    const parsedDays = parseInt(rawDuration, 10);
    if (!isNaN(parsedDays) && parsedDays > 0) pilot_duration_days = parsedDays;
  }
  if (!pilot_duration_days) {
    const sDate = raw.pilotStartDate || raw.pilot_start_date;
    const eDate = raw.pilotEndDate || raw.pilot_end_date;
    if (sDate && eDate) {
      const diffMs = new Date(eDate).getTime() - new Date(sDate).getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0) pilot_duration_days = diffDays;
    }
  }

  // Required technologies: strictly array of strings from user/copilot input
  const techSource =
    raw.requiredTechnologies ||
    raw.required_technologies ||
    raw.technologies ||
    [];
  let required_technologies = [];
  if (Array.isArray(techSource)) {
    required_technologies = techSource
      .map((t) => {
        if (typeof t === "string") return t.trim();
        if (t && typeof t === "object") {
          return (
            t.name ||
            t.label ||
            t.value ||
            t.technology ||
            ""
          )
            .toString()
            .trim();
        }
        return "";
      })
      .filter((t) => t.length > 0);
  }

  const payload = {
    title,
    problem_description,
    current_baseline,
    desired_outcome,
    location,
    required_technologies,
  };

  if (budget_min !== undefined) payload.budget_min = budget_min;
  if (budget_max !== undefined) payload.budget_max = budget_max;
  if (pilot_duration_days !== undefined) payload.pilot_duration_days = pilot_duration_days;
  if (current_process) payload.current_process = current_process;
  if (pilot_location) payload.pilot_location = pilot_location;
  if (startup_requirements) payload.startup_requirements = startup_requirements;
  if (cybersecurity_requirements) payload.cybersecurity_requirements = cybersecurity_requirements;
  if (data_compliance) payload.data_compliance = data_compliance;

  const appDeadline = parseSafeDate(raw.application_deadline || raw.applicationDeadline || raw.deadline);
  if (appDeadline) payload.application_deadline = appDeadline;

  const pilotStart = parseSafeDate(raw.pilotStartDate || raw.pilot_start_date);
  if (pilotStart) payload.pilot_start_date = pilotStart;

  const pilotEnd = parseSafeDate(raw.pilotEndDate || raw.pilot_end_date);
  if (pilotEnd) payload.pilot_end_date = pilotEnd;

  // KPIs
  if (Array.isArray(raw.kpis) && raw.kpis.length > 0) {
    payload.kpis = raw.kpis;
  }

  // Milestones
  if (Array.isArray(raw.milestones) && raw.milestones.length > 0) {
    payload.milestones = raw.milestones;
  }

  // Eligibility Requirements
  const eligSource = raw.eligibilityRequirements || raw.eligibility_requirements;
  if (Array.isArray(eligSource) && eligSource.length > 0) {
    payload.eligibility_requirements = eligSource;
  }

  // Required Documents
  const docSource = raw.requiredDocuments || raw.required_documents;
  if (Array.isArray(docSource) && docSource.length > 0) {
    payload.required_documents = docSource;
  }

  const isUUID = (str) =>
    typeof str === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  if (isUUID(raw.department_id)) {
    payload.department_id = raw.department_id;
  }

  return payload;
};

export const createChallenge = async (challengeData) => {
  const normalized = normalizeChallengePayload(challengeData);
  return apiRequest("/challenges", {
    method: "POST",
    body: JSON.stringify(normalized),
  });
};

export const updateChallenge = async (id, challengeData) => {
  const normalized = normalizeChallengePayload(challengeData);
  return apiRequest(`/challenges/${id}`, {
    method: "PATCH",
    body: JSON.stringify(normalized),
  });
};

export const deleteChallenge = async (id) => {
  return apiRequest(`/challenges/${id}`, {
    method: "DELETE",
  });
};

export const publishChallenge = async (id) => {
  return apiRequest(`/challenges/${id}/publish`, {
    method: "POST",
  });
};

export const closeChallenge = async (id) => {
  return apiRequest(`/challenges/${id}/close`, {
    method: "POST",
  });
};

export const startChallengeEvaluation = async (id) => {
  return apiRequest(`/challenges/${id}/start-evaluation`, {
    method: "POST",
  });
};

export const getChallengeApplications = async (challengeId) => {
  return apiRequest(`/challenges/${challengeId}/applications`);
};

export const runChallengeMatching = async (challengeId) => {
  return apiRequest(`/challenges/${challengeId}/match`, {
    method: "POST",
  });
};

export const getChallengeMatches = async (challengeId, refresh = false) => {
  return apiRequest(`/challenges/${challengeId}/matches${refresh ? '?refresh=true' : ''}`);
};

export const shortlistStartup = async (challengeId, startupId, notes = '') => {
  return apiRequest(`/challenges/${challengeId}/shortlist/${startupId}`, {
    method: 'POST',
    body: JSON.stringify({ notes })
  });
};

export const getSpecificMatch = async (challengeId, startupId) => {
  return apiRequest(`/challenges/${challengeId}/matches/${startupId}`);
};

export const getChallengeEvaluationSummary = async (challengeId) => {
  return apiRequest(`/challenges/${challengeId}/evaluation-summary`);
};

export const getChallengeDecisions = async (challengeId) => {
  return apiRequest(`/challenges/${challengeId}/decision-recommendations`);
};

export const getChallengePilot = async (challengeId) => {
  return apiRequest(`/challenges/${challengeId}/pilot`);
};

export const generateChallengeBrain1 = async (challengeId) => {
  return apiRequest(`/challenges/${challengeId}/brain1/generate`, {
    method: "POST"
  });
};

export const getChallengeEligibility = async (challengeId) => {
  return apiRequest(`/challenges/${challengeId}/eligibility`);
};

export const saveChallengeEligibility = async (challengeId, payload) => {
  return apiRequest(`/challenges/${challengeId}/eligibility`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const getGovernmentAnalytics = async (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });
  const queryString = query.toString();
  return apiRequest(`/departments/analytics${queryString ? `?${queryString}` : ""}`);
};

export const getGovernmentDashboard = async () => {
  return getGovernmentAnalytics().catch(() => getChallenges());
};

export default {
  getChallenges,
  getChallengeById,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  publishChallenge,
  closeChallenge,
  startChallengeEvaluation,
  shortlistStartup,
  getChallengeApplications,
  runChallengeMatching,
  getChallengeMatches,
  getSpecificMatch,
  getChallengeEvaluationSummary,
  getChallengeDecisions,
  getChallengePilot,
  generateChallengeBrain1,
  getChallengeEligibility,
  saveChallengeEligibility,
  getGovernmentAnalytics,
  getGovernmentDashboard,
};

