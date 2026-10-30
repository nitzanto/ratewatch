/** Fixed sizes from `DESIGN.md`, in px. Spacing uses the theme's 8px grid (`theme.spacing`). */
export const sizes = {
  appBarHeight: 64,
  contentMaxWidth: 1240,
  crumbMark: 36,
  crumbClicker: 248,
  /** Crumb's stage on the clicker: the halo and the wait ring around him. */
  clickerStage: 320,
  clickerColumn: 880,
  usageBarWidth: 320,
  usageBarHeight: 8,
  /** Tall enough for a two-line banner, so nothing below Crumb jumps when the message changes. */
  clickerMessageSlot: 76,
  statusChipHeight: 28,
  /** The chocolate chip that marks a stage note: slightly wider than tall. */
  noteChipWidth: 18,
  noteChipHeight: 16,
  shellPillHeight: 32,
  statusDot: 8,
} as const;
