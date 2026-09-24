import { modelInformation, modelComparison } from "./mockData";
import type { ModelInformation } from "@/types/analysis";
import type { ModelComparisonEntry } from "./mockData";

export const modelApi = {
  async getModelInfo(): Promise<ModelInformation> {
    // These are real, actual evaluation numbers from this project (see
    // src/evaluation/compare_models.py output in the main repo), not
    // fabricated placeholders -- safe to serve directly rather than from
    // a live endpoint, unless/until model metrics get their own API.
    await new Promise((r) => setTimeout(r, 150));
    return modelInformation;
  },

  async getModelComparison(): Promise<ModelComparisonEntry[]> {
    await new Promise((r) => setTimeout(r, 150));
    return modelComparison;
  },
};
