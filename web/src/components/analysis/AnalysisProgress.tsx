import { Box, LinearProgress, Typography } from "@mui/material";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

const STEPS = ["Image uploaded", "Image preprocessing", "CNN inference", "Generating result"];

export default function AnalysisProgress() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timers = STEPS.map((_, i) =>
      setTimeout(() => setActiveStep(i + 1), (i + 1) * 550)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Analyzing retinal image&hellip;</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        This usually takes a few seconds.
      </Typography>
      <LinearProgress sx={{ mb: 3, height: 6, borderRadius: 3 }} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {STEPS.map((step, i) => {
          const done = i < activeStep;
          const current = i === activeStep;
          return (
            <Box key={step} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  bgcolor: done ? "success.main" : current ? "primary.main" : "#E5E8EC",
                }}
              >
                {done && <Check size={13} color="#fff" aria-hidden="true" />}
              </Box>
              <Typography
                variant="body2"
                sx={{ color: done || current ? "text.primary" : "text.secondary", fontWeight: current ? 600 : 400 }}
              >
                {step}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
