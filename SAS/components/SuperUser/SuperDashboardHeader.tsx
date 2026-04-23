'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, X } from 'lucide-react';
import '@/styles/SuperStyles/SuperDashboardHeader.css';

type Props = {
  onDateRangeChange?: (range: { from: string; to: string }) => void;
};

function fmtRange(from: string, to: string) {
  if (!from && !to) return 'Select period';
  if (from && !to) return `From ${from}`;
  if (!from && to) return `Until ${to}`;
  return `${from} - ${to}`;
}

export default function SuperDashboardHeader({ onDateRangeChange }: Props) {
  const [open, setOpen] = useState(false);

  const [from, setFrom] = useState('2023-10-24');
  const [to, setTo] = useState('2023-10-30');

  const [appliedFrom, setAppliedFrom] = useState('2023-10-24');
  const [appliedTo, setAppliedTo] = useState('2023-10-30');

  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    if (from && to && to < from) setTo(from);
  }, [from, to]);

  const label = useMemo(() => fmtRange(appliedFrom, appliedTo), [appliedFrom, appliedTo]);

  const apply = () => {
    setAppliedFrom(from);
    setAppliedTo(to);
    setOpen(false);
    onDateRangeChange?.({ from, to });
  };

  const clear = () => {
    setFrom('');
    setTo('');
    setAppliedFrom('');
    setAppliedTo('');
    setOpen(false);
    onDateRangeChange?.({ from: '', to: '' });
  };

  return (
    <div className="super-header">
      <div>
        <h1 className="super-header__title">Super User Dashboard</h1>
      </div>

      <div className="super-header__dateWrap" ref={wrapRef}>
        <button
          className="super-header__dateBtn"
          type="button"
          onClick={() => setOpen((p) => !p)}
        >
          <Calendar className="super-header__dateIcon" />
          <span>{label}</span>
        </button>

        {open && (
          <div className="super-header__datePop">
            <div className="super-header__datePopTop">
              <div className="super-header__datePopTitle">Select period</div>

              <button
                className="super-header__datePopClose"
                type="button"
                onClick={() => setOpen(false)}
              >
                <X className="super-header__datePopCloseIcon" />
              </button>
            </div>

            <div className="super-header__dateGrid">
              <div className="super-header__dateField">
                <label>From</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>

              <div className="super-header__dateField">
                <label>To</label>
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>

            <div className="super-header__dateActions">
              <button className="super-header__dateClear" type="button" onClick={clear}>
                Clear
              </button>
              <button className="super-header__dateApply" type="button" onClick={apply}>
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
