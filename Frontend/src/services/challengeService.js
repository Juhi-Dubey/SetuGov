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

  const title = extractString(raw.title, "Government Innovation Challenge");
  const problem_description = extractString(
    raw.problemDescription || raw.problem_description,
    "Operational challenge statement created through SetuGov platform."
  );
  const current_baseline = extractString(
    raw.currentBaseline || raw.current_baseline,
    "Manual departmental process baseline"
  );
  const desired_outcome = extractString(
    raw.desiredOutcome || raw.desired_outcome,
    "Digitized measurable operational target"
  );
  const location = extractString(raw.location, "Maharashtra");

  // Numeric budgets
  const budget_min = Math.max(
    0,
    Number(raw.budgetMin ?? raw.budget_min ?? 100000) || 100000
  );
  let budget_max = Number(raw.budgetMax ?? raw.budget_max ?? raw.budget ?? 2500000);
  if (isNaN(budget_max) || budget_max <= 0) {
    budget_max = 2500000;
  }
  if (budget_max < budget_min) {
    budget_max = budget_min * 2;
  }

  // Integer positive pilot duration
  let pilot_duration_days = parseInt(
    raw.pilotDurationDays ?? raw.pilot_duration_days ?? 60,
    10
  );
  if (isNaN(pilot_duration_days) || pilot_duration_days <= 0) {
    pilot_duration_days = 60;
  }

  // Required technologies: strictly array of strings (flatten from objects if needed)
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
  if (required_technologies.length === 0) {
    required_technologies = [
      "Artificial Intelligence & ML",
      "Cloud Computing",
    ];
  }

  const payload = {
    title: title.length >= 5 ? title : `${title} - Project`,
    problem_description:
      problem_description.length >= 20
        ? problem_description
        : `${problem_description} — Detailed operational problem statement.`,
    current_baseline:
      current_baseline.length >= 5
        ? current_baseline
        : `${current_baseline} baseline metrics`,
    desired_outcome:
      desired_outcome.length >= 5
        ? desired_outcome
        : `${desired_outcome} target outcome`,
    location: location.length >= 2 ? location : "Maharashtra",
    budget_min,
    budget_max,
    pilot_duration_days,
    required_technologies,
  };

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

export const getChallengeApplications = async (challengeId) => {
  return apiRequest(`/challenges/${challengeId}/applications`);
};

export const runChallengeMatching = async (challengeId) => {
  return apiRequest(`/challenges/${challengeId}/match`, {
    method: "POST",
  });
};

export const getChallengeMatches = async (challengeId) => {
  return apiRequest(`/challenges/${challengeId}/matches`);
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

export const getGovernmentDashboard = async () => {
  return getChallenges();
};

export default {
  getChallenges,
  getChallengeById,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  publishChallenge,
  closeChallenge,
  getChallengeApplications,
  runChallengeMatching,
  getChallengeMatches,
  getSpecificMatch,
  getChallengeEvaluationSummary,
  getChallengeDecisions,
  getChallengePilot,
  getGovernmentDashboard,
};
