export type SeverityLabel = "No DR" | "Mild" | "Moderate" | "Severe" | "Proliferative DR";

export const SEVERITY_LABELS: SeverityLabel[] = [
  "No DR",
  "Mild",
  "Moderate",
  "Severe",
  "Proliferative DR",
];

export interface Prediction {
  classId: number;
  label: SeverityLabel;
  confidence: number; // 0-1
}

export type ProbabilityDistribution = Record<SeverityLabel, number>;

export interface AnalysisResult {
  analysisId: string;
  prediction: Prediction;
  probabilities: ProbabilityDistribution;
  imageUrl: string;
  gradcamUrl?: string;
  createdAt: string; // ISO date string
  processingTimeMs?: number;
  modelVersion: string;
}

export interface AnalysisHistoryItem {
  analysisId: string;
  createdAt: string;
  prediction: Prediction;
  modelVersion: string;
  status: "completed" | "failed";
}

export interface ModelInformation {
  name: string;
  architecture: string;
  inputSize: string;
  numClasses: number;
  trainingDataset: string;
  modelVersion: string;
  inferenceFramework: string;
  lastUpdated: string;
  metrics?: {
    accuracy: number;
    quadraticWeightedKappa: number;
    macroF1: number;
    parameters: number;
  };
}

export interface DashboardStatistics {
  totalAnalyses: number;
  normalCases: number;
  referableCases: number;
  averageConfidence: number; // 0-1
}

export interface ApiError {
  message: string;
  status?: number;
  detail?: string;
}
