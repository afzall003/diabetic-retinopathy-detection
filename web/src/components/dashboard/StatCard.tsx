import { Card, CardContent, Typography, Box } from "@mui/material";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  accentColor?: string;
}

export default function StatCard({ label, value, icon: Icon, accentColor = "#12305C" }: StatCardProps) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {label}
          </Typography>
          <Box
            sx={{
              width: 32, height: 32, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center",
              bgcolor: `${accentColor}14`,
            }}
          >
            <Icon size={16} color={accentColor} aria-hidden="true" />
          </Box>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>{value}</Typography>
      </CardContent>
    </Card>
  );
}
