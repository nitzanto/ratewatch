import { sizes } from '@/libs/theme/sizes';
import { Box } from '@mui/material';
import type { ElementType } from 'react';
import { Crumb } from './crumb';

/** The Crumb mark and the product name, on navy. Pass `component` and `to` to make it a link. */
export const BrandMark = <C extends ElementType = 'div'>({
  component,
  ...props
}: { component?: C } & Omit<React.ComponentProps<C>, 'children'>) => (
  <Box
    component={component ?? 'div'}
    {...props}
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      color: 'inherit',
      textDecoration: 'none',
      typography: 'h6',
    }}
  >
    <Crumb mood="mark" size={sizes.crumbMark} />
    ratewatch
  </Box>
);
