import api from "./api";

// Auth
export const loginUser = (data: { email: string; password: string }) =>
  api.post("/auth/login", data).then((r) => r.data);

export const registerUser = (data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) => api.post("/auth/register", data).then((r) => r.data);

// Projects
export const getProjects = () => api.get("/projects").then((r) => r.data);

export const createProject = (data: { name: string; description?: string }) =>
  api.post("/projects", data).then((r) => r.data);

export const deleteProject = (id: string) =>
  api.delete(`/projects/${id}`).then((r) => r.data);

// Prompts
export const getPromptsByProject = (projectId: string) =>
  api.get(`/prompts/project/${projectId}`).then((r) => r.data);

export const getPrompt = (id: string) =>
  api.get(`/prompts/${id}`).then((r) => r.data);

export const createPrompt = (
  projectId: string,
  data: { name: string; template: string },
) => api.post(`/prompts/project/${projectId}`, data).then((r) => r.data);

export const deletePrompt = (id: string) =>
  api.delete(`/prompts/${id}`).then((r) => r.data);

// Versions
export const createVersion = (promptId: string, data: { template: string }) =>
  api.post(`/prompts/${promptId}/versions`, data).then((r) => r.data);

// Suites
export const getSuitesByPrompt = (promptId: string) =>
  api.get(`/suites/prompt/${promptId}`).then((r) => r.data);

export const createSuite = (promptId: string, data: { name: string }) =>
  api.post(`/suites/prompt/${promptId}`, data).then((r) => r.data);

export const deleteSuite = (suiteId: string) =>
  api.delete(`/suites/${suiteId}`).then((r) => r.data);

// Test Cases
export const createTestCase = (
  suiteId: string,
  data: { input: string; checkType: string; checkValue: string },
) => api.post(`/suites/${suiteId}/cases`, data).then((r) => r.data);

export const deleteTestCase = (suiteId: string, caseId: string) =>
  api.delete(`/suites/${suiteId}/cases/${caseId}`).then((r) => r.data);

// Evals
export const runEval = (data: {
  versionAId: string;
  versionBId: string;
  suiteId: string;
}) => api.post("/evals/run", data).then((r) => r.data);

export const getEvalComparisons = (promptId: string) =>
  api.get(`/evals/comparisons/${promptId}`).then((r) => r.data);

export const getEvalHistory = (promptId: string) =>
  api.get(`/evals/prompt/${promptId}`).then((r) => r.data);

export const getEvalRun = (runId: string) =>
  api.get(`/evals/run/${runId}`).then((r) => r.data);

// API Keys
export const getApiKeys = () => api.get("/api-keys").then((r) => r.data);

export const createApiKey = (data: { name: string }) =>
  api.post("/api-keys", data).then((r) => r.data);

export const revokeApiKey = (id: string) =>
  api.patch(`/api-keys/${id}/revoke`).then((r) => r.data);

export const deleteApiKey = (id: string) =>
  api.delete(`/api-keys/${id}`).then((r) => r.data);

// Users
export const getProfile = () => api.get("/users/profile").then((r) => r.data);

export const updateSettings = (data: {
  firstName?: string;
  lastName?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  preferredProvider?: string;
  openaiModel?: string;
  anthropicModel?: string;
}) => api.patch("/users/settings", data).then((r) => r.data);

export const updatePassword = (data: {
  currentPassword: string;
  newPassword: string;
}) => api.patch("/users/password", data).then((r) => r.data);

export const getEvalAnalytics = (promptId: string) =>
  api.get(`/evals/analytics/${promptId}`).then((r) => r.data);

export const getGlobalAnalytics = () =>
  api.get("/evals/analytics/global").then((r) => r.data);
