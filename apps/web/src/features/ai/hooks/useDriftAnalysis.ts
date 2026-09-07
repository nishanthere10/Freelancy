'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  analyzeScopeDrift,
  listScopeDriftAnalyses,
  type DriftAnalysisRecord,
} from '@api/ai';

export const AI_DRIFT_QUERY_KEY = 'ai-drift';

/**
 * Mutation hook to detect scope drift against a confirmed scope
 */
export function useAnalyzeDrift(
  workspaceId: string
): UseMutationResult<
  DriftAnalysisRecord,
  Error,
  { scopeAnalysisId: string; changeRequestText: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scopeAnalysisId, changeRequestText }) =>
      analyzeScopeDrift(workspaceId, scopeAnalysisId, changeRequestText),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [AI_DRIFT_QUERY_KEY, workspaceId, variables.scopeAnalysisId],
      });
    },
  });
}

/**
 * Query hook to fetch drift analyses for a confirmed scope analysis
 */
export function useScopeDriftAnalyses(
  workspaceId: string,
  scopeAnalysisId: string
): UseQueryResult<DriftAnalysisRecord[], Error> {
  return useQuery({
    queryKey: [AI_DRIFT_QUERY_KEY, workspaceId, scopeAnalysisId],
    queryFn: () => listScopeDriftAnalyses(workspaceId, scopeAnalysisId),
    enabled: Boolean(workspaceId && scopeAnalysisId),
  });
}
