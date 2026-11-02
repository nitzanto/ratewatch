import { userRow } from '@/mocks/data/users';
import { act, renderHook } from '@testing-library/react';
import { useRowSelection } from './use-row-selection';

const [first, second, third] = ['user-a', 'user-b', 'user-c'].map((userId) =>
  userRow(userId, 0, 0),
);

it('counts only the ticked users still on screen, and keeps the others for when they come back', () => {
  const { result, rerender } = renderHook(({ rows }) => useRowSelection(rows), {
    initialProps: { rows: [first, second] },
  });

  act(() => result.current.select(['user-a', 'user-b']));
  rerender({ rows: [second, third] });

  expect(result.current.selectedOnScreen).toEqual(['user-b']);

  rerender({ rows: [first, second] });

  expect(result.current.selectedOnScreen).toEqual(['user-a', 'user-b']);
});

it('clears the selection', () => {
  const { result } = renderHook(() => useRowSelection([first]));

  act(() => result.current.select(['user-a']));
  act(() => result.current.clearSelection());

  expect(result.current.selectedOnScreen).toEqual([]);
});
