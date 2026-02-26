"use client";

import { useEffect, useRef } from "react";

export function useVisibilityPolling(
  task: () => Promise<void> | void,
  intervalMs: number,
  runImmediately = true
) {
  const taskRef = useRef(task);

  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      if (canceled) return;
      if (document.visibilityState === "hidden") return;
      await taskRef.current();
    };

    if (runImmediately) {
      void run();
    }

    const interval = setInterval(() => {
      void run();
    }, intervalMs);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void run();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      canceled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, runImmediately]);
}
