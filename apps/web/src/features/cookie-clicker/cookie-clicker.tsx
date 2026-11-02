import { useClick } from '@/api/click/use-click';
import { useEndWait } from '@/api/click/use-end-wait';
import { useRateLimit } from '@/api/click/use-rate-limit';
import { RateLimitedError } from '@/api/api-error';
import { Paper } from '@mui/material';
import { clickerView, type ClickerWait } from './utils/clicker-view';
import { useCountdown } from './hooks/use-countdown';
import { ClickerMessage } from './clicker-message';
import { Countdown } from './meters/countdown';
import { CrumbStage } from './stage/crumb-stage';
import { RequestsLeft } from './meters/requests-left';
import { UsageMeter } from './meters/usage-meter';
import { WaitRing } from './stage/wait-ring';

type WaitingProps = {
  wait: ClickerWait;
  onClick: () => void;
};

/** A 429 wait: the countdown, the filling ring and Crumb's bite growing back. Its clock runs only while it's on screen. */
const Waiting = ({ wait, onClick }: WaitingProps) => {
  const { retryAt, refusedAt, message } = wait;
  const now = useCountdown(retryAt, useEndWait());
  // How far through the wait, from 0 (just refused) to 1 (whole again).
  const healed = Math.min(
    1,
    Math.max(0, (now - refusedAt) / (retryAt - refusedAt)),
  );

  return (
    <>
      <CrumbStage
        mood={healed >= 0.5 ? 'resting' : 'exceeded'}
        bite={1 - healed}
        disabled
        onClick={onClick}
        around={<WaitRing filled={healed} />}
      />
      <Countdown now={now} retryAt={new Date(retryAt)} />
      <UsageMeter status="exceeded" left={0} />
      <ClickerMessage note={{ kind: 'refused', message, waiting: true }} />
    </>
  );
};

/** The clicker card: each click on Crumb is one request, and the count shown comes only from the API's `x-count`. */
export const CookieClicker = () => {
  const click = useClick();
  const view = clickerView(
    useRateLimit(),
    click.isError && !(click.error instanceof RateLimitedError),
    click.error instanceof RateLimitedError && click.error.reason === 'burst'
      ? click.error.message
      : undefined,
  );
  // Never retried: each attempt would spend another request.
  const onClick = () => click.mutate();

  return (
    <Paper
      variant="outlined"
      sx={{
        pt: 5,
        px: 3,
        pb: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
      }}
    >
      {view.phase === 'waiting' ? (
        <Waiting wait={view} onClick={onClick} />
      ) : (
        <>
          <CrumbStage
            mood={view.mood}
            onClick={onClick}
            hopIn={view.phase === 'back'}
          />
          <RequestsLeft
            left={view.left}
            unavailable={view.unavailable}
            reset={view.phase === 'back'}
          />
          <UsageMeter status={view.status} left={view.left} />
          <ClickerMessage note={view.note} />
        </>
      )}
    </Paper>
  );
};
