import { Container, Typography } from "@mui/material";
import { History as HistoryIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useHistory } from "@/hooks/useHistory";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateViews";
import HistoryTable from "@/components/history/HistoryTable";

export default function History() {
  const { items, loading, error, reload } = useHistory();
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Analysis History</Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>Review previous AI screening results.</Typography>

      {loading ? (
        <LoadingState label="Loading history..." />
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No analyses yet"
          description="Upload a retinal image to perform your first AI screening."
          actionLabel="Analyze Image"
          onAction={() => navigate("/analyze")}
          icon={<HistoryIcon size={36} color="#5B6472" aria-hidden="true" />}
        />
      ) : (
        <HistoryTable items={items} />
      )}
    </Container>
  );
}
