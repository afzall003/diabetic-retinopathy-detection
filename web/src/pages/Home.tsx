import { Box, Button, Container, Grid, Typography, Card, CardContent } from "@mui/material";
import { ArrowRight, ScanEye, Layers, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { SEVERITY_LABELS } from "@/types/analysis";
import StatusChip from "@/components/common/StatusChip";
import Disclaimer from "@/components/common/Disclaimer";

const STEPS = [
  { title: "Upload", description: "Provide a retinal fundus photograph in JPG or PNG format." },
  { title: "AI Analysis", description: "A convolutional neural network extracts and classifies image features." },
  { title: "Severity Result", description: "View the predicted severity stage and full probability breakdown." },
];

export default function Home() {
  return (
    <Box>
      <Box sx={{ bgcolor: "#0F2749", color: "#fff", py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md">
          <Typography variant="h2" sx={{ fontSize: { xs: 32, md: 44 }, fontWeight: 700, mb: 2 }}>
            AI-Powered Diabetic Retinopathy Screening
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 400, color: "rgba(255,255,255,0.8)", mb: 4, maxWidth: 620 }}>
            Analyze retinal fundus images with a convolutional neural network designed to assist diabetic
            retinopathy screening.
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button component={Link} to="/analyze" variant="contained" size="large" endIcon={<ArrowRight size={18} />}
              sx={{ bgcolor: "#4C7FB8", "&:hover": { bgcolor: "#3D6BA0" } }}>
              Analyze an Image
            </Button>
            <Button component={Link} to="/model" variant="outlined" size="large" sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}>
              Learn About the Model
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 7 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 4 }}>How it works</Typography>
        <Grid container spacing={3} sx={{ mb: 7 }}>
          {STEPS.map((step, i) => (
            <Grid item xs={12} md={4} key={step.title}>
              <Card sx={{ height: "100%" }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ width: 34, height: 34, borderRadius: "50%", bgcolor: "#12305C14", display: "flex", alignItems: "center", justifyContent: "center", mb: 2 }}>
                    {i === 0 && <ScanEye size={17} color="#12305C" />}
                    {i === 1 && <Layers size={17} color="#12305C" />}
                    {i === 2 && <Info size={17} color="#12305C" />}
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>{step.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{step.description}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Five DR severity classes</Typography>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 7 }}>
          {SEVERITY_LABELS.map((label) => (
            <StatusChip key={label} label={label} />
          ))}
        </Box>

        <Disclaimer />
      </Container>
    </Box>
  );
}
