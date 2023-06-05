import webpush from "web-push";

export const notifyFileRequest = async (
  pushSub: webpush.PushSubscription,
  payLoad: string
) => {
  return webpush.sendNotification(pushSub, payLoad);
};
