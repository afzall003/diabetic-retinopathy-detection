import { useCallback, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { MoveHorizontal } from "lucide-react";

interface CompareSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export default function CompareSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Original",
  afterLabel = "Grad-CAM",
}: CompareSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50); // % from left where the "after" image is revealed up to
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };

  const onPointerUp = () => {
    draggingRef.current = false;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 4));
    if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + 4));
    if (e.key === "Home") setPosition(0);
    if (e.key === "End") setPosition(100);
  };

  return (
    <Box>
      <Box
        ref={containerRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid #E5E8EC",
          userSelect: "none",
          cursor: "ew-resize",
        }}
      >
        {/* Base layer: Grad-CAM, always fully visible underneath */}
        <Box
          component="img"
          src={afterSrc}
          alt={`${afterLabel} of the uploaded retinal image`}
          draggable={false}
          sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* Top layer: Original, clipped to reveal Grad-CAM to the right of the handle */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            clipPath: `inset(0 ${100 - position}% 0 0)`,
          }}
        >
          <Box
            component="img"
            src={beforeSrc}
            alt={`${beforeLabel} retinal fundus image`}
            draggable={false}
            sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </Box>

        {/* Labels */}
        <Box sx={{ position: "absolute", top: 10, left: 10, bgcolor: "rgba(11,13,16,0.65)", color: "#fff", px: 1, py: 0.3, borderRadius: 1, fontSize: 12, fontWeight: 600 }}>
          {beforeLabel}
        </Box>
        <Box sx={{ position: "absolute", top: 10, right: 10, bgcolor: "rgba(11,13,16,0.65)", color: "#fff", px: 1, py: 0.3, borderRadius: 1, fontSize: 12, fontWeight: 600 }}>
          {afterLabel}
        </Box>

        {/* Divider line + drag handle */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${position}%`,
            width: "2px",
            bgcolor: "#fff",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.15)",
            transform: "translateX(-1px)",
            pointerEvents: "none",
          }}
        />
        <Box
          role="slider"
          tabIndex={0}
          aria-label="Comparison slider between original and Grad-CAM images"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position)}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          sx={{
            position: "absolute",
            top: "50%",
            left: `${position}%`,
            transform: "translate(-50%, -50%)",
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: "#fff",
            border: "1px solid #E5E8EC",
            boxShadow: "0 2px 8px rgba(16,24,40,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "ew-resize",
            "&:focus-visible": { outline: "2px solid #4C7FB8", outlineOffset: 2 },
          }}
        >
          <MoveHorizontal size={16} color="#12305C" aria-hidden="true" />
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, textAlign: "center" }}>
        Drag the handle (or use arrow keys) to compare the original image against the Grad-CAM heatmap.
      </Typography>
    </Box>
  );
}
