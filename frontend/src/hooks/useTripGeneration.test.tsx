import { act, renderHook } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it, vi } from 'vitest';

const post = vi.fn();
vi.mock('@/lib/apiClient', () => ({ apiClient: { post: (...a: unknown[]) => post(...a) } }));
import { useTripGeneration } from './useTripGeneration';

const failWith = (status: number, data: unknown) =>
  new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', undefined, undefined, {
    status, data, statusText: '', headers: {}, config: { headers: new AxiosHeaders() },
  });

describe('useTripGeneration errors', () => {
  it('shows the server message instead of the raw status line', async () => {
    post.mockRejectedValueOnce(failWith(401, { error: 'Authentication required' }));
    const { result } = renderHook(() => useTripGeneration());
    await act(() => result.current.generateTrip({} as never));
    expect(result.current.error).toBe('Authentication required');
  });

  it('falls back to a plain sentence when the server says nothing', async () => {
    post.mockRejectedValueOnce(failWith(418, ''));
    const { result } = renderHook(() => useTripGeneration());
    await act(() => result.current.generateTrip({} as never));
    expect(result.current.error).toBe('Your trip could not be planned. Please try again.');
  });
});
