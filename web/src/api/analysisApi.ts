import { apiClient, USE_MOCK_API } from "./client";
import { mockAnalysisResult, mockAnalysisResultFromHistoryItem, mockHistory } from "./mockData";
import type { AnalysisHistoryItem, AnalysisResult, SeverityLabel } from "@/types/analysis";
import type { BackendAnalysisDetail, BackendPredictResponse } from "@/types/api";

const LABEL_TO_ID: Record<string, number> = {
  "No DR": 0,
  Mild: 1,
  Moderate: 2,
  Severe: 3,
  Proliferative: 4,
};

const mapLabel = (label: string): SeverityLabel =>
  (label === "Proliferative" ? "Proliferative DR" : label) as SeverityLabel;

function mapDistribution(raw: Record<string, number>): AnalysisResult["probabilities"] {
  const probabilities: Record<string, number> = {};
  Object.entries(raw).forEach(([key, value]) => {
    probabilities[key === "Proliferative" ? "Proliferative DR" : key] = value;
  });
  return probabilities as AnalysisResult["probabilities"];
}

// In-memory cache of results from this session, so navigating to
// /results/:analysisId after a fresh analysis shows the real result
// (including the actual uploaded image, which isn't persisted server-side)
// rather than re-fetching and losing the image.
const resultStore = new Map<string, AnalysisResult>();

// Transforms the actual FastAPI backend's response shape (api/main.py)
// into this app's internal AnalysisResult type. Isolated here so the rest
// of the UI never has to know or care what the backend literally returns.
function transformBackendResponse(data: BackendPredictResponse, imageUrl: string): AnalysisResult {
  return {
    analysisId: data.analysis_id,
    prediction: {
      classId: LABEL_TO_ID[data.prediction] ?? 0,
      label: mapLabel(data.prediction),
      confidence: data.confidence,
    },
    probabilities: mapDistribution(data.distribution),
    imageUrl,
    gradcamUrl: data.gradcam_image_base64 ? `data:image/png;base64,${data.gradcam_image_base64}` : undefined,
    createdAt: data.created_at,
    modelVersion: "EfficientNetB0-v1",
  };
}

function transformBackendDetail(data: BackendAnalysisDetail): AnalysisResult {
  return {
    analysisId: data.analysis_id,
    prediction: { classId: data.class_id, label: mapLabel(data.prediction), confidence: data.confidence },
    probabilities: mapDistribution(data.distribution),
    // The backend only persists the prediction record, not the original
    // image (kept deliberately lightweight -- see api/db.py). Revisiting
    // an old analysis via History therefore shows a placeholder, same as
    // mock mode's fallback for the same situation.
    imageUrl:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='400' height='400' fill='#0B0D10'/><circle cx='200' cy='200' r='170' fill='#3A2410'/></svg>"
      ),
    createdAt: data.created_at,
    modelVersion: data.model_version,
  };
}

export const analysisApi = {
  async analyzeImage(file: File): Promise<AnalysisResult> {
    const imageUrl = URL.createObjectURL(file);
    let result: AnalysisResult;

    if (USE_MOCK_API) {
      await new Promise((resolve) => setTimeout(resolve, 1400));
      result = mockAnalysisResult(imageUrl);

      // Mock mode has no real backend at all, so history has to be kept
      // in sync on the client. mockHistory is the same array reference
      // historyApi/dashboardApi read from.
      const historyItem: AnalysisHistoryItem = {
        analysisId: result.analysisId,
        createdAt: result.createdAt,
        prediction: result.prediction,
        modelVersion: result.modelVersion,
        status: "completed",
      };
      mockHistory.unshift(historyItem);
    } else {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiClient.post<BackendPredictResponse>("/predict", formData, {
        params: { include_gradcam: true },
        headers: { "Content-Type": "multipart/form-data" },
      });
      result = transformBackendResponse(response.data, imageUrl);
      // No client-side history sync needed here anymore -- the backend
      // persists every prediction to SQLite itself (see api/db.py),
      // so History/Dashboard just re-fetch from GET /analyses.
    }

    resultStore.set(result.analysisId, result);
    return result;
  },

  async getAnalysis(analysisId: string): Promise<AnalysisResult> {
    const cached = resultStore.get(analysisId);
    if (cached) return cached;

    if (USE_MOCK_API) {
      const historyItem = mockHistory.find((h) => h.analysisId === analysisId);
      if (historyItem) {
        const result = mockAnalysisResultFromHistoryItem(historyItem);
        resultStore.set(analysisId, result);
        return result;
      }
      throw { message: "The requested analysis could not be found.", status: 404 };
    }

    const response = await apiClient.get<BackendAnalysisDetail>(`/analyses/${analysisId}`);
    const result = transformBackendDetail(response.data);
    resultStore.set(analysisId, result);
    return result;
  },
};
