import { Chip } from "@mui/material";
import { severityColors } from "@/theme/theme";
import type { SeverityLabel } from "@/types/analysis";

export default function StatusChip({ label, size = "medium" }: { label: SeverityLabel; size?: "small" | "medium" }) {
  const color = severityColors[label] || "#5B6472";
  return (
    <Chip
      label={label}
      size={size}
      sx={{
        bgcolor: `${color}1A`,
        color,
        fontWeight: 600,
        border: `1px solid ${color}40`,
      }}
    />
  );
}
