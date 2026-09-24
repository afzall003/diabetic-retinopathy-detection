import { apiClient, USE_MOCK_API } from "./client";
import { mockHistory } from "./mockData";
import type { AnalysisHistoryItem, SeverityLabel } from "@/types/analysis";
import type { BackendHistoryItem } from "@/types/api";

const mapLabel = (label: string): SeverityLabel =>
  (label === "Proliferative" ? "Proliferative DR" : label) as SeverityLabel;

function transformHistoryItem(item: BackendHistoryItem): AnalysisHistoryItem {
  return {
    analysisId: item.analysis_id,
    createdAt: item.created_at,
    prediction: { classId: item.class_id, label: mapLabel(item.prediction), confidence: item.confidence },
    modelVersion: item.model_version,
    status: item.status === "completed" ? "completed" : "failed",
  };
}

export const historyApi = {
  async getHistory(): Promise<AnalysisHistoryItem[]> {
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 200));
      return mockHistory;
    }
    const response = await apiClient.get<BackendHistoryItem[]>("/analyses");
    return response.data.map(transformHistoryItem);
  },
};
