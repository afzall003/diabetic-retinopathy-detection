import { apiClient, USE_MOCK_API } from "./client";
import { mockDashboardStats } from "./mockData";
import type { DashboardStatistics } from "@/types/analysis";
import type { BackendStats } from "@/types/api";

export const dashboardApi = {
  async getStatistics(): Promise<DashboardStatistics> {
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 200));
      return mockDashboardStats();
    }
    const response = await apiClient.get<BackendStats>("/analyses/stats");
    return {
      totalAnalyses: response.data.total_analyses,
      normalCases: response.data.normal_cases,
      referableCases: response.data.referable_cases,
      averageConfidence: response.data.average_confidence,
    };
  },
};
