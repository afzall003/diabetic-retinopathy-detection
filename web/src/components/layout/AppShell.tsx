import { useEffect, useState, type ReactNode } from "react";
import {
  AppBar, Box, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Tooltip, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import { Menu, LayoutDashboard, ScanEye, History, Cpu, Info, Eye, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Analyze Image", path: "/analyze", icon: ScanEye },
  { label: "History", path: "/history", icon: History },
  { label: "Model", path: "/model", icon: Cpu },
  { label: "About", path: "/about", icon: Info },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  return (
    <List sx={{ px: 1.5, py: 2 }}>
      {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
        const active = location.pathname.startsWith(path);
        return (
          <ListItemButton
            key={path}
            component={Link}
            to={path}
            onClick={onNavigate}
            selected={active}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              "&.Mui-selected": { bgcolor: "primary.main", color: "#fff", "&:hover": { bgcolor: "primary.dark" } },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: active ? "#fff" : "text.secondary" }}>
              <Icon size={19} aria-hidden="true" />
            </ListItemIcon>
            <ListItemText primary={label} primaryTypographyProps={{ fontWeight: active ? 600 : 500, fontSize: 14 }} />
          </ListItemButton>
        );
      })}
    </List>
  );
}

function Brand() {
  return (
    <Box
      component={Link}
      to="/"
      aria-label="Go to home page"
      sx={{
        display: "flex", alignItems: "center", gap: 1.2,
        textDecoration: "none", color: "inherit", cursor: "pointer",
        "&:hover": { opacity: 0.85 },
      }}
    >
      <Box
        sx={{
          width: 34, height: 34, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #4C7FB8, #12305C)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        <Eye size={17} color="#fff" aria-hidden="true" />
      </Box>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1 }}>DR Vision</Typography>
        <Typography variant="caption" color="text.secondary">AI Retinopathy Screening</Typography>
      </Box>
    </Box>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Ctrl+B / Cmd+B toggles the desktop sidebar, matching the convention
  // used by Claude's own interface.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (isDesktop) {
    return (
      <Box sx={{ display: "flex" }}>
        {sidebarOpen && (
          <Drawer
            variant="permanent"
            sx={{
              width: DRAWER_WIDTH,
              flexShrink: 0,
              "& .MuiDrawer-paper": { width: DRAWER_WIDTH, borderRight: "1px solid #E5E8EC", bgcolor: "#FFFFFF" },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2.5, py: 2.5 }}>
              <Brand />
              <Tooltip title="Hide sidebar  Ctrl+B">
                <IconButton size="small" onClick={() => setSidebarOpen(false)} aria-label="Hide sidebar">
                  <PanelLeftClose size={17} />
                </IconButton>
              </Tooltip>
            </Box>
            <NavList />
          </Drawer>
        )}
        <Box component="main" sx={{ flexGrow: 1, minHeight: "100vh", bgcolor: "background.default", position: "relative" }}>
          {!sidebarOpen && (
            <Tooltip title="Show sidebar  Ctrl+B">
              <IconButton
                onClick={() => setSidebarOpen(true)}
                aria-label="Show sidebar"
                sx={{
                  position: "fixed", top: 14, left: 14, zIndex: 1300,
                  bgcolor: "#fff", border: "1px solid #E5E8EC",
                  "&:hover": { bgcolor: "#FAFBFC" },
                }}
              >
                <PanelLeftOpen size={18} />
              </IconButton>
            </Tooltip>
          )}
          {children}
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <AppBar position="sticky" color="inherit" sx={{ bgcolor: "#fff" }}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu">
            <Menu size={22} />
          </IconButton>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>DR Vision</Typography>
        </Toolbar>
      </AppBar>
      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <Box sx={{ width: 260 }}>
          <Brand />
          <NavList onNavigate={() => setMobileOpen(false)} />
        </Box>
      </Drawer>
      <Box component="main" sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
        {children}
      </Box>
    </Box>
  );
}
