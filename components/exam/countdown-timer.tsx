"use client";

import { useEffect, useState, useCallback } from "react";

export function CountdownTimer({
  endTime,
  onExpire,
  timeRemainingLabel,
  timeExpiredLabel,
}: {
  endTime: Date;
  onExpire: () => void;
  timeRemainingLabel: string;
  timeExpiredLabel: string;
}) {
  const calcRemaining = useCallback(() => {
    return Math.max(0, Math.floor((endTime.getTime() - Date.now()) / 1000));
  }, [endTime]);

  const [remaining, setRemaining] = useState(calcRemaining);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const secs = calcRemaining();
      setRemaining(secs);
      if (secs <= 0) {
        clearInterval(interval);
        setExpired(true);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [calcRemaining, onExpire]);

  if (expired) {
    return (
      <div className="sticky top-0 z-50 bg-red-600 text-white text-center py-2 text-sm font-medium">
        {timeExpiredLabel}
      </div>
    );
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const colorClass =
    remaining <= 60
      ? "bg-red-600 text-white"
      : remaining <= 300
        ? "bg-amber-500 text-white"
        : "bg-blue-600 text-white";

  return (
    <div
      className={`sticky top-0 z-50 text-center py-2 text-sm font-medium ${colorClass}`}
    >
      {timeRemainingLabel}: {display}
    </div>
  );
}
