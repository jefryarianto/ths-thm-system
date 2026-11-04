import { Check, Circle } from 'lucide-react';

const STEPS = [
  'Memverifikasi kredensial',
  'Membuat sesi aman',
  'Mengalihkan ke dashboard',
] as const;

type StepState = 'done' | 'active' | 'pending';

function resolveState(index: number, doneCount: number, activeIndex: number): StepState {
  if (index < doneCount) return 'done';
  if (index === activeIndex) return 'active';
  return 'pending';
}

export function LoginSteps({ doneCount, activeIndex }: { doneCount: number; activeIndex: number }) {
  return (
    <ol
      data-testid="login-steps"
      aria-live="polite"
      className="animate-fade-in-up mt-4 space-y-2.5"
    >
      {STEPS.map((label, index) => {
        const state = resolveState(index, doneCount, activeIndex);
        return (
          <li key={label} data-state={state} className="flex items-center gap-2.5 text-sm">
            {state === 'done' && <Check className="h-4 w-4 text-success-600" aria-hidden="true" />}
            {state === 'active' && (
              <span className="login-step-active flex h-4 w-4 items-center justify-center rounded-full bg-primary/15">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
            )}
            {state === 'pending' && <Circle className="h-4 w-4 text-surface-300" aria-hidden="true" />}
            <span className={state === 'pending' ? 'text-surface-400' : 'font-medium text-text'}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function SuccessCheck({ className }: { className?: string }) {
  return (
    <svg
      className={className ? `success-check ${className}` : 'success-check'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
