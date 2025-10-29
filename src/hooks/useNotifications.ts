import { useState, useEffect } from "react";
import {
  areNotificationsSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showNotification,
  type NotificationPermission,
} from "@/lib/notifications";

/**
 * Hook for managing notification permissions and state
 */
export const useNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const supported = areNotificationsSupported();
    setIsSupported(supported);

    if (supported) {
      // Get initial permission state
      setPermission(getNotificationPermission());

      // Listen for permission changes (not all browsers support this)
      const checkPermission = () => {
        setPermission(getNotificationPermission());
      };

      // Check periodically (fallback for browsers without permission change events)
      const interval = setInterval(checkPermission, 1000);

      return () => clearInterval(interval);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      throw new Error("Notifications are not supported in this browser");
    }

    setIsRequesting(true);
    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);
      return newPermission;
    } finally {
      setIsRequesting(false);
    }
  };

  const sendNotification = async (
    title: string,
    options?: Parameters<typeof showNotification>[1]
  ) => {
    if (permission !== "granted") {
      throw new Error("Notification permission not granted");
    }
    return showNotification(title, options);
  };

  return {
    isSupported,
    permission,
    isGranted: permission === "granted",
    isDenied: permission === "denied",
    isDefault: permission === "default",
    isRequesting,
    requestPermission,
    sendNotification,
  };
};
