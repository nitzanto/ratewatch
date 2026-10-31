import { Crumb, type CrumbMood } from '@/components/ui/crumb';
import { sizes } from '@/libs/theme/sizes';
import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { useState, type ReactNode } from 'react';

// Two copies of the squash, alternated per click so each click restarts it. Emotion names keyframes by
// their content, so the second ends on `none` instead of `scale(1)` (the same thing) to get its own name.
const squash = keyframes`0% { transform: scale(1) } 35% { transform: scale(0.9, 0.84) } 70% { transform: scale(1.04, 1.02) } 100% { transform: scale(1) }`;
const squashAgain = keyframes`0% { transform: scale(1) } 35% { transform: scale(0.9, 0.84) } 70% { transform: scale(1.04, 1.02) } 100% { transform: none }`;
const floatUp = keyframes`0% { opacity: 0; transform: translateY(0) } 15% { opacity: 1 } 100% { opacity: 0; transform: translateY(-56px) }`;
const hop = keyframes`0% { transform: translateY(0) scale(0.92) } 40% { transform: translateY(-28px) scale(1.06) } 70% { transform: translateY(0) scale(1.04, 0.94) } 85% { transform: translateY(-6px) scale(1) } 100% { transform: translateY(0) scale(1) }`;

const stillWhenReduced = {
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
    transition: 'none',
  },
};

type CrumbStageProps = {
  mood: CrumbMood;
  onClick: () => void;
  disabled?: boolean;
  /** How much of the bite is still missing, from 1 to 0 (see `Crumb`). */
  bite?: number;
  /** Hops once on mount, when the user's limit has reset. */
  hopIn?: boolean;
  /** Drawn around Crumb, such as the wait ring. */
  around?: ReactNode;
};

/** Crumb on his grey disc, as the clicker's button: he squashes and floats a "−1" on every click. */
export const CrumbStage = ({
  mood,
  onClick,
  disabled,
  bite,
  hopIn,
  around,
}: CrumbStageProps) => {
  // Counts clicks so each one replays the squash and the "−1" float.
  const [presses, setPresses] = useState<number>(0);

  return (
    <Box
      sx={{
        position: 'relative',
        width: sizes.clickerStage,
        height: sizes.clickerStage,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 16,
          borderRadius: '50%',
          bgcolor: 'neutralFill',
        }}
      />
      {around}
      {presses > 0 && (
        // Keyed by the click count, so each click floats a fresh "−1".
        <Typography
          key={presses}
          aria-hidden
          sx={{
            position: 'absolute',
            top: 8,
            right: 44,
            typography: 'h5',
            fontWeight: 700,
            color: 'text.secondary',
            opacity: 0,
            animation: `${floatUp} 700ms cubic-bezier(0, 0, 0.2, 1) forwards`,
            ...stillWhenReduced,
          }}
        >
          −1
        </Typography>
      )}
      <Box
        sx={{
          transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': { transform: disabled ? undefined : 'scale(1.04)' },
          ...stillWhenReduced,
        }}
      >
        <Box
          sx={{
            transformOrigin: '50% 100%',
            animation: hopIn
              ? `${hop} 700ms cubic-bezier(0, 0, 0.2, 1)`
              : undefined,
            ...stillWhenReduced,
          }}
        >
          <Box
            sx={{
              animation:
                presses > 0
                  ? `${presses % 2 ? squash : squashAgain} 250ms cubic-bezier(0.4, 0, 0.2, 1)`
                  : undefined,
              ...stillWhenReduced,
            }}
          >
            <Crumb
              mood={mood}
              size={sizes.crumbClicker}
              bite={bite}
              disabled={disabled}
              // The request fires on click, never after the animation, and is never retried.
              onClick={() => {
                setPresses((n) => n + 1);
                onClick();
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
