import { get, writable } from "svelte/store";
import { browser } from "$app/environment";
import { userParams } from "$lib/UI";

export const codehostname = writable("");

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

interface NotificationAction {
  action: string;
  title: string;
}

export interface INotification {
  actions?: NotificationAction[];
  title: string;
  body?: string;
  data?: any;
  tag: string;
}
export const notifications = writable<INotification[]>([]);

export const addNotification = (
  notification: PartialBy<INotification, "tag">
) => {
  console.log('Adding notification', notification.tag)
  // replace notifications with the same tag
  if ("tag" in notification && notification.tag)
    deleteNotification(notification.tag);
  notifications.update((notifications) => {
    if (!("tag" in notification))
      notification.tag = Math.random().toString(36).substring(7);
    notifications.push(notification as INotification);
    return notifications;
  });
};

export const deleteNotification = (tag: string) => {
  console.log('deleting notification', tag)
  notifications.update((notifications) => 
    notifications.filter((n) => n.tag != tag)
  );
};

export const profaneUsername = writable<{ loading: boolean; profane: boolean }>(
  {
    loading: false,
    profane: false,
  }
);

export function updateIsProfaneUsername() {
  if (!browser || !get(userParams).displayName) return;
  profaneUsername.set({ loading: true, profane: get(profaneUsername).profane });
  fetch("/api/checkIsUsernameProfane", {
    method: "POST",
    body: JSON.stringify({
      username: get(userParams).displayName,
    }),
  })
    .then((res) => res.json())
    .then((json: any) => {
      profaneUsername.set({
        loading: get(profaneUsername).loading,
        profane: json.isProfane,
      });
      profaneUsername.set({
        loading: false,
        profane: get(profaneUsername).profane,
      });
    })
    .catch((e) => {
      console.error(e);
      profaneUsername.set({ loading: false, profane: false });
    });
}
