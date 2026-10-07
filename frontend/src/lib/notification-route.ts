import type { Href } from 'expo-router';

/** Where tapping a notification (in the tray or in the inbox) should land. */
export function notificationRoute(type?: string | null, eventId?: string | null): Href {
  if (type === 'SWAP_REQUESTED' || type === 'SWAP_RESPONDED') return '/swaps' as Href;
  if (eventId) return `/events/${eventId}` as Href;
  return '/notifications' as Href;
}
