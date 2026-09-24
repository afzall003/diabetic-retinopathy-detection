import { useCallback, useRef, useState } from "react";
import { Box, Button, Chip, Grid, Typography } from "@mui/material";
import { UploadCloud, X, ImageIcon } from "lucide-react";
import { validateImageFile } from "@/utils/validation";
import { formatFileSize } from "@/utils/formatting";

interface ImageUploaderProps {
  onFileSelected: (file: File) => void;
  onClear: () => void;
  selectedFile: File | null;
  previewUrl: string | null;
  disabled?: boolean;
}

export default function ImageUploader({ onFileSelected, onClear, selectedFile, previewUrl, disabled }: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const result = validateImageFile(file);
      if (!result.valid) {
        setError(result.error || "Invalid file.");
        return;
      }
      setError(null);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile, disabled]
  );

  if (selectedFile && previewUrl) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box
            component="img"
            src={previewUrl}
            alt="Uploaded retinal fundus photo preview"
            sx={{ width: "100%", borderRadius: 2, border: "1px solid #E5E8EC", display: "block" }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, height: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <ImageIcon size={18} color="#5B6472" aria-hidden="true" />
              <Typography sx={{ fontWeight: 600, wordBreak: "break-all" }}>{selectedFile.name}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {formatFileSize(selectedFile.size)} &middot; {selectedFile.type.replace("image/", "").toUpperCase()}
            </Typography>
            <Chip label="Validation passed" color="success" size="small" sx={{ alignSelf: "flex-start", fontWeight: 600 }} />
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<X size={16} />}
              onClick={onClear}
              disabled={disabled}
              sx={{ alignSelf: "flex-start" }}
            >
              Remove image
            </Button>
          </Box>
        </Grid>
      </Grid>
    );
  }

  return (
    <Box>
      <Box
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload a retinal fundus image"
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) inputRef.current?.click();
        }}
        sx={{
          border: "2px dashed",
          borderColor: dragActive ? "primary.main" : error ? "error.main" : "#C7CBD1",
          borderRadius: 3,
          bgcolor: dragActive ? "rgba(18,48,92,0.03)" : "#FAFBFC",
          py: 7,
          textAlign: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "border-color 0.15s ease, background-color 0.15s ease",
          "&:hover": disabled ? {} : { borderColor: "primary.main" },
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <UploadCloud size={34} color="#4C7FB8" aria-hidden="true" />
        <Typography variant="h6" sx={{ mt: 2, mb: 0.5 }}>
          Upload a retinal fundus image for analysis
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Drag and drop, or click to browse
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
          Supported formats: JPG, JPEG, PNG &middot; Maximum file size: 10 MB
        </Typography>
      </Box>
      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 1.5 }} role="alert">
          {error}
        </Typography>
      )}
    </Box>
  );
}
