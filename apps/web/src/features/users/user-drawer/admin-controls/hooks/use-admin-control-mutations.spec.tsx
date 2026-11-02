import { AppProviders, createQueryClient } from '@/app/providers';
import { server } from '@/mocks/node';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { useAdminControlMutations } from './use-admin-control-mutations';

const renderMutations = () => {
  const queryClient = createQueryClient();

  return renderHook(() => useAdminControlMutations('user-aaaa1111'), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <AppProviders queryClient={queryClient}>{children}</AppProviders>
    ),
  });
};

it("names the user in a failed change's message", async () => {
  server.use(
    http.post(
      '/api/admin/users/:id/reset',
      () => new HttpResponse(null, { status: 503 }),
    ),
  );
  const { result } = renderMutations();

  act(() => result.current.reset.mutate('user-aaaa1111'));

  await waitFor(() =>
    expect(result.current.failureMessages).toEqual([
      "Couldn't reset user-aaaa1111's limit.",
    ]),
  );
});

it("clears the other changes' failures before a new change starts", async () => {
  server.use(
    http.post(
      '/api/admin/users/:id/reset',
      () => new HttpResponse(null, { status: 503 }),
    ),
  );
  const { result } = renderMutations();

  act(() => result.current.reset.mutate('user-aaaa1111'));
  await waitFor(() => expect(result.current.failureMessages).toHaveLength(1));

  act(() => {
    expect(result.current.clearOtherFailures(result.current.unlock)).toBe(4);
  });

  await waitFor(() => expect(result.current.failureMessages).toEqual([]));
});
