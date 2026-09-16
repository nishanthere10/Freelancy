"use client";

import {
  type DriftAnalysisRecord,
  analyzeScopeDrift,
  listScopeDriftAnalyses,
} from "@api/ai";
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export const AI_DRIFT_QUERY_KEY = "ai-drift";

/**
 * Mutation hook to detect scope drift against a confirmed scope
 */
export function useAnalyzeDrift(
  workspaceId: string,
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
  scopeAnalysisId: string,
): UseQueryResult<DriftAnalysisRecord[], Error> {
  return useQuery({
    queryKey: [AI_DRIFT_QUERY_KEY, workspaceId, scopeAnalysisId],
    queryFn: () => listScopeDriftAnalyses(workspaceId, scopeAnalysisId),
    enabled: Boolean(workspaceId && scopeAnalysisId),
  });
}
