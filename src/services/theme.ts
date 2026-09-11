import { AppTheme } from '../types';

export interface ThemeColors {
  id: AppTheme;
  name: string;
  previewColor: string;
  dotColor: string;
  accentHex: string;
  accentLightHex: string;
  accentBgHex: string;
  accentBorderHex: string;
  btnBgHex: string;
  btnHoverHex: string;
  btnTextHex: string;
  glowHex: string;
}

export const THEMES: Record<AppTheme, ThemeColors> = {
  midnight: {
    id: 'midnight',
    name: 'Midnight purple',
    previewColor: '#8b5cf6',
    dotColor: '#b49bf8',
    accentHex: '#b49bf8',
    accentLightHex: '#c084fc',
    accentBgHex: '#241a3f',
    accentBorderHex: '#4c3580',
    btnBgHex: '#b49bf8',
    btnHoverHex: '#c4adff',
    btnTextHex: '#0d0a1a',
    glowHex: 'rgba(180, 155, 248, 0.4)',
  },
  electric: {
    id: 'electric',
    name: 'Electric blue',
    previewColor: '#3b82f6',
    dotColor: '#60a5fa',
    accentHex: '#60a5fa',
    accentLightHex: '#93c5fd',
    accentBgHex: '#172554',
    accentBorderHex: '#2563eb',
    btnBgHex: '#60a5fa',
    btnHoverHex: '#93c5fd',
    btnTextHex: '#081329',
    glowHex: 'rgba(96, 165, 250, 0.4)',
  },
  lime: {
    id: 'lime',
    name: 'Athletic lime',
    previewColor: '#84cc16',
    dotColor: '#a3e635',
    accentHex: '#a3e635',
    accentLightHex: '#bef264',
    accentBgHex: '#1a2e05',
    accentBorderHex: '#4d7c0f',
    btnBgHex: '#a3e635',
    btnHoverHex: '#bef264',
    btnTextHex: '#0a1403',
    glowHex: 'rgba(163, 230, 53, 0.4)',
  },
  monochrome: {
    id: 'monochrome',
    name: 'Monochrome',
    previewColor: '#94a3b8',
    dotColor: '#f1f5f9',
    accentHex: '#f1f5f9',
    accentLightHex: '#ffffff',
    accentBgHex: '#1e293b',
    accentBorderHex: '#64748b',
    btnBgHex: '#f8fafc',
    btnHoverHex: '#e2e8f0',
    btnTextHex: '#020617',
    glowHex: 'rgba(241, 245, 249, 0.3)',
  },
};

export function applyAppTheme(themeName: AppTheme = 'midnight') {
  const theme = THEMES[themeName] || THEMES.midnight;
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.style.setProperty('--theme-accent', theme.accentHex);
    root.style.setProperty('--theme-accent-light', theme.accentLightHex);
    root.style.setProperty('--theme-accent-bg', theme.accentBgHex);
    root.style.setProperty('--theme-accent-border', theme.accentBorderHex);
    root.style.setProperty('--theme-btn-bg', theme.btnBgHex);
    root.style.setProperty('--theme-btn-hover', theme.btnHoverHex);
    root.style.setProperty('--theme-btn-text', theme.btnTextHex);
    root.style.setProperty('--theme-glow', theme.glowHex);
    root.setAttribute('data-theme', themeName);
  }
}
