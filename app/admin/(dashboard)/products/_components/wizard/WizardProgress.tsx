'use client';

import { FiCheck } from 'react-icons/fi';

interface Props {
  steps: string[];
  current: number;
  onStepClick: (index: number) => void;
}

export default function WizardProgress({ steps, current, onStepClick }: Props) {
  return (
    <div className="flex items-center justify-center gap-0 overflow-x-auto py-1">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <button
              type="button"
              onClick={() => { if (done) onStepClick(i); }}
              disabled={!done}
              className={[
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                active ? 'text-blue-600' : done ? 'text-green-600 hover:bg-green-50 cursor-pointer' : 'text-gray-400 cursor-default',
              ].join(' ')}
            >
              <div
                className={[
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all',
                  done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-500',
                ].join(' ')}
              >
                {done ? <FiCheck className="w-3 h-3" /> : <span>{i + 1}</span>}
              </div>
              <span className="hidden sm:block">{label}</span>
            </button>

            {i < steps.length - 1 && (
              <div className={['h-px w-6 mx-1 flex-shrink-0 transition-all', done ? 'bg-green-400' : 'bg-gray-200'].join(' ')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
