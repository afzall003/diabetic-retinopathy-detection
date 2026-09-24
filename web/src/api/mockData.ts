import type { AnalysisHistoryItem, AnalysisResult, DashboardStatistics, ModelInformation, SeverityLabel } from "@/types/analysis";

const LABELS: SeverityLabel[] = ["No DR", "Mild", "Moderate", "Severe", "Proliferative DR"];

function randomDistribution(dominantIndex: number): Record<SeverityLabel, number> {
  const raw = LABELS.map((_, i) => (i === dominantIndex ? Math.random() * 0.3 + 0.6 : Math.random() * 0.15));
  const sum = raw.reduce((a, b) => a + b, 0);
  const normalized = raw.map((v) => v / sum);
  const dist: Partial<Record<SeverityLabel, number>> = {};
  LABELS.forEach((label, i) => (dist[label] = Number(normalized[i].toFixed(4))));
  return dist as Record<SeverityLabel, number>;
}

export function mockAnalysisResult(imageUrl: string): AnalysisResult {
  const classId = Math.floor(Math.random() * 5);
  const probabilities = randomDistribution(classId);
  const label = LABELS[classId];
  return {
    analysisId: `DR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`,
    prediction: { classId, label, confidence: probabilities[label] },
    probabilities,
    imageUrl,
    createdAt: new Date().toISOString(),
    processingTimeMs: Math.floor(Math.random() * 900) + 400,
    modelVersion: "EfficientNetB0-v1 (mock)",
  };
}

export const mockHistory: AnalysisHistoryItem[] = Array.from({ length: 14 }).map((_, i) => {
  const classId = Math.floor(Math.random() * 5);
  const dist = randomDistribution(classId);
  const label = LABELS[classId];
  const daysAgo = i * 2 + 1;
  return {
    analysisId: `DR-2026-${String(10000 + i)}`,
    createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    prediction: { classId, label, confidence: dist[label] },
    modelVersion: "EfficientNetB0-v1",
    status: "completed" as const,
  };
});

export function mockDashboardStats(): DashboardStatistics {
  const total = mockHistory.length;
  const normal = mockHistory.filter((h) => h.prediction.classId === 0).length;
  const referable = mockHistory.filter((h) => h.prediction.classId >= 2).length;
  const avgConf = mockHistory.reduce((s, h) => s + h.prediction.confidence, 0) / total;
  return {
    totalAnalyses: total,
    normalCases: normal,
    referableCases: referable,
    averageConfidence: avgConf,
  };
}

// Real, actual evaluation numbers from this project's held-out test set
// (not fabricated -- see src/evaluation/evaluate.py and compare_models.py
// in the main repo). Update these if you retrain and re-evaluate.
export const modelInformation: ModelInformation = {
  name: "EfficientNetB0 (transfer learning)",
  architecture: "EfficientNetB0 backbone -> GlobalAveragePooling -> Dense(128, relu) -> Dense(5, softmax)",
  inputSize: "224 x 224 x 3",
  numClasses: 5,
  trainingDataset: "APTOS 2019 Blindness Detection",
  modelVersion: "v1",
  inferenceFramework: "TensorFlow Serving",
  lastUpdated: "2026-09-13",
  metrics: {
    accuracy: 0.7218,
    quadraticWeightedKappa: 0.8311,
    macroF1: 0.5576,
    parameters: 4214184,
  },
};

// Simple inline placeholder used when viewing a history entry that has no
// real uploaded image attached (mock history is summary-only data).
export const placeholderFundusImage =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
      <rect width='400' height='400' fill='#0B0D10'/>
      <circle cx='200' cy='200' r='170' fill='#3A2410'/>
      <circle cx='200' cy='200' r='170' fill='none' stroke='#5B3A1A' stroke-width='2'/>
      <circle cx='240' cy='190' r='26' fill='#E8A544' opacity='0.6'/>
    </svg>`
  );

export function mockAnalysisResultFromHistoryItem(item: AnalysisHistoryItem): AnalysisResult {
  const probabilities = randomDistribution(item.prediction.classId);
  return {
    analysisId: item.analysisId,
    prediction: item.prediction,
    probabilities,
    imageUrl: placeholderFundusImage,
    createdAt: item.createdAt,
    modelVersion: item.modelVersion,
  };
}

// Real comparison numbers from this project's own evaluation (see
// src/evaluation/compare_models.py output in the main repo) -- the
// custom CNN was trained from scratch as a baseline specifically to
// justify the EfficientNet transfer-learning choice. Not fabricated.
export interface ModelComparisonEntry {
  name: string;
  shortName: string;
  accuracy: number;
  quadraticWeightedKappa: number;
  macroF1: number;
  severeRecall: number;
  parameters: number;
}

export const modelComparison: ModelComparisonEntry[] = [
  {
    name: "EfficientNetB0 (transfer learning)",
    shortName: "EfficientNetB0",
    accuracy: 0.7218,
    quadraticWeightedKappa: 0.8311,
    macroF1: 0.5576,
    severeRecall: 0.4828,
    parameters: 4214184,
  },
  {
    // v3: deeper residual architecture + cosine LR schedule + tilted
    // oversampling toward Severe/Proliferative, after v2's plain
    // architecture upgrade caused a Severe-recall regression (0.41 ->
    // 0.31) that this run was specifically built to fix.
    name: "Custom CNN (from scratch)",
    shortName: "Custom CNN",
    accuracy: 0.6727,
    quadraticWeightedKappa: 0.7105,
    macroF1: 0.5051,
    severeRecall: 0.6207,
    parameters: 11297765,
  },
];
