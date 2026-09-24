import { useState, useCallback } from "react";
import { analysisApi } from "@/api/analysisApi";
import type { AnalysisResult, ApiError } from "@/types/analysis";

export function useAnalysis() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const analyze = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const res = await analysisApi.analyzeImage(file);
      setResult(res);
      return res;
    } catch (err) {
      setError(err as ApiError);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, analyze, reset };
}
