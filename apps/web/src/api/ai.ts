import { apiGet, apiPost } from './client';

export interface ScopeDeliverable {
  title: string;
  description: string;
  estimated_hours: number;
  complexity?: 'low' | 'medium' | 'high';
  skills_required?: string[];
}

export interface ScopeAnalysisResult {
  summary: string;
  deliverables: ScopeDeliverable[];
  timeline_weeks: number;
  risks_and_dependencies?: string[];
  recommended_tech_stack?: string[];
  confidence_score: number;
}

export interface ScopeAnalysisRecord {
  id: string;
  workspaceId: string;
  projectId: string | null;
  actorUserId: string;
  inputText: string;
  result: ScopeAnalysisResult;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Generate AI Scope Analysis draft from project brief
 */
export async function generateScopeAnalysis(
  workspaceId: string,
  inputText: string,
  projectId?: string
): Promise<ScopeAnalysisRecord> {
  return apiPost<ScopeAnalysisRecord>(`/workspaces/${workspaceId}/ai/scope`, {
    inputText,
    projectId,
  });
}

/**
 * Confirm an existing AI Scope Analysis draft
 */
export async function confirmScopeAnalysis(
  workspaceId: string,
  scopeId: string
): Promise<ScopeAnalysisRecord> {
  return apiPost<ScopeAnalysisRecord>(
    `/workspaces/${workspaceId}/ai/scope/${scopeId}/confirm`
  );
}

/**
 * Get a specific scope analysis by ID
 */
export async function getScopeAnalysis(
  workspaceId: string,
  scopeId: string
): Promise<ScopeAnalysisRecord> {
  return apiGet<ScopeAnalysisRecord>(
    `/workspaces/${workspaceId}/ai/scope/${scopeId}`
  );
}

/**
 * List all scope analyses for a workspace
 */
export async function listScopeAnalyses(
  workspaceId: string,
  params?: { projectId?: string; limit?: number; offset?: number }
): Promise<ScopeAnalysisRecord[]> {
  const query = new URLSearchParams();
  if (params?.projectId) query.set('projectId', params.projectId);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return apiGet<ScopeAnalysisRecord[]>(
    `/workspaces/${workspaceId}/ai/scope${queryString}`
  );
}

export interface AffectedDeliverable {
  title: string;
  impact_description: string;
  additional_hours: number;
}

export interface DriftAnalysisResult {
  summary: string;
  recommendation: 'accept' | 'decline' | 'negotiate';
  recommendation_rationale: string;
  affected_deliverables: AffectedDeliverable[];
  timeline_delta_days: number;
  budget_delta_percentage: number;
  new_deliverables_required: string[];
  confidence_score: number;
}

export interface DriftAnalysisRecord {
  id: string;
  workspaceId: string;
  scopeAnalysisId: string;
  actorUserId: string;
  changeRequestText: string;
  result: DriftAnalysisResult;
  createdAt: string;
  updatedAt: string;
}

/**
 * Detect scope drift from a client change request
 */
export async function analyzeScopeDrift(
  workspaceId: string,
  scopeAnalysisId: string,
  changeRequestText: string
): Promise<DriftAnalysisRecord> {
  return apiPost<DriftAnalysisRecord>(`/workspaces/${workspaceId}/ai/drift`, {
    scopeAnalysisId,
    changeRequestText,
  });
}

/**
 * List drift analyses for a specific confirmed scope analysis
 */
export async function listScopeDriftAnalyses(
  workspaceId: string,
  scopeAnalysisId: string
): Promise<DriftAnalysisRecord[]> {
  return apiGet<DriftAnalysisRecord[]>(
    `/workspaces/${workspaceId}/ai/scope/${scopeAnalysisId}/drift`
  );
}

