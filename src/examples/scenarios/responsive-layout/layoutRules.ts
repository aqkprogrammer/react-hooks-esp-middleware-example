export type LayoutMode = 'sidebar' | 'tabs' | 'stacked';
export type LayoutSource = 'container' | 'viewport';

/** Container breakpoints (px of the component's own width). */
export const CONTAINER_BREAKPOINTS = { sidebar: 720, tabs: 460 } as const;

/** Viewport breakpoints, expressed as media queries for `useMediaQuery`. */
export const VIEWPORT_QUERIES = {
  sidebar: '(min-width: 1024px)',
  tabs: '(min-width: 640px)',
} as const;

export function modeForWidth(width: number): LayoutMode {
  if (width >= CONTAINER_BREAKPOINTS.sidebar) return 'sidebar';
  if (width >= CONTAINER_BREAKPOINTS.tabs) return 'tabs';
  return 'stacked';
}

export function modeForViewport(matches: { sidebar: boolean; tabs: boolean }): LayoutMode {
  if (matches.sidebar) return 'sidebar';
  if (matches.tabs) return 'tabs';
  return 'stacked';
}
