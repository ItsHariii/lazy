import { supabase } from "./db";

export type NotificationPreferences = {
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  weekly_digest_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
};

export type NotificationSettings = {
  preferences: NotificationPreferences;
  pushSubscriptionCount: number;
  pushPermission: NotificationPermission | "unsupported" | "unknown";
  pushConfigured: boolean;
  emailConfigured: boolean;
  publicKey: string | null;
  pushSupported: boolean;
};

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const data = await apiJson<NotificationSettings>("/api/notifications/preferences");
  return withLocalSupport(data);
}

export async function updateNotificationPreferences(
  patch: Partial<NotificationPreferences>,
): Promise<NotificationSettings> {
  await apiJson("/api/notifications/preferences", {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  return getNotificationSettings();
}

export async function enablePushNotifications(): Promise<NotificationSettings> {
  const settings = await getNotificationSettings();
  if (!settings.pushConfigured || !settings.publicKey) {
    throw new Error("Web Push is not configured yet.");
  }
  if (!settings.pushSupported) {
    throw new Error("This browser does not support web push notifications.");
  }

  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  const ready = await navigator.serviceWorker.ready;
  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const existing = await ready.pushManager.getSubscription();
  const subscription =
    existing ||
    await ready.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(settings.publicKey),
    });

  await apiJson("/api/notifications/subscribe", {
    method: "POST",
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent,
    }),
  });

  return getNotificationSettings();
}

export async function sendTestNotification(): Promise<{ ok: boolean; sent: number; attempted: number }> {
  return apiJson<{ ok: boolean; sent: number; attempted: number }>("/api/notifications/test", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function disablePushNotifications(): Promise<NotificationSettings> {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await apiJson("/api/notifications/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
    }
  }

  return getNotificationSettings();
}

async function apiJson<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body?.error === "string" ? body.error : `HTTP ${response.status}`);
  }
  return body as T;
}

async function getAccessToken() {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in before changing notification settings.");
  return token;
}

function withLocalSupport(settings: NotificationSettings): NotificationSettings {
  const pushSupported =
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;
  return {
    ...settings,
    pushSupported,
    pushPermission: pushSupported ? Notification.permission : "unsupported",
  };
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}
