"use client";

import {
  type ConvertScopeResponse,
  type ConvertScopeToProjectData,
  type ScopeAnalysisRecord,
  type ScopeAnalysisResult,
  convertScopeToProject,
  refineScopeAnalysis,
  updateScopeAnalysisResult,
} from "@api/ai";
import {
  type UseMutationResult,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { AI_SCOPE_QUERY_KEY } from "./useScopeAnalysis";

/**
 * Mutation hook to refine an existing Scope Analysis using conversational instructions
 */
export function useRefineScope(
  workspaceId: string,
): UseMutationResult<
  ScopeAnalysisRecord,
  Error,
  { scopeId: string; revisionPrompt: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scopeId, revisionPrompt }) =>
      refineScopeAnalysis(workspaceId, scopeId, revisionPrompt),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [AI_SCOPE_QUERY_KEY, workspaceId],
      });
      queryClient.setQueryData(
        [AI_SCOPE_QUERY_KEY, workspaceId, data.id],
        data,
      );
    },
  });
}

/**
 * Mutation hook to manually update deliverables & scope result
 */
export function useUpdateScopeResult(
  workspaceId: string,
): UseMutationResult<
  ScopeAnalysisRecord,
  Error,
  { scopeId: string; result: ScopeAnalysisResult }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scopeId, result }) =>
      updateScopeAnalysisResult(workspaceId, scopeId, result),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [AI_SCOPE_QUERY_KEY, workspaceId],
      });
      queryClient.setQueryData(
        [AI_SCOPE_QUERY_KEY, workspaceId, data.id],
        data,
      );
    },
  });
}

/**
 * Mutation hook to convert confirmed scope into a live project & optional deposit invoice
 */
export function useConvertScope(
  workspaceId: string,
): UseMutationResult<
  ConvertScopeResponse,
  Error,
  { scopeId: string; projectData: ConvertScopeToProjectData }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scopeId, projectData }) =>
      convertScopeToProject(workspaceId, scopeId, projectData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [AI_SCOPE_QUERY_KEY, workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["projects", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["invoices", workspaceId],
      });
      if (data.scope) {
        queryClient.setQueryData(
          [AI_SCOPE_QUERY_KEY, workspaceId, data.scope.id],
          data.scope,
        );
      }
    },
  });
}
