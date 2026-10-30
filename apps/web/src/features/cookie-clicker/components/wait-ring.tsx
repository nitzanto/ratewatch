import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/** The teal ring around Crumb that fills as the wait passes, from 0 to 1. */
export const WaitRing = ({ filled }: { filled: number }) => {
  const { palette } = useTheme();

  return (
    <Box
      component="svg"
      aria-hidden
      viewBox="0 0 320 320"
      sx={{
        position: 'absolute',
        inset: 0,
        // Glides between the clock's one-second ticks.
        '& circle': { transition: 'stroke-dashoffset 1s linear' },
        '@media (prefers-reduced-motion: reduce)': {
          '& circle': { transition: 'none' },
        },
      }}
    >
      <g fill="none" strokeWidth={6}>
        <circle cx={160} cy={160} r={152} stroke={palette.border} />
        {/* `pathLength` makes the dash offset a 0–1 share of the circle. */}
        <circle
          cx={160}
          cy={160}
          r={152}
          stroke={palette.success.main}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - filled}
          transform="rotate(-90 160 160)"
        />
      </g>
    </Box>
  );
};
