import { Box, ButtonBase } from '@mui/material';
import { keyframes, useTheme, type Palette } from '@mui/material/styles';
import { useId, type ReactNode } from 'react';

/** OK has five stages (one per 20 requests used), then Warning (90% used) and Exceeded (100%). `mark` is the still brand mark. */
export type CrumbMood =
  | 'fresh'
  | 'warming-up'
  | 'excited'
  | 'focused'
  | 'tired'
  | 'warning'
  | 'exceeded'
  | 'mark';

type Colors = Palette['crumb'] & { white: string };

const bob = keyframes`0%, 100% { transform: translateY(0) } 50% { transform: translateY(-3%) }`;
// Short bursts of jitter, then 2.8s still.
const jitter = keyframes`0%, 30%, 100% { transform: rotate(0deg) } 6% { transform: rotate(-3deg) } 12% { transform: rotate(3deg) } 18% { transform: rotate(-2deg) } 24% { transform: rotate(2deg) }`;
const slump = keyframes`0%, 100% { transform: translateY(2%) rotate(-5deg) } 50% { transform: translateY(3%) rotate(-7deg) }`;

const calm = 'cubic-bezier(0.4, 0, 0.2, 1) infinite';
const okBob = `${bob} 3s ${calm}`;

const Cheeks = ({
  c,
  y = 122,
  x = 60,
  opacity = 0.7,
  big = true,
}: {
  c: Colors;
  y?: number;
  x?: number;
  opacity?: number;
  big?: boolean;
}) => (
  <g fill={c.cheek} opacity={opacity}>
    <ellipse cx={x} cy={y} rx={big ? 12 : 11} ry={big ? 7 : 6} />
    <ellipse cx={200 - x} cy={y} rx={big ? 12 : 11} ry={big ? 7 : 6} />
  </g>
);

const Strokes = ({
  c,
  width,
  d,
}: {
  c: Colors;
  width: number;
  d: string[];
}) => (
  <g fill="none" stroke={c.face} strokeWidth={width} strokeLinecap="round">
    {d.map((path) => (
      <path key={path} d={path} />
    ))}
  </g>
);

/** `shine` is the white highlight: its offset from each eye's centre, and its radius. */
const Eyes = ({
  c,
  y,
  r,
  shine,
}: {
  c: Colors;
  y: number;
  r: number;
  shine?: [dx: number, dy: number, r: number];
}) => (
  <g>
    <circle cx={78} cy={y} r={r} fill={c.face} />
    <circle cx={122} cy={y} r={r} fill={c.face} />
    {shine && (
      <g fill={c.white}>
        <circle cx={78 + shine[0]} cy={y + shine[1]} r={shine[2]} />
        <circle cx={122 + shine[0]} cy={y + shine[1]} r={shine[2]} />
      </g>
    )}
  </g>
);

const smile = [
  'M68 100 Q78 88 88 100',
  'M112 100 Q122 88 132 100',
  'M82 122 Q100 142 118 122',
];

const moods: Record<
  CrumbMood,
  {
    label: string;
    chips: number;
    animation?: string;
    face: (c: Colors) => ReactNode;
  }
