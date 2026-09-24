// Shape of the actual FastAPI backend's /predict response (see api/main.py)
export interface BackendPredictResponse {
  analysis_id: string;
  created_at: string;
  prediction: string;
  confidence: number;
  distribution: Record<string, number>;
  gradcam_image_base64: string | null;
}

// GET /analyses list item
export interface BackendHistoryItem {
  analysis_id: string;
  created_at: string;
  class_id: number;
  prediction: string;
  confidence: number;
  model_version: string;
  status: string;
}

// GET /analyses/{id}
export interface BackendAnalysisDetail extends BackendHistoryItem {
  distribution: Record<string, number>;
}

// GET /analyses/stats
export interface BackendStats {
  total_analyses: number;
  normal_cases: number;
  referable_cases: number;
  average_confidence: number;
}
