import {
  ExceededIcon,
  OkIcon,
  PausedIcon,
  WarningIcon,
} from '@/libs/theme/status-icons';
import type { UserStatus } from '@ratewatch/contracts';
import { Chip } from '@mui/material';

const statusStyles = {
  ok: { label: 'OK', color: 'success', Icon: OkIcon },
  warning: { label: 'Warning', color: 'warning', Icon: WarningIcon },
  exceeded: { label: 'Exceeded', color: 'error', Icon: ExceededIcon },
  paused: { label: 'Paused', color: 'default', Icon: PausedIcon },
} as const;

/** A rate-limit status as an icon and a word, never colour alone. */
export const StatusChip = ({ status }: { status: UserStatus }) => {
  const { label, color, Icon } = statusStyles[status];
  return <Chip variant="status" color={color} icon={<Icon />} label={label} />;
};
