import { buildRamp, SHADES } from './palette';
import { DEFAULT_THEME_ID, findTheme, type ThemeDefinition } from './themes';
export type { ThemeDefinition };

const FAMILIES = ['neutral', 'teal', 'amber', 'red'] as const;
const THEME_STORAGE_KEY = 'virtuabinder-theme';

export function loadStoredThemeId(): string {
  return window.localStorage.getItem(THEME_STORAGE_KEY) ?? DEFAULT_THEME_ID;
}

export function saveThemeId(themeId: string) {
  window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
}

export function applyTheme(themeId: string) {
  const theme = findTheme(themeId);
  const root = document.documentElement;

  for (const family of FAMILIES) {
    const ramp = buildRamp(theme[family]);
    for (const shade of SHADES) {
      root.style.setProperty(`--color-${family}-${shade}`, ramp[shade]);
    }
  }

  root.dataset.themeMode = theme.mode;
}

/** Representative colors for a theme's picker swatch, without computing the full ramp. */
export function themeSwatch(theme: ThemeDefinition) {
  const pick = (anchors: { shade: number; hex: string }[], shade: number) =>
    anchors.find((a) => a.shade === shade)?.hex ?? anchors[0].hex;

  return {
    background: pick(theme.neutral, 950),
    surface: pick(theme.neutral, 900),
    text: pick(theme.neutral, 100),
    accent: pick(theme.teal, 400),
    warm: pick(theme.amber, 400)
  };
}
