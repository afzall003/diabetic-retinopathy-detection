import { useMemo, useState } from "react";
import {
  Box, Card, Chip, MenuItem, Pagination, Select, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { AnalysisHistoryItem, SeverityLabel } from "@/types/analysis";
import { SEVERITY_LABELS } from "@/types/analysis";
import { formatDateTime, formatConfidence } from "@/utils/formatting";
import StatusChip from "@/components/common/StatusChip";

const PAGE_SIZE = 8;

export default function HistoryTable({ items }: { items: AnalysisHistoryItem[] }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityLabel | "All">("All");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.analysisId.toLowerCase().includes(search.toLowerCase());
      const matchesSeverity = severityFilter === "All" || item.prediction.label === severityFilter;
      return matchesSearch && matchesSeverity;
    });
  }, [items, search, severityFilter]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2, mb: 2.5, flexWrap: "wrap" }}>
        <TextField
          size="small"
          placeholder="Search by analysis ID"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          InputProps={{ startAdornment: <Search size={16} style={{ marginRight: 8, opacity: 0.6 }} /> }}
          sx={{ minWidth: 220 }}
        />
        <Select
          size="small"
          value={severityFilter}
          onChange={(e) => {
            setSeverityFilter(e.target.value as SeverityLabel | "All");
            setPage(1);
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="All">All severities</MenuItem>
          {SEVERITY_LABELS.map((label) => (
            <MenuItem key={label} value={label}>{label}</MenuItem>
          ))}
        </Select>
      </Box>

      {filtered.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          No analyses match your filters.
        </Typography>
      ) : isMobile ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {paginated.map((item) => (
            <Card
              key={item.analysisId}
              onClick={() => navigate(`/results/${item.analysisId}`)}
              sx={{ p: 2, cursor: "pointer" }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.analysisId}</Typography>
                <Chip label={item.status} size="small" color={item.status === "completed" ? "success" : "error"} />
              </Box>
              <StatusChip label={item.prediction.label} size="small" />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                {formatDateTime(item.createdAt)} &middot; {formatConfidence(item.prediction.confidence)} confidence
              </Typography>
            </Card>
          ))}
        </Box>
      ) : (
        <TableContainer component={Card}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Analysis ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Prediction</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Confidence</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Model Version</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((item) => (
                <TableRow
                  key={item.analysisId}
                  hover
                  onClick={() => navigate(`/results/${item.analysisId}`)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>{item.analysisId}</TableCell>
                  <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                  <TableCell><StatusChip label={item.prediction.label} size="small" /></TableCell>
                  <TableCell>{formatConfidence(item.prediction.confidence)}</TableCell>
                  <TableCell>{item.modelVersion}</TableCell>
                  <TableCell>
                    <Chip label={item.status} size="small" color={item.status === "completed" ? "success" : "error"} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {pageCount > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination count={pageCount} page={page} onChange={(_, p) => setPage(p)} />
        </Box>
      )}
    </Box>
  );
}
