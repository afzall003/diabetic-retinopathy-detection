import { useEffect, useState } from "react";
import { Box, Button, Container, Grid, Typography } from "@mui/material";
import { Activity, CheckCircle2, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { dashboardApi } from "@/api/dashboardApi";
import type { DashboardStatistics } from "@/types/analysis";
import StatCard from "@/components/dashboard/StatCard";
import { LoadingState, ErrorState } from "@/components/common/StateViews";
import { useHistory } from "@/hooks/useHistory";
import { formatConfidence, formatDateTime } from "@/utils/formatting";
import StatusChip from "@/components/common/StatusChip";
import { Card, CardContent } from "@mui/material";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { items: history } = useHistory();

  useEffect(() => {
    dashboardApi
      .getStatistics()
      .then(setStats)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Diabetic Retinopathy Screening</Typography>
          <Typography color="text.secondary">Analyze retinal images using our convolutional neural network.</Typography>
        </Box>
        <Button component={Link} to="/analyze" variant="contained" endIcon={<ArrowRight size={17} />}>
          Analyze New Image
        </Button>
      </Box>

      {loading ? (
        <LoadingState label="Loading dashboard statistics..." />
      ) : error || !stats ? (
        <ErrorState message="We couldn't load dashboard statistics right now." />
      ) : (
        <Grid container spacing={2.5} sx={{ mb: 5 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Total Analyses" value={String(stats.totalAnalyses)} icon={Activity} accentColor="#12305C" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Normal Cases" value={String(stats.normalCases)} icon={CheckCircle2} accentColor="#1E7A46" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Referable Cases" value={String(stats.referableCases)} icon={AlertTriangle} accentColor="#C24A3A" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Average Confidence" value={formatConfidence(stats.averageConfidence)} icon={TrendingUp} accentColor="#4C7FB8" />
          </Grid>
        </Grid>
      )}

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Recent analyses</Typography>
      <Card>
        <CardContent sx={{ p: 0 }}>
          {history.slice(0, 5).map((item, i) => (
            <Box
              key={item.analysisId}
              component={Link}
              to={`/results/${item.analysisId}`}
              sx={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2,
                px: 3, py: 2, textDecoration: "none", color: "inherit",
                borderBottom: i < 4 ? "1px solid #E5E8EC" : "none",
                "&:hover": { bgcolor: "#FAFBFC" },
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.analysisId}</Typography>
                <Typography variant="caption" color="text.secondary">{formatDateTime(item.createdAt)}</Typography>
              </Box>
              <StatusChip label={item.prediction.label} size="small" />
            </Box>
          ))}
        </CardContent>
      </Card>
    </Container>
  );
}
