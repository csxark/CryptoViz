"use client";

import { useEffect, useRef } from "react";

import {
  checkServiceWorkerCompatibility,
  registerServiceWorker,
  requestServiceWorkerUpdate,
  waitForControllerChange,
} from "@/lib/offline/serviceWorkerProtocol";

export default function ServiceWorkerIntegrity() {
  const reloadAttempted = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    let cancelled = false;

    const verifyWorker = async () => {
      try {
        const registration = await registerServiceWorker();
        if (!registration || cancelled) {
          return;
        }

        const result = await checkServiceWorkerCompatibility();
        if (cancelled || result.compatible || reloadAttempted.current) {
          return;
        }

        reloadAttempted.current = true;
        console.warn(
          "[CryptoViz] Service worker/client version mismatch.",
          result.version,
        );

        await registration.update();
        requestServiceWorkerUpdate(registration);
        await waitForControllerChange();

        if (!cancelled) {
          window.location.reload();
        }
      } catch (error) {
        console.warn("[CryptoViz] Unable to verify service worker.", error);
      }
    };

    void verifyWorker();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}