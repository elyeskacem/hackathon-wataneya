/** Feature flags, read at build time from VITE_* variables (see .env.example). */
export const config = {
  showOmKalthoumFigure: import.meta.env.VITE_SHOW_OM_KALTHOUM_FIGURE === 'true',
  showUnverifiedYears: import.meta.env.VITE_SHOW_UNVERIFIED_YEARS === 'true',
  guideEndpoint: (import.meta.env.VITE_GUIDE_ENDPOINT as string | undefined) || undefined,
};
