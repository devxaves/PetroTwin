import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type {
  WellSummary,
  ProductionRecord,
  CSSCycleRecord,
  DiagnosticReport,
  WellTwinState,
  JointRecommendationResponse,
  CSSScreeningResponse,
  CSSRecommendResponse,
  CSSScenarioRequest,
  CSSScenarioResponse,
  WhatIfRequest,
  WhatIfResponse,
  ParetoResponse,
  ApprovalCreateRequest,
  ApprovalResponse,
} from "./types";

// ==========================================
// Query Hooks
// ==========================================

export function useWells() {
  return useQuery({
    queryKey: ["wells"],
    queryFn: () => apiClient<WellSummary[]>("/wells"),
    staleTime: 10_000,
  });
}

export function useWellProduction(wellId: string, from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const q = params.toString() ? `?${params.toString()}` : "";

  return useQuery({
    queryKey: ["production", wellId, from, to],
    queryFn: () => apiClient<ProductionRecord[]>(`/wells/${wellId}/production${q}`),
    enabled: !!wellId,
    staleTime: 15_000,
  });
}

export function useWellCSSCycles(wellId: string) {
  return useQuery({
    queryKey: ["css-cycles", wellId],
    queryFn: () => apiClient<CSSCycleRecord[]>(`/wells/${wellId}/css-cycles`),
    enabled: !!wellId,
    staleTime: 30_000,
  });
}

export function useDiagnosticsLatest(wellId: string) {
  return useQuery({
    queryKey: ["diagnostics", "latest", wellId],
    queryFn: () => apiClient<DiagnosticReport>(`/wells/${wellId}/diagnostics/latest`),
    enabled: !!wellId,
    staleTime: 10_000,
  });
}

export function useWellTwinState(wellId: string) {
  return useQuery({
    queryKey: ["twin", "state", wellId],
    queryFn: () => apiClient<WellTwinState>(`/wells/${wellId}/twin/state`),
    enabled: !!wellId,
    staleTime: 10_000,
  });
}

export function useJointRecommendation(wellId: string) {
  return useQuery({
    queryKey: ["twin", "recommendation", wellId],
    queryFn: () => apiClient<JointRecommendationResponse>(`/wells/${wellId}/twin/recommendation`),
    enabled: !!wellId,
    staleTime: 15_000,
  });
}

export function useCSSScreening(wellId: string) {
  return useQuery({
    queryKey: ["css", "screening", wellId],
    queryFn: () => apiClient<CSSScreeningResponse>(`/wells/${wellId}/css/screening`),
    enabled: !!wellId,
    staleTime: 30_000,
  });
}

export function useCSSRecommend(wellId: string) {
  return useQuery({
    queryKey: ["css", "recommend", wellId],
    queryFn: () => apiClient<CSSRecommendResponse>(`/wells/${wellId}/css/recommend`),
    enabled: !!wellId,
    staleTime: 30_000,
  });
}

export function useParetoFront(wellId: string) {
  return useQuery({
    queryKey: ["whatif", "pareto", wellId],
    queryFn: () => apiClient<ParetoResponse>(`/wells/${wellId}/whatif/pareto`),
    enabled: !!wellId,
    staleTime: 60_000,
  });
}

export function useApprovals(wellId: string) {
  return useQuery({
    queryKey: ["approvals", wellId],
    queryFn: () => apiClient<ApprovalResponse[]>(`/wells/${wellId}/approvals`),
    enabled: !!wellId,
    staleTime: 5_000,
  });
}

// ==========================================
// Mutation Hooks
// ==========================================

export function useRunCSSScenario(wellId: string) {
  return useMutation({
    mutationFn: (body: CSSScenarioRequest) =>
      apiClient<CSSScenarioResponse>(`/wells/${wellId}/css/scenario`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

export function useSimulateWhatIf(wellId: string) {
  return useMutation({
    mutationFn: (body: WhatIfRequest) =>
      apiClient<WhatIfResponse>(`/wells/${wellId}/whatif`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

export function useRecordApproval(wellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ApprovalCreateRequest) =>
      apiClient<ApprovalResponse>(`/wells/${wellId}/approvals`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals", wellId] });
    },
  });
}
