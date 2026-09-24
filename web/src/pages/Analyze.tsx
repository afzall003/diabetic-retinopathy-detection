import { useState } from "react";
import { Box, Button, Container, Typography } from "@mui/material";
import { ScanEye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ImageUploader from "@/components/analysis/ImageUploader";
import AnalysisProgress from "@/components/analysis/AnalysisProgress";
import { ErrorState } from "@/components/common/StateViews";
import { useAnalysis } from "@/hooks/useAnalysis";
import Disclaimer from "@/components/common/Disclaimer";

export default function Analyze() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { loading, error, analyze } = useAnalysis();
  const navigate = useNavigate();

  const handleFileSelected = (f: File) => {
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleClear = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    const result = await analyze(file);
    if (result) navigate(`/results/${result.analysisId}`);
  };

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
        <ScanEye size={24} color="#12305C" />
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Analyze Retinal Image</Typography>
      </Box>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Upload a retinal fundus image for AI-assisted severity screening.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Disclaimer compact />
      </Box>

      {loading ? (
        <AnalysisProgress />
      ) : error ? (
        <ErrorState message={error.message} onRetry={handleAnalyze} />
      ) : (
        <>
          <ImageUploader
            selectedFile={file}
            previewUrl={previewUrl}
            onFileSelected={handleFileSelected}
            onClear={handleClear}
          />
          {file && (
            <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
              <Button variant="contained" size="large" onClick={handleAnalyze}>
                Analyze Retinal Image
              </Button>
            </Box>
          )}
        </>
      )}
    </Container>
  );
}
