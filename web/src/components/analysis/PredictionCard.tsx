import { Box, Card, CardContent, Tooltip, Typography } from "@mui/material";
import { HelpCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip as ChartTooltip } from "recharts";
import { severityColors } from "@/theme/theme";
import { SEVERITY_LABELS } from "@/types/analysis";
import type { AnalysisResult } from "@/types/analysis";
import { formatConfidence } from "@/utils/formatting";
import StatusChip from "@/components/common/StatusChip";

const STATUS_TEXT: Record<string, string> = {
  "No DR": "No apparent retinopathy detected by the model",
  Mild: "Mild retinopathy predicted",
  Moderate: "Moderate retinopathy predicted",
  Severe: "Severe retinopathy predicted",
  "Proliferative DR": "Proliferative retinopathy predicted",
};

export default function PredictionCard({ result }: { result: AnalysisResult }) {
  const chartData = SEVERITY_LABELS.map((label) => ({
    label,
    value: Number(((result.probabilities[label] ?? 0) * 100).toFixed(1)),
  }));

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
          AI Screening Result
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, my: 1 }}>
          <StatusChip label={result.prediction.label} size="medium" />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {STATUS_TEXT[result.prediction.label]}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Model confidence: <strong style={{ color: "#1B2430" }}>{formatConfidence(result.prediction.confidence)}</strong>
          </Typography>
          <Tooltip title="Model confidence represents the probability assigned by the classification model and does not indicate diagnostic certainty.">
            <HelpCircle size={14} color="#5B6472" aria-label="What does confidence mean?" />
          </Tooltip>
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
          Probability distribution
        </Typography>
        <Box sx={{ height: 200 }} role="img" aria-label={`Probability distribution: ${chartData.map((d) => `${d.label} ${d.value}%`).join(", ")}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={12} />
              <YAxis type="category" dataKey="label" width={100} fontSize={12} />
              <ChartTooltip formatter={(v: number) => [`${v}%`, "Probability"]} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.label} fill={severityColors[entry.label]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
