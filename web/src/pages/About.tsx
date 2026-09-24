import { Box, Container, Typography, Divider } from "@mui/material";

export default function About() {
  return (
    <Container maxWidth="sm" sx={{ py: 5 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>About</Typography>

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>What is diabetic retinopathy?</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Diabetic retinopathy is an eye condition caused by damage to the blood vessels of the retina in people with
        diabetes. It progresses through recognizable stages, from no visible damage through to proliferative
        disease, where abnormal new vessels grow and vision loss becomes a serious risk.
      </Typography>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Why early screening matters</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Diabetic retinopathy often has no symptoms in its early stages. Regular screening allows earlier
        intervention, which is closely associated with better long-term outcomes.
      </Typography>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>What this application does</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        DR Vision analyzes an uploaded retinal fundus photograph and predicts which of five standard severity
        stages it most closely resembles, along with a probability for each stage.
      </Typography>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>How CNN-based classification works</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        A convolutional neural network learns visual patterns from a large set of labeled retinal images during
        training, then applies those learned patterns to classify new, unseen images.
      </Typography>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Limitations of AI screening</Typography>
      <Typography color="text.secondary">
        This model was trained and evaluated on a specific dataset and reflects the patterns present in that data.
        It is a screening aid, not a diagnostic tool, and its predictions should always be reviewed by a qualified
        healthcare professional before any clinical decision is made.
      </Typography>
    </Container>
  );
}
