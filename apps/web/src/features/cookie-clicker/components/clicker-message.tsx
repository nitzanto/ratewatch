import { sizes } from '@/libs/theme/sizes';
import { Alert, AlertTitle, Box, Typography } from '@mui/material';
import type { ClickerNote } from '../clicker-view';
import { useExpired } from '../hooks/use-expired';

/** One note per OK stage Crumb enters, as he drops a chip. */
const stageNotes: Record<number, string> = {
  1: 'Crumb dropped his first chip and is warming up. He loses one every 20 requests.',
  2: 'Three chips left, and Crumb is getting excited.',
  3: 'Two chips left. Crumb is focused now.',
  4: 'Last chip. Crumb is getting tired, so pace yourself.',
};

/** Notes that show for a moment, then give way to the hint. */
const briefNoteMs: Partial<Record<ClickerNote['kind'], number>> = {
  'welcome-back': 5000,
  stage: 4000,
};

const ChipDot = () => (
  <Box
    sx={{
      width: sizes.noteChipWidth,
      height: sizes.noteChipHeight,
      borderRadius: '50%',
      bgcolor: 'crumb.chip',
      alignSelf: 'center',
    }}
  />
);

const Note = ({ note }: { note: ClickerNote }) => {
  switch (note.kind) {
    case 'refused':
      return (
        <Alert severity="error">
          <AlertTitle>You've hit your limit</AlertTitle>
          {note.message}
          {note.waiting && ' Crumb is growing his bite back while you wait.'}
        </Alert>
      );
    case 'failed':
      return (
        <Alert severity="error">
          Crumb's click didn't go through. Try again.
        </Alert>
      );
    case 'welcome-back':
      return (
        <Alert severity="success" role="status">
          <strong>Welcome back.</strong> Your limit has reset, so you can click
          again.
        </Alert>
      );
    case 'almost-out':
      return (
        <Alert severity="warning" role="note">
          Almost out: {note.requestsLeft}{' '}
          {note.requestsLeft === 1 ? 'request' : 'requests'} left this hour.
        </Alert>
      );
    case 'stage':
      return (
        <Alert severity="info" role="status" icon={<ChipDot />}>
          {stageNotes[note.stage]}
        </Alert>
      );
    case 'last-request':
      return (
        <Typography align="center">
          That was your last request this hour. The next click will be refused.
        </Typography>
      );
    case 'hint':
      return (
        <Typography align="center" sx={{ color: 'text.secondary' }}>
          Each click spends one request. Crumb drops a chocolate chip every 20
          and gets nervous with 10 left.
        </Typography>
      );
  }
};

const BriefNote = ({ note, ms }: { note: ClickerNote; ms: number }) =>
  useExpired(ms) ? <Note note={{ kind: 'hint' }} /> : <Note note={note} />;

/** A fixed-height slot under the usage bar, so nothing moves under the pointer when the message changes. */
export const ClickerMessage = ({ note }: { note: ClickerNote }) => {
  const ms = briefNoteMs[note.kind];
  return (
    <Box
      sx={{
        alignSelf: 'stretch',
        minHeight: sizes.clickerMessageSlot,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      {ms ? (
        // Keyed by the note, so each new stage restarts its timer.
        <BriefNote
          key={note.kind === 'stage' ? `stage-${note.stage}` : note.kind}
          note={note}
          ms={ms}
        />
      ) : (
        <Note note={note} />
      )}
    </Box>
  );
};
