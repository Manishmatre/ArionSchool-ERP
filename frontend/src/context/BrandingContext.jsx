import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { SES_DEFAULT_BRANDING } from '../config/branding';

const BrandingContext = createContext(null);

const parseHex = (hex) => {
  if (!hex || typeof hex !== 'string') return null;
  let clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16)
  ];
};

const mixRgb = (base, target, weight) => [
  Math.round(base[0] * (1 - weight) + target[0] * weight),
  Math.round(base[1] * (1 - weight) + target[1] * weight),
  Math.round(base[2] * (1 - weight) + target[2] * weight)
];

const toTriplet = (rgb) => `${rgb[0]} ${rgb[1]} ${rgb[2]}`;

const WHITE = [255, 255, 255];
const BLACK = [9, 13, 24];

const isLightHex = (hex) => {
  const rgb = parseHex(hex);
  if (!rgb) return false;
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return luminance > 0.65;
};

export const VALID_THEME_MODES = [
  'brand-chrome',
  'sidebar-accent',
  'header-accent',
  'full-light',
  'full-dark',
  'tinted-studio'
];

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState(SES_DEFAULT_BRANDING);
  const [activeVisual, setActiveVisual] = useState(SES_DEFAULT_BRANDING.visual);
  const [loading, setLoading] = useState(true);

  const applyVisualTheme = useCallback((visual) => {
    if (!visual || typeof document === 'undefined') return;
    const root = document.documentElement;

    const mode = VALID_THEME_MODES.includes(visual.themeMode) ? visual.themeMode : 'brand-chrome';
    const primaryHex = visual.primaryColor || '#0f172a';
    const actionHex = visual.secondaryColor || '#2563eb';
    const accentHex = visual.accentColor || '#0ea5e9';
    const baseDarkBrand = !isLightHex(visual.sidebarColor) && visual.sidebarColor
      ? visual.sidebarColor
      : (!isLightHex(primaryHex) ? primaryHex : '#131b2e');

    // Generate full 11-step RGB scale from school's vibrant action color
    const baseRgb = parseHex(actionHex) || [37, 99, 235];
    const scale = {
      50: mixRgb(baseRgb, WHITE, 0.92),
      100: mixRgb(baseRgb, WHITE, 0.84),
      200: mixRgb(baseRgb, WHITE, 0.68),
      300: mixRgb(baseRgb, WHITE, 0.48),
      400: mixRgb(baseRgb, WHITE, 0.24),
      500: mixRgb(baseRgb, WHITE, 0.08),
      600: baseRgb,
      700: mixRgb(baseRgb, BLACK, 0.16),
      800: mixRgb(baseRgb, BLACK, 0.30),
      900: mixRgb(baseRgb, BLACK, 0.44),
      950: mixRgb(baseRgb, BLACK, 0.62)
    };

    Object.entries(scale).forEach(([step, rgb]) => {
      root.style.setProperty(`--brand-${step}`, toTriplet(rgb));
    });

    // Resolve sidebar, header, border & canvas colors according to active Theme Layout Mode
    let sidebarBg = baseDarkBrand;
    let headerBg = baseDarkBrand;
    let sidebarBorder = 'rgba(255, 255, 255, 0.12)';
    let headerBorder = 'rgba(255, 255, 255, 0.12)';
    let canvasBg = '#f8fafc';

    if (mode === 'sidebar-accent') {
      sidebarBg = baseDarkBrand;
      headerBg = '#ffffff';
      headerBorder = '#e2e8f0';
      canvasBg = '#f8fafc';
    } else if (mode === 'header-accent') {
      sidebarBg = '#ffffff';
      sidebarBorder = '#e2e8f0';
      headerBg = baseDarkBrand;
      canvasBg = '#f8fafc';
    } else if (mode === 'full-light') {
      sidebarBg = '#ffffff';
      headerBg = '#ffffff';
      sidebarBorder = '#e2e8f0';
      headerBorder = '#e2e8f0';
      canvasBg = '#f8fafc';
    } else if (mode === 'full-dark') {
      sidebarBg = '#0b1120';
      headerBg = '#0f172a';
      sidebarBorder = '#1e293b';
      headerBorder = '#1e293b';
      canvasBg = '#090e1a';
    } else if (mode === 'tinted-studio') {
      sidebarBg = `rgb(${scale[50][0]}, ${scale[50][1]}, ${scale[50][2]})`;
      sidebarBorder = `rgb(${scale[200][0]}, ${scale[200][1]}, ${scale[200][2]})`;
      headerBg = baseDarkBrand;
      canvasBg = `rgb(${scale[50][0]}, ${scale[50][1]}, ${scale[50][2]})`;
    } else {
      // brand-chrome (default)
      const sRgb = parseHex(baseDarkBrand);
      if (sRgb) {
        const bRgb = mixRgb(sRgb, WHITE, 0.12);
        sidebarBorder = `rgb(${bRgb[0]}, ${bRgb[1]}, ${bRgb[2]})`;
        headerBorder = sidebarBorder;
      }
    }

    root.setAttribute('data-theme-mode', mode);
    if (mode === 'full-dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    root.style.setProperty('--brand-primary', primaryHex);
    root.style.setProperty('--brand-secondary', actionHex);
    root.style.setProperty('--brand-accent', accentHex);
    root.style.setProperty('--brand-sidebar', sidebarBg);
    root.style.setProperty('--brand-header', headerBg);
    root.style.setProperty('--brand-sidebar-border', sidebarBorder);
    root.style.setProperty('--brand-header-border', headerBorder);
    root.style.setProperty('--brand-bg', canvasBg);

    setActiveVisual({ ...visual, themeMode: mode });

    if (visual.faviconUrl) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = visual.faviconUrl;
    }
  }, []);

  const fetchBranding = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      let response;

      if (token) {
        response = await api.get('/branding/current');
      } else {
        const urlParams = new URLSearchParams(window.location.search);
        const tenantParam = urlParams.get('tenant') || urlParams.get('school');
        const hostname = window.location.hostname;
        const query = tenantParam ? `?tenant=${tenantParam}` : `?domain=${hostname}`;
        response = await api.get(`/branding/public${query}`);
      }

      if (response.data?.success && response.data?.data) {
        const merged = {
          ...SES_DEFAULT_BRANDING,
          ...response.data.data,
          identity: { ...SES_DEFAULT_BRANDING.identity, ...(response.data.data.identity || {}) },
          visual: { ...SES_DEFAULT_BRANDING.visual, ...(response.data.data.visual || {}) },
          login: { ...SES_DEFAULT_BRANDING.login, ...(response.data.data.login || {}) },
          whiteLabel: { ...SES_DEFAULT_BRANDING.whiteLabel, ...(response.data.data.whiteLabel || {}) }
        };
        setBranding(merged);
        applyVisualTheme(merged.visual);

        const schoolTitle = merged.identity?.schoolName || 'Arion School';
        document.title = `${schoolTitle} — School Management ERP`;
      }
    } catch (err) {
      console.warn('Could not load remote branding, using Arion School defaults:', err.message);
      setBranding(SES_DEFAULT_BRANDING);
      applyVisualTheme(SES_DEFAULT_BRANDING.visual);
      document.title = 'Arion School — School Management ERP';
    } finally {
      setLoading(false);
    }
  }, [applyVisualTheme]);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const previewVisualTheme = useCallback((partialVisual) => {
    applyVisualTheme(partialVisual);
  }, [applyVisualTheme]);

  const saveBranding = async (payload) => {
    const res = await api.put('/branding', payload);
    if (res.data?.success && res.data?.data) {
      const merged = {
        ...SES_DEFAULT_BRANDING,
        ...res.data.data,
        identity: { ...SES_DEFAULT_BRANDING.identity, ...(res.data.data.identity || {}) },
        visual: { ...SES_DEFAULT_BRANDING.visual, ...(res.data.data.visual || {}) },
        login: { ...SES_DEFAULT_BRANDING.login, ...(res.data.data.login || {}) },
        whiteLabel: { ...SES_DEFAULT_BRANDING.whiteLabel, ...(res.data.data.whiteLabel || {}) }
      };
      setBranding(merged);
      applyVisualTheme(merged.visual);
      const schoolTitle = merged.identity?.schoolName || 'Arion School';
      document.title = `${schoolTitle} — School Management ERP`;
    }
    return res.data;
  };

  const resetToDefault = async () => {
    const res = await api.post('/branding/reset');
    setBranding(SES_DEFAULT_BRANDING);
    applyVisualTheme(SES_DEFAULT_BRANDING.visual);
    return res.data;
  };

  const themeMode = activeVisual?.themeMode || branding.visual?.themeMode || 'brand-chrome';
  const isLightSidebar = ['header-accent', 'full-light', 'tinted-studio'].includes(themeMode);
  const isLightHeader = ['sidebar-accent', 'full-light'].includes(themeMode);
  const isDarkCanvas = themeMode === 'full-dark';

  const value = {
    branding,
    loading,
    themeMode,
    isLightSidebar,
    isLightHeader,
    isDarkCanvas,
    refreshBranding: fetchBranding,
    previewVisualTheme,
    saveBranding,
    resetToDefault,
    schoolName: branding.identity?.schoolName || 'Arion School',
    shortName: branding.identity?.shortName || 'SES',
    logoUrl: branding.visual?.logoUrl || '',
    showPlatformAttribution: branding.login?.showPlatformAttribution !== false
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    return {
      branding: SES_DEFAULT_BRANDING,
      loading: false,
      themeMode: 'brand-chrome',
      isLightSidebar: false,
      isLightHeader: false,
      isDarkCanvas: false,
      previewVisualTheme: () => {},
      schoolName: 'Arion School',
      shortName: 'SES',
      logoUrl: '',
      showPlatformAttribution: true
    };
  }
  return context;
};

export default BrandingContext;

