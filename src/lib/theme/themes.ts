import type { Anchor } from './palette';

export type ThemeMode = 'dark' | 'light';

export type ThemeDefinition = {
  id: string;
  name: string;
  mode: ThemeMode;
  /** Sparse real anchor colors per family; palette.ts fills in the rest of the 50..950 ramp. */
  neutral: Anchor[];
  teal: Anchor[];
  amber: Anchor[];
  red: Anchor[];
};

// Anchor colors are taken from each project's published palette:
// Gruvbox (morhetz/gruvbox), Everforest (sainnhe/everforest), One Dark/Light (Atom),
// Nord (nordtheme.com), Dracula (draculatheme.com), Solarized (Ethan Schoonover).
// All are MIT/open-licensed color specifications.
export const THEMES: ThemeDefinition[] = [
  {
    id: 'default-dark',
    name: 'Default Dark',
    mode: 'dark',
    neutral: [
      { shade: 950, hex: '#0a0a0a' },
      { shade: 900, hex: '#171717' },
      { shade: 700, hex: '#404040' },
      { shade: 400, hex: '#a3a3a3' },
      { shade: 100, hex: '#f5f5f5' },
      { shade: 50, hex: '#fafafa' }
    ],
    teal: [
      { shade: 900, hex: '#134e4a' },
      { shade: 400, hex: '#2dd4bf' },
      { shade: 100, hex: '#ccfbf1' }
    ],
    amber: [
      { shade: 900, hex: '#78350f' },
      { shade: 400, hex: '#fbbf24' },
      { shade: 100, hex: '#fef3c7' }
    ],
    red: [
      { shade: 900, hex: '#7f1d1d' },
      { shade: 400, hex: '#f87171' },
      { shade: 100, hex: '#fee2e2' }
    ]
  },
  {
    id: 'gruvbox-dark',
    name: 'Gruvbox Dark',
    mode: 'dark',
    neutral: [
      { shade: 950, hex: '#1d2021' },
      { shade: 900, hex: '#282828' },
      { shade: 700, hex: '#504945' },
      { shade: 400, hex: '#a89984' },
      { shade: 100, hex: '#ebdbb2' },
      { shade: 50, hex: '#fbf1c7' }
    ],
    teal: [
      { shade: 900, hex: '#3c6355' },
      { shade: 400, hex: '#8ec07c' },
      { shade: 100, hex: '#e3f1d7' }
    ],
    amber: [
      { shade: 900, hex: '#7c5c11' },
      { shade: 400, hex: '#fabd2f' },
      { shade: 100, hex: '#fbecc0' }
    ],
    red: [
      { shade: 900, hex: '#5a1a17' },
      { shade: 400, hex: '#fb4934' },
      { shade: 100, hex: '#f8d6d1' }
    ]
  },
  {
    id: 'gruvbox-light',
    name: 'Gruvbox Light',
    mode: 'light',
    neutral: [
      { shade: 950, hex: '#fbf1c7' },
      { shade: 900, hex: '#ebdbb2' },
      { shade: 700, hex: '#bdae93' },
      { shade: 400, hex: '#7c6f64' },
      { shade: 100, hex: '#3c3836' },
      { shade: 50, hex: '#282828' }
    ],
    teal: [
      { shade: 900, hex: '#3c6355' },
      { shade: 400, hex: '#427b58' },
      { shade: 100, hex: '#d6e8ca' }
    ],
    amber: [
      { shade: 900, hex: '#7c5c11' },
      { shade: 400, hex: '#b57614' },
      { shade: 100, hex: '#f6e6bd' }
    ],
    red: [
      { shade: 900, hex: '#5a1a17' },
      { shade: 400, hex: '#9d0006' },
      { shade: 100, hex: '#f2d3ce' }
    ]
  },
  {
    id: 'everforest-dark',
    name: 'Everforest Dark',
    mode: 'dark',
    neutral: [
      { shade: 950, hex: '#232a2e' },
      { shade: 900, hex: '#2d353b' },
      { shade: 700, hex: '#475258' },
      { shade: 400, hex: '#859289' },
      { shade: 100, hex: '#d3c6aa' },
      { shade: 50, hex: '#f2eee0' }
    ],
    teal: [
      { shade: 900, hex: '#2c4a44' },
      { shade: 400, hex: '#83c092' },
      { shade: 100, hex: '#dcefe2' }
    ],
    amber: [
      { shade: 900, hex: '#6b4a1a' },
      { shade: 400, hex: '#dbbc7f' },
      { shade: 100, hex: '#f3e7cd' }
    ],
    red: [
      { shade: 900, hex: '#5c2626' },
      { shade: 400, hex: '#e67e80' },
      { shade: 100, hex: '#f8dcdc' }
    ]
  },
  {
    id: 'everforest-light',
    name: 'Everforest Light',
    mode: 'light',
    neutral: [
      { shade: 950, hex: '#fdf6e3' },
      { shade: 900, hex: '#f4f0d9' },
      { shade: 700, hex: '#dfdbc8' },
      { shade: 400, hex: '#939f91' },
      { shade: 100, hex: '#5c6a72' },
      { shade: 50, hex: '#3a464c' }
    ],
    teal: [
      { shade: 900, hex: '#2c4a44' },
      { shade: 400, hex: '#35a77c' },
      { shade: 100, hex: '#d3ecdf' }
    ],
    amber: [
      { shade: 900, hex: '#6b4a1a' },
      { shade: 400, hex: '#dfa000' },
      { shade: 100, hex: '#f6e6bd' }
    ],
    red: [
      { shade: 900, hex: '#5c2626' },
      { shade: 400, hex: '#f85552' },
      { shade: 100, hex: '#fbdad9' }
    ]
  },
  {
    id: 'one-dark',
    name: 'One Dark',
    mode: 'dark',
    neutral: [
      { shade: 950, hex: '#21252b' },
      { shade: 900, hex: '#282c34' },
      { shade: 700, hex: '#4b5263' },
      { shade: 400, hex: '#5c6370' },
      { shade: 100, hex: '#abb2bf' },
      { shade: 50, hex: '#e6e6e6' }
    ],
    teal: [
      { shade: 900, hex: '#1f4c52' },
      { shade: 400, hex: '#56b6c2' },
      { shade: 100, hex: '#d6f0f2' }
    ],
    amber: [
      { shade: 900, hex: '#6e5210' },
      { shade: 400, hex: '#e5c07b' },
      { shade: 100, hex: '#f6ecd6' }
    ],
    red: [
      { shade: 900, hex: '#5e2323' },
      { shade: 400, hex: '#e06c75' },
      { shade: 100, hex: '#f9dadc' }
    ]
  },
  {
    id: 'one-light',
    name: 'One Light',
    mode: 'light',
    neutral: [
      { shade: 950, hex: '#fafafa' },
      { shade: 900, hex: '#eaeaeb' },
      { shade: 700, hex: '#c6c7c9' },
      { shade: 400, hex: '#a0a1a7' },
      { shade: 100, hex: '#383a42' },
      { shade: 50, hex: '#202227' }
    ],
    teal: [
      { shade: 900, hex: '#1f4c52' },
      { shade: 400, hex: '#0184bc' },
      { shade: 100, hex: '#cfeaf5' }
    ],
    amber: [
      { shade: 900, hex: '#6e5210' },
      { shade: 400, hex: '#c18401' },
      { shade: 100, hex: '#f2e2bd' }
    ],
    red: [
      { shade: 900, hex: '#5e2323' },
      { shade: 400, hex: '#e45649' },
      { shade: 100, hex: '#fbdcd9' }
    ]
  },
  {
    id: 'nord',
    name: 'Nord',
    mode: 'dark',
    neutral: [
      { shade: 950, hex: '#242933' },
      { shade: 900, hex: '#2e3440' },
      { shade: 700, hex: '#4c566a' },
      { shade: 400, hex: '#9aa5ba' },
      { shade: 100, hex: '#d8dee9' },
      { shade: 50, hex: '#eceff4' }
    ],
    teal: [
      { shade: 900, hex: '#2b4a52' },
      { shade: 400, hex: '#88c0d0' },
      { shade: 100, hex: '#dcf1f5' }
    ],
    amber: [
      { shade: 900, hex: '#6b501f' },
      { shade: 400, hex: '#ebcb8b' },
      { shade: 100, hex: '#f6ecd4' }
    ],
    red: [
      { shade: 900, hex: '#5c2a30' },
      { shade: 400, hex: '#bf616a' },
      { shade: 100, hex: '#f2dadc' }
    ]
  },
  {
    id: 'dracula',
    name: 'Dracula',
    mode: 'dark',
    neutral: [
      { shade: 950, hex: '#21222c' },
      { shade: 900, hex: '#282a36' },
      { shade: 700, hex: '#44475a' },
      { shade: 400, hex: '#6272a4' },
      { shade: 100, hex: '#f8f8f2' },
      { shade: 50, hex: '#ffffff' }
    ],
    teal: [
      { shade: 900, hex: '#1f5259' },
      { shade: 400, hex: '#8be9fd' },
      { shade: 100, hex: '#dcf9ff' }
    ],
    amber: [
      { shade: 900, hex: '#6b4415' },
      { shade: 400, hex: '#ffb86c' },
      { shade: 100, hex: '#ffe9d4' }
    ],
    red: [
      { shade: 900, hex: '#5c1a1a' },
      { shade: 400, hex: '#ff5555' },
      { shade: 100, hex: '#ffd9d9' }
    ]
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    mode: 'dark',
    neutral: [
      { shade: 950, hex: '#00212b' },
      { shade: 900, hex: '#002b36' },
      { shade: 700, hex: '#586e75' },
      { shade: 400, hex: '#839496' },
      { shade: 100, hex: '#eee8d5' },
      { shade: 50, hex: '#fdf6e3' }
    ],
    teal: [
      { shade: 900, hex: '#164e4a' },
      { shade: 400, hex: '#2aa198' },
      { shade: 100, hex: '#d4f0ec' }
    ],
    amber: [
      { shade: 900, hex: '#7a5300' },
      { shade: 400, hex: '#b58900' },
      { shade: 100, hex: '#f5e6bf' }
    ],
    red: [
      { shade: 900, hex: '#5c1a13' },
      { shade: 400, hex: '#dc322f' },
      { shade: 100, hex: '#f9dcda' }
    ]
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    mode: 'light',
    neutral: [
      { shade: 950, hex: '#fdf6e3' },
      { shade: 900, hex: '#eee8d5' },
      { shade: 700, hex: '#93a1a1' },
      { shade: 400, hex: '#657b83' },
      { shade: 100, hex: '#073642' },
      { shade: 50, hex: '#002b36' }
    ],
    teal: [
      { shade: 900, hex: '#164e4a' },
      { shade: 400, hex: '#2aa198' },
      { shade: 100, hex: '#cdece7' }
    ],
    amber: [
      { shade: 900, hex: '#7a5300' },
      { shade: 400, hex: '#b58900' },
      { shade: 100, hex: '#f2e0ac' }
    ],
    red: [
      { shade: 900, hex: '#5c1a13' },
      { shade: 400, hex: '#dc322f' },
      { shade: 100, hex: '#f7d6d3' }
    ]
  }
];

export const DEFAULT_THEME_ID = 'default-dark';

export function findTheme(id: string): ThemeDefinition {
  return THEMES.find((theme) => theme.id === id) ?? THEMES.find((theme) => theme.id === DEFAULT_THEME_ID)!;
}
