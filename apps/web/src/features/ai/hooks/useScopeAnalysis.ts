'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  confirmScopeAnalysis,
  generateScopeAnalysis,
  getScopeAnalysis,
  listScopeAnalyses,
  type ScopeAnalysisRecord,
} from '@api/ai';

export const AI_SCOPE_QUERY_KEY = 'ai-scope';

/**
 * Mutation hook to generate an AI Scope Analysis draft from brief text
 */
export function useGenerateScope(
  workspaceId: string
): UseMutationResult<
  ScopeAnalysisRecord,
  Error,
  { inputText: string; projectId?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ inputText, projectId }) =>
      generateScopeAnalysis(workspaceId, inputText, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [AI_SCOPE_QUERY_KEY, workspaceId],
      });
    },
  });
}

/**
 * Mutation hook to confirm an existing Scope Analysis draft
 */
export function useConfirmScope(
  workspaceId: string
): UseMutationResult<ScopeAnalysisRecord, Error, { scopeId: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scopeId }) => confirmScopeAnalysis(workspaceId, scopeId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [AI_SCOPE_QUERY_KEY, workspaceId],
      });
      queryClient.setQueryData(
        [AI_SCOPE_QUERY_KEY, workspaceId, data.id],
        data
      );
    },
  });
}

/**
 * Query hook to fetch all scope analyses for a workspace
 */
export function useScopeAnalyses(
  workspaceId: string,
  params?: { projectId?: string; limit?: number; offset?: number }
): UseQueryResult<ScopeAnalysisRecord[], Error> {
  return useQuery({
    queryKey: [AI_SCOPE_QUERY_KEY, workspaceId, params],
    queryFn: () => listScopeAnalyses(workspaceId, params),
    enabled: Boolean(workspaceId),
  });
}

/**
 * Query hook to fetch a single scope analysis record by ID
 */
export function useScopeDetail(
  workspaceId: string,
  scopeId: string
): UseQueryResult<ScopeAnalysisRecord, Error> {
  return useQuery({
    queryKey: [AI_SCOPE_QUERY_KEY, workspaceId, scopeId],
    queryFn: () => getScopeAnalysis(workspaceId, scopeId),
    enabled: Boolean(workspaceId && scopeId),
  });
}
