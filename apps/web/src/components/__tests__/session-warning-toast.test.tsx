/**
 * Tests for SessionWarningToast.
 *
 * Behavior under test:
 * - Countdown starts from `expiresInSeconds` prop.
 * - Each second the countdown is re-anchored to the live access token's exp
 *   claim via `sessionManager.getRemainingSeconds()` (previously the toast
 *   counted down from a stale prop that could go out of sync after a
 *   background refresh).
 * - The progress bar denominator (span) grows when a refresh extends the
 *   token, so the bar never exceeds 100%.
 * - When the token is already expired (`getRemainingSeconds() === 0`), the
 *   toast dismisses instead of lingering with a wrong countdown.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { SessionWarningToast } from '@/components/session-warning-toast';
import { sessionManager } from '@/lib/session-manager';
import { proactivelyRefresh } from '@/lib/api-client';

const dismissToast = vi.fn();

vi.mock('@/components/ui/toast', () => ({
  useDismissToast: () => dismissToast,
}));

vi.mock('@/lib/api-client', () => ({
  proactivelyRefresh: vi.fn(),
}));

const mockGetRemaining = vi.fn();
const mockProactivelyRefresh = vi.mocked(proactivelyRefresh);

describe('SessionWarningToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Spies are re-applied per test: afterEach's restoreAllMocks() would
    // otherwise revert to the real implementation (which touches localStorage).
    vi.spyOn(sessionManager, 'getRemainingSeconds').mockImplementation(mockGetRemaining);
    vi.spyOn(sessionManager, 'scheduleExpiryWarning').mockImplementation(() => {});
    // Default: a live token with 120s remaining.
    mockGetRemaining.mockReturnValue(120);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the countdown from the expiresInSeconds prop', () => {
    render(<SessionWarningToast expiresInSeconds={120} toastId="toast-1" />);
    expect(screen.getByText('2:00')).toBeInTheDocument();
  });

  it('renders "Perpanjang Sesi" button and hint text', () => {
    render(<SessionWarningToast expiresInSeconds={120} toastId="toast-1" />);
    expect(screen.getByRole('button', { name: 'Perpanjang Sesi' })).toBeInTheDocument();
    expect(screen.getByText(/Klik "Perpanjang Sesi"/)).toBeInTheDocument();
  });

  it('re-anchors the countdown to the live token expiry on each tick', () => {
    vi.useFakeTimers();
    mockGetRemaining.mockReturnValue(90);

    render(<SessionWarningToast expiresInSeconds={120} toastId="toast-1" />);
    expect(screen.getByText('2:00')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('1:30')).toBeInTheDocument();
  });

  it('dismisses when the token is already expired', () => {
    vi.useFakeTimers();
    mockGetRemaining.mockReturnValue(0);

    render(<SessionWarningToast expiresInSeconds={120} toastId="toast-1" />);
    expect(dismissToast).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(dismissToast).toHaveBeenCalledWith('toast-1');
  });

  it('progress bar fills 100% at the start of the warning window', () => {
    render(<SessionWarningToast expiresInSeconds={120} toastId="toast-1" />);
    const bar = screen.getByRole('progressbar');
    const fill = screen.getByTestId('session-progress-fill');
    expect(bar).toHaveAttribute('aria-valuemax', '120');
    expect(fill).toHaveStyle({ width: '100%' });
  });

  it('progress bar shrinks as the token counts down', () => {
    vi.useFakeTimers();
    mockGetRemaining.mockReturnValue(60);

    render(<SessionWarningToast expiresInSeconds={120} toastId="toast-1" />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // remaining=60 of span=120 → exactly half.
    const fill = screen.getByTestId('session-progress-fill');
    expect(fill).toHaveStyle({ width: '50%' });
  });

  it('grows the span when a refresh extends the token, so the bar never exceeds 100%', () => {
    vi.useFakeTimers();
    mockGetRemaining.mockReturnValue(180);

    render(<SessionWarningToast expiresInSeconds={120} toastId="toast-1" />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // The refreshed token lives 180s; the countdown jumps to that value and
    // the span grows with it — the bar resets to 100%, never beyond.
    expect(screen.getByText('3:00')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar');
    const fill = screen.getByTestId('session-progress-fill');
    expect(bar).toHaveAttribute('aria-valuemax', '180');
    expect(fill).toHaveStyle({ width: '100%' });
  });

  it('schedules a new warning and dismisses when "Perpanjang Sesi" succeeds', async () => {
    mockProactivelyRefresh.mockResolvedValue('new-token');

    render(<SessionWarningToast expiresInSeconds={120} toastId="toast-1" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Perpanjang Sesi' }));
    });

    expect(sessionManager.scheduleExpiryWarning).toHaveBeenCalledWith('new-token');
    expect(dismissToast).toHaveBeenCalledWith('toast-1');
  });

  it('dismisses without scheduling when "Perpanjang Sesi" fails', async () => {
    mockProactivelyRefresh.mockRejectedValue(new Error('network'));

    render(<SessionWarningToast expiresInSeconds={120} toastId="toast-1" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Perpanjang Sesi' }));
    });

    expect(sessionManager.scheduleExpiryWarning).not.toHaveBeenCalled();
    expect(dismissToast).toHaveBeenCalledWith('toast-1');
  });
});