// Notification utility functions for PWA push notifications

export type NotificationPermission = "granted" | "denied" | "default";

/**
 * Check if notifications are supported in this browser
 */
export const areNotificationsSupported = (): boolean => {
  return "Notification" in window && "serviceWorker" in navigator;
};

/**
 * Get current notification permission status
 */
export const getNotificationPermission = (): NotificationPermission => {
  if (!areNotificationsSupported()) return "denied";
  return Notification.permission as NotificationPermission;
};

/**
 * Request notification permission from user
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!areNotificationsSupported()) {
    throw new Error("Notifications are not supported in this browser");
  }

  const permission = await Notification.requestPermission();
  return permission as NotificationPermission;
};

/**
 * Show a local notification
 */
export const showNotification = async (
  title: string,
  options?: {
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
    requireInteraction?: boolean;
    silent?: boolean;
  }
): Promise<void> => {
  if (!areNotificationsSupported()) {
    throw new Error("Notifications are not supported");
  }

  const permission = getNotificationPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission not granted");
  }

  // Get service worker registration
  const registration = await navigator.serviceWorker.ready;

  // Show notification through service worker for better compatibility
  await registration.showNotification(title, {
    icon: "/pwa-512x512.png",
    badge: "/pwa-512x512.png",
    ...options,
  });
};

/**
 * Schedule a notification for later (using setTimeout)
 * Note: This works while app is open. For background notifications, use push notifications with a backend.
 */
export const scheduleNotification = (
  title: string,
  delayMs: number,
  options?: Parameters<typeof showNotification>[1]
): number => {
  return window.setTimeout(() => {
    showNotification(title, options).catch(console.error);
  }, delayMs);
};

/**
 * Cancel a scheduled notification
 */
export const cancelScheduledNotification = (timerId: number): void => {
  window.clearTimeout(timerId);
};

/**
 * Notification templates for common use cases
 */
export const notificationTemplates = {
  readingReminder: (bookTitle?: string) => ({
    title: "📚 Time to read!",
    body: bookTitle 
      ? `Continue reading "${bookTitle}"`
      : "Don't forget your daily reading session",
    tag: "reading-reminder",
    requireInteraction: false,
  }),

  goalAchieved: (goalName: string) => ({
    title: "🎉 Goal achieved!",
    body: `Congratulations! You've reached your ${goalName} goal`,
    tag: "goal-achieved",
    requireInteraction: true,
  }),

  streakMilestone: (days: number) => ({
    title: "🔥 Reading streak!",
    body: `Amazing! You've read for ${days} days in a row`,
    tag: "streak-milestone",
    requireInteraction: true,
  }),

  bookCompleted: (bookTitle: string) => ({
    title: "✅ Book completed!",
    body: `You finished reading "${bookTitle}"`,
    tag: "book-completed",
    requireInteraction: true,
  }),
};
