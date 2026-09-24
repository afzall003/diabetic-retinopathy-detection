import { useEffect, useState } from "react";
import { Box, Chip, Container, Grid, Typography } from "@mui/material";
import { useParams, Link } from "react-router-dom";
import { analysisApi } from "@/api/analysisApi";
import type { AnalysisResult, ApiError } from "@/types/analysis";
import { LoadingState, ErrorState } from "@/components/common/StateViews";
import PredictionCard from "@/components/analysis/PredictionCard";
import Disclaimer from "@/components/common/Disclaimer";
import { formatDateTime } from "@/utils/formatting";

export default function Results() {
  const { analysisId } = useParams<{ analysisId: string }>();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (!analysisId) return;
    setLoading(true);
    analysisApi
      .getAnalysis(analysisId)
      .then(setResult)
      .catch((err) => setError(err as ApiError))
      .finally(() => setLoading(false));
  }, [analysisId]);

  if (loading) return <Container sx={{ py: 5 }}><LoadingState label="Loading analysis..." /></Container>;
  if (error || !result)
    return (
      <Container sx={{ py: 5 }}>
        <ErrorState message={error?.message || "This analysis could not be found."} />
      </Container>
    );

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Screening Result</Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>{result.analysisId}</Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Original</Typography>
              <Box
                component="img"
                src={result.imageUrl}
                alt="Uploaded retinal fundus photo"
                sx={{ width: "100%", borderRadius: 2, border: "1px solid #E5E8EC", display: "block" }}
              />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Grad-CAM</Typography>
              {result.gradcamUrl ? (
                <Box
                  component="img"
                  src={result.gradcamUrl}
                  alt="Grad-CAM heatmap overlay showing which regions of the image drove the model's prediction"
                  sx={{ width: "100%", borderRadius: 2, border: "1px solid #E5E8EC", display: "block" }}
                />
              ) : (
                <Box
                  sx={{
                    width: "100%", aspectRatio: "1 / 1", borderRadius: 2, border: "1px dashed #C7CBD1",
                    display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#FAFBFC",
                  }}
                >
                  <Typography variant="body2" color="text.secondary" sx={{ px: 2, textAlign: "center" }}>
                    Grad-CAM isn't available for past analyses
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <PredictionCard result={result} />
        </Grid>
      </Grid>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}>
        <Chip label={`Analysis ID: ${result.analysisId}`} variant="outlined" size="small" />
        <Chip label={`Date: ${formatDateTime(result.createdAt)}`} variant="outlined" size="small" />
        {result.processingTimeMs && <Chip label={`Processing time: ${result.processingTimeMs}ms`} variant="outlined" size="small" />}
        <Chip label={`Model: ${result.modelVersion}`} variant="outlined" size="small" />
      </Box>

      <Disclaimer />

      <Box sx={{ mt: 3 }}>
        <Link to="/analyze" style={{ color: "#12305C", fontWeight: 600, fontSize: 14 }}>
          Analyze another image
        </Link>
      </Box>
    </Container>
  );
}
