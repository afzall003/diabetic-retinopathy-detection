import { useEffect, useState } from "react";
import { Box, Card, CardContent, Container, Grid, Typography } from "@mui/material";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { modelApi } from "@/api/modelApi";
import type { ModelComparisonEntry } from "@/api/mockData";
import type { ModelInformation } from "@/types/analysis";
import { LoadingState } from "@/components/common/StateViews";
import { formatDate } from "@/utils/formatting";

const PIPELINE_STEPS = [
  "Input Image",
  "Preprocessing",
  "CNN Feature Extraction",
  "Global Pooling",
  "Classification Layer",
  "5-Class DR Prediction",
];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", py: 1.2, borderBottom: "1px solid #E5E8EC" }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "right" }}>{value}</Typography>
    </Box>
  );
}

export default function Model() {
  const [info, setInfo] = useState<ModelInformation | null>(null);
  const [comparison, setComparison] = useState<ModelComparisonEntry[] | null>(null);

  useEffect(() => {
    modelApi.getModelInfo().then(setInfo);
    modelApi.getModelComparison().then(setComparison);
  }, []);

  if (!info) return <Container sx={{ py: 5 }}><LoadingState label="Loading model information..." /></Container>;

  const chartData = comparison?.map((m) => ({
    name: m.shortName,
    Accuracy: Number((m.accuracy * 100).toFixed(1)),
    "QWK (x100)": Number((m.quadraticWeightedKappa * 100).toFixed(1)),
    "Macro F1 (x100)": Number((m.macroF1 * 100).toFixed(1)),
    "Severe Recall (x100)": Number((m.severeRecall * 100).toFixed(1)),
  }));

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Model Information</Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>Architecture, training, and evaluation details.</Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>{info.name}</Typography>
              <InfoRow label="Architecture" value={info.architecture} />
              <InfoRow label="Input image size" value={info.inputSize} />
              <InfoRow label="Number of classes" value={String(info.numClasses)} />
              <InfoRow label="Training dataset" value={info.trainingDataset} />
              <InfoRow label="Model version" value={info.modelVersion} />
              <InfoRow label="Inference framework" value={info.inferenceFramework} />
              <InfoRow label="Last updated" value={formatDate(info.lastUpdated)} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Architecture overview</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {PIPELINE_STEPS.map((step, i) => (
                  <Box key={step}>
                    <Box sx={{ px: 2, py: 1, bgcolor: "#F7F8FA", borderRadius: 1.5, border: "1px solid #E5E8EC" }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{step}</Typography>
                    </Box>
                    {i < PIPELINE_STEPS.length - 1 && (
                      <Typography sx={{ textAlign: "center", color: "#5B6472", fontSize: 14, lineHeight: "20px" }}>&darr;</Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Evaluation metrics</Typography>
          {info.metrics ? (
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Accuracy</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{(info.metrics.accuracy * 100).toFixed(1)}%</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Quadratic Weighted Kappa</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{info.metrics.quadraticWeightedKappa.toFixed(3)}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Macro F1</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{info.metrics.macroF1.toFixed(3)}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary">Parameters</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{(info.metrics.parameters / 1e6).toFixed(1)}M</Typography>
              </Grid>
            </Grid>
          ) : (
            <Typography color="text.secondary">Metrics will be displayed after model evaluation.</Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Transfer learning vs. from-scratch CNN</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            A custom CNN was trained from scratch on the same dataset as a baseline, specifically to test whether
            transfer learning was actually worth it rather than assuming so. It went through a targeted retuning
            pass after an early version showed weak recall on the clinically critical Severe class.
          </Typography>
          {chartData && (
            <Box sx={{ height: 300 }} role="img" aria-label="Bar chart comparing EfficientNetB0 and a custom CNN across accuracy, quadratic weighted kappa, macro F1, and Severe-class recall -- EfficientNetB0 leads on the first three, but the custom CNN achieves higher Severe recall">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E8EC" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} domain={[0, 100]} />
                  <Tooltip formatter={(v: number) => `${v}`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Accuracy" fill="#4C7FB8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="QWK (x100)" fill="#12305C" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Macro F1 (x100)" fill="#C99A1E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Severe Recall (x100)" fill="#C24A3A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            EfficientNetB0 (transfer learning) leads on overall agreement (QWK, accuracy, macro F1) despite having
            {comparison
              ? ` fewer parameters (${(comparison[0].parameters / 1e6).toFixed(1)}M vs ${(comparison[1].parameters / 1e6).toFixed(1)}M)`
              : " fewer parameters"}
            {" "}
            than the custom CNN — on a dataset this size, pretrained feature extraction matters more than raw
            model capacity. Interestingly, after retuning specifically for it, the custom CNN actually achieves
            {comparison
              ? ` higher recall on Severe cases (${(comparison[1].severeRecall * 100).toFixed(0)}% vs ${(comparison[0].severeRecall * 100).toFixed(0)}%)`
              : " higher recall on Severe cases"}
            {" "}
            — a real trade-off between aggregate agreement and sensitivity on the highest-risk class, not a clean
            win for either model.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
