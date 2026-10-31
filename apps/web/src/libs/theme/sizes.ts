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
  filterChipHeight: 36,
  /** The users table's filter row; the selection toolbar takes the same height, so the table never moves. */
  filterRowHeight: 48,
  searchWidth: 260,
  /** The users table's scroll box: about seven rows under the header. */
  usersTableHeight: 560,
  /** The user drawer, from the right. */
  drawerWidth: 460,
  /** The user drawer's activity bars, the gap between them, and the legend's colour keys. */
  activityChartHeight: 72,
  activityBarGap: 1,
  legendKey: 10,
  /** The time column of the user drawer's recent requests. */
  recentTimeWidth: 84,
  /** The chocolate chip that marks a stage note: slightly wider than tall. */
  noteChipWidth: 18,
  noteChipHeight: 16,
  /** The summary cards' narrowest width in their auto-fit grid. */
  summaryCardMin: 220,
  /** The dashboard's two columns: the users table and the side column (status breakdown, top users), each one's flex basis. */
  mainColumnBasis: 640,
  sideColumnBasis: 300,
  /** The status breakdown's bar. */
  breakdownBarHeight: 12,
  /** A top user's rank column (their details indent past it, and the 8px gap), and their volume bar. */
  topUserRankWidth: 16,
  topUserBarHeight: 6,
  shellPillHeight: 32,
  statusDot: 8,
  signInForm: 380,
} as const;
