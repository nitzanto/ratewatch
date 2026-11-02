import { renderHook } from '@testing-library/react';
import { useChangeCount } from './use-change-count';

it('counts each new value, and not a re-render with the same one', () => {
  const first = { userId: 'user-a' };
  const { result, rerender } = renderHook(
    ({ value }) => useChangeCount(value),
    { initialProps: { value: first } },
  );

  expect(result.current).toBe(0);

  rerender({ value: first });
  expect(result.current).toBe(0);

  rerender({ value: { userId: 'user-a' } });
  expect(result.current).toBe(1);

  rerender({ value: { userId: 'user-a' } });
  expect(result.current).toBe(2);
});
