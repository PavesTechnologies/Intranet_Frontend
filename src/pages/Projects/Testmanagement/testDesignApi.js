
import { notifySessionExpired } from "../../../api/sessionExpiry";

const API_BASE = window.__APP_CONFIG__?.PMS_BASE_URL || "http://localhost:8080/api";
const TEST_API = `${API_BASE}/test-execution`;
const CYCLE_API = `${API_BASE}/test-cycles`;
const BUG_API = `${API_BASE}/bugs`;

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

// These endpoints are plain fetch(), so they get none of the axios
// interceptors. Without this the error body of a 401 was returned to callers
// as if it were the payload — grids rendered empty and the user was never
// told the session had ended.
const parse = async (res) => {
  if (res.status === 401 || res.status === 403) {
    notifySessionExpired();
    throw new Error("Session expired. Please login again.");
  }
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }
  if (res.status === 204) return null;
  return await res.json();
};

// ===================== TEST DESIGN APIs =====================
export const getScenariosByStory = async (storyId) => {
  const res = await fetch(`${API_BASE}/test-design/scenarios/test-stories/${storyId}`, {
    headers: getHeaders(),
  });
  return parse(res);
};

export const createScenario = async (payload) => {
  const res = await fetch(`${API_BASE}/test-design/scenarios`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return parse(res);
};

export const getCasesByScenario = async (scenarioId) => {
  const res = await fetch(`${API_BASE}/test-design/cases/scenario/${scenarioId}`, {
    headers: getHeaders(),
  });
  return parse(res);
};

export const getStepsByCase = async (caseId) => {
  const res = await fetch(`${API_BASE}/test-design/steps/case/${caseId}`, {
    headers: getHeaders(),
  });
  return parse(res);
};

// ===================== PHASE 2: CYCLE SETUP APIs =====================
export const createTestCycle = async (projectId, payload) => {
  const res = await fetch(`${CYCLE_API}/projects/${projectId}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return parse(res);
};

export const getTestCycles = async (projectId) => {
  const res = await fetch(`${CYCLE_API}/projects/${projectId}`, {
    headers: getHeaders(),
  });
  return parse(res);
};

export const deleteTestCycle = async (cycleId) => {
  const res = await fetch(`${CYCLE_API}/${cycleId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return parse(res);
};

// ===================== PHASE 2: RUN MANAGEMENT APIs =====================
export const createTestRun = async (cycleId, payload) => {
  const res = await fetch(`${CYCLE_API}/${cycleId}/runs`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return parse(res);
};

export const getTestRunsByCycle = async (cycleId) => {
  const res = await fetch(`${CYCLE_API}/${cycleId}/runs`, {
    headers: getHeaders(),
  });
  return parse(res);
};

export const assignCasesToRun = async (runId, caseIds) => {
  const res = await fetch(`${TEST_API}/runs/${runId}/assign-cases`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ testCaseIds: caseIds }),
  });
  return parse(res);
};

// ===================== PHASE 3: EXECUTION APIs =====================
export const getRunCases = async (runId) => {
  const res = await fetch(`${TEST_API}/runs/${runId}/cases`, {
    headers: getHeaders(),
  });
  return parse(res);
};

export const getRunCaseDetails = async (runCaseId) => {
  const res = await fetch(`${TEST_API}/run-cases/${runCaseId}`, {
    headers: getHeaders(),
  });
  return parse(res);
};

export const executeStep = async (runCaseId, stepId, payload) => {
  const res = await fetch(`${TEST_API}/run-cases/${runCaseId}/steps/${stepId}/execute`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return parse(res);
};

export const submitRunCaseResult = async (runCaseId, payload) => {
  const res = await fetch(`${TEST_API}/run-cases/${runCaseId}/result`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return parse(res);
};

// ===================== PHASE 4: BUG WORKFLOW APIs =====================
export const createBugFromTestCase = async (payload) => {
  const res = await fetch(`${BUG_API}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return parse(res);
};

export const updateBugStatus = async (bugId, status) => {
  const res = await fetch(`${BUG_API}/${bugId}/status`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ status }),
  });
  return parse(res);
};

export const getBugsByTestCase = async (testCaseId) => {
  const res = await fetch(`${BUG_API}?testCaseId=${testCaseId}`, {
    headers: getHeaders(),
  });
  return parse(res);
};

export const getBugsByDeveloper = async (projectId, developerId) => {
  const res = await fetch(`${BUG_API}/projects/${projectId}/developer/${developerId}`, {
    headers: getHeaders(),
  });
  return parse(res);
};

// ===================== PHASE 5: RETEST APIs =====================
export const cloneRunWithFailedCases = async (runId) => {
  const res = await fetch(`${TEST_API}/runs/${runId}/clone-next`, {
    method: "POST",
    headers: getHeaders(),
  });
  return parse(res);
};

export const getFailedCasesForRun = async (runId) => {
  const res = await fetch(`${TEST_API}/runs/${runId}/failed-cases`, {
    headers: getHeaders(),
  });
  return parse(res);
};

// ===================== PHASE 6: RUN COMPLETION APIs =====================
export const completeRun = async (runId) => {
  const res = await fetch(`${TEST_API}/runs/${runId}/complete`, {
    method: "POST",
    headers: getHeaders(),
  });
  return parse(res);
};

export const completeCycle = async (cycleId) => {
  const res = await fetch(`${CYCLE_API}/${cycleId}/complete`, {
    method: "POST",
    headers: getHeaders(),
  });
  return parse(res);
};

export const getRunStatus = async (runId) => {
  const res = await fetch(`${TEST_API}/runs/${runId}/status`, {
    headers: getHeaders(),
  });
  return parse(res);
};

export const getCycleStatus = async (cycleId) => {
  const res = await fetch(`${CYCLE_API}/${cycleId}/status`, {
    headers: getHeaders(),
  });
  return parse(res);
};
