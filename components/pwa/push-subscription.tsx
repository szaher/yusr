"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";

const DISMISS_KEY = "push-prompt-dismissed";
const DISMISS_DAYS = 7;

export function PushSubscriptionBanner({
  vapidPublicKey,
  translations,
}: {
  vapidPublicKey: string;
  translations: {
    enableNotifications: string;
    notificationPrompt: string;
    dismiss: string;
  };
}) {
  const [show, setShow] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return;
    if (Notification.permission === "granted") {
      setSubscribed(true);
      return;
    }

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = new Date(dismissed);
      const daysSince = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return;
    }

    setShow(true);
  }, []);

  async function handleEnable() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setShow(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      setSubscribed(true);
      setShow(false);
    } catch {
      setShow(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setShow(false);
  }

  if (!show || subscribed) return null;

  return (
    <div className="fixed bottom-20 start-4 end-4 z-50 sm:bottom-4 sm:start-auto sm:end-4 sm:max-w-sm">
      <div className="flex items-start gap-3 rounded-lg border bg-background p-4 shadow-lg">
        <Bell className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
        <div className="flex-1">
          <p className="text-sm font-medium">{translations.enableNotifications}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {translations.notificationPrompt}
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleEnable}>
              {translations.enableNotifications}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              {translations.dismiss}
            </Button>
          </div>
        </div>
        <button onClick={handleDismiss} className="shrink-0">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