> = {
  fresh: {
    label: 'Crumb, OK: fresh',
    chips: 5,
    animation: okBob,
    face: (c) => (
      <>
        <Cheeks c={c} opacity={0.55} big={false} />
        <Strokes c={c} width={7} d={smile} />
      </>
    ),
  },
  'warming-up': {
    label: 'Crumb, OK: warming up',
    chips: 4,
    animation: okBob,
    face: (c) => (
      <>
        <Cheeks c={c} />
        <Eyes c={c} y={98} r={8} shine={[2.5, -3, 3]} />
        <Strokes c={c} width={7} d={['M78 120 Q100 146 122 120']} />
      </>
    ),
  },
  excited: {
    label: 'Crumb, OK: excited',
    chips: 3,
    animation: okBob,
    face: (c) => (
      <>
        <Cheeks c={c} x={58} y={118} />
        <Strokes
          c={c}
          width={7}
          d={['M66 100 Q78 84 90 100', 'M110 100 Q122 84 134 100']}
        />
        <path
          d="M78 118 Q100 154 122 118 Z"
          fill={c.face}
          stroke={c.face}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <ellipse cx={100} cy={134} rx={9} ry={5} fill={c.cheek} />
      </>
    ),
  },
  focused: {
    label: 'Crumb, OK: focused',
    chips: 2,
    animation: okBob,
    face: (c) => (
      <>
        <Eyes c={c} y={100} r={7} />
        <Strokes
          c={c}
          width={7}
          d={['M64 82 L88 89', 'M136 82 L112 89', 'M86 126 Q102 136 116 122']}
        />
      </>
    ),
  },
  tired: {
    label: 'Crumb, OK: tired',
    chips: 1,
    animation: `${bob} 4.5s ${calm}`,
    face: (c) => (
      <>
        <path d="M68 100 A10 10 0 0 0 88 100 Z" fill={c.face} />
        <path d="M112 100 A10 10 0 0 0 132 100 Z" fill={c.face} />
        <Strokes
          c={c}
          width={6}
          d={['M64 99 L92 99', 'M108 99 L136 99', 'M90 131 Q100 127 110 131']}
        />
      </>
    ),
  },
  warning: {
    label: 'Crumb, Warning: nervous, one chip left',
    chips: 1,
    animation: `${jitter} 4s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
    face: (c) => (
      <>
        <Eyes c={c} y={102} r={10} shine={[3, -4, 3.5]} />
        <Strokes
          c={c}
          width={6}
          d={[
            'M64 84 L88 76',
            'M136 84 L112 76',
            'M80 132 Q90 124 100 132 Q110 140 120 132',
          ]}
        />
        <path d="M158 64 Q169 82 158 90 Q147 82 158 64 Z" fill={c.sweat} />
      </>
    ),
  },
  exceeded: {
    label: 'Crumb, Exceeded: bitten, no chips left',
    chips: 0,
    animation: `${slump} 4s ${calm}`,
    face: (c) => (
      <>
        <Strokes
          c={c}
          width={7}
          d={[
            'M68 92 L86 110 M86 92 L68 110',
            'M114 92 L132 110 M132 92 L114 110',
          ]}
        />
        <ellipse cx={100} cy={136} rx={9} ry={8} fill={c.face} />
        <g fill={c.crumbs}>
          <rect x={166} y={96} width={9} height={9} rx={2} />
          <rect x={180} y={114} width={6} height={6} rx={1.5} />
          <rect x={160} y={122} width={5} height={5} rx={1} />
        </g>
      </>
    ),
  },
  mark: {
    label: '',
    chips: 5,
    face: (c) => <Strokes c={c} width={10} d={smile} />,
  },
};

const chips = [
  [56, 66, 9, 8],
  [146, 60, 8, 7],
  [40, 122, 7, 8],
  [162, 128, 9, 8],
  [120, 164, 8, 7],
];

type CrumbProps = {
  mood: CrumbMood;
  /** Rendered width and height in px (see `sizes` in the theme). */
  size: number;
  /** Makes Crumb a real button, named by his mood. */
  onClick?: () => void;
};

/** Crumb the cookie, whose face and chips track the user's allowance. Still when the user prefers reduced motion. */
export const Crumb = ({ mood, size, onClick }: CrumbProps) => {
  const { crumb, common } = useTheme().palette;
  const c = { ...crumb, white: common.white };
  const biteId = useId();
  const { label, chips: chipCount, animation, face } = moods[mood];
  const bitten = mood === 'exceeded';

  const svg = (
    <Box
      component="svg"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      {...(label
        ? { role: 'img', 'aria-label': label }
        : { 'aria-hidden': true })}
      sx={{
        display: 'block',
        overflow: 'visible',
        transformOrigin: '50% 90%',
        animation,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      {bitten && (
        // A mask is luminance: white keeps the cookie, black cuts the bite.
        <defs>
          <mask id={biteId}>
            <rect width={200} height={200} fill={common.white} />
            <circle cx={178} cy={42} r={26} fill={common.black} />
            <circle cx={150} cy={20} r={18} fill={common.black} />
            <circle cx={192} cy={78} r={18} fill={common.black} />
          </mask>
        </defs>
      )}
      <g mask={bitten ? `url(#${biteId})` : undefined}>
        <circle cx={100} cy={106} r={86} fill={c.crust} />
        <circle
          cx={100}
          cy={100}
          r={86}
          fill={bitten ? c.doughBitten : c.dough}
        />
      </g>
      {!bitten && mood !== 'mark' && (
        <path
          d="M44 66 A64 64 0 0 1 92 36"
          fill="none"
          stroke={c.highlight}
          strokeWidth={8}
          strokeLinecap="round"
        />
      )}
      <g fill={c.chip}>
        {chips.slice(0, chipCount).map(([cx, cy, rx, ry]) => (
          <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} />
        ))}
      </g>
      {face(c)}
    </Box>
  );

  if (!onClick) return svg;

  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        borderRadius: '50%',
        '&.Mui-focusVisible': {
          outline: 2,
          outlineColor: 'primary.main',
          outlineOffset: 4,
        },
      }}
    >
      {svg}
    </ButtonBase>
  );
};
