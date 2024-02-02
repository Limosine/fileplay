import dayjs from "dayjs";
import EventEmitter from "events";
import { get, writable } from "svelte/store";
import { TRPCError } from "@trpc/server";

import { ONLINE_STATUS_TIMEOUT } from "$lib/lib/common";
import { getContacts } from "$lib/server/db";

import type { Authorized, Guest } from "./context";
import { filetransfers } from "./stores";

const store = writable<EventTransmitter>();

export const events = () => {
  let eventStore = get(store);
  if (eventStore === undefined) {
    eventStore = new EventTransmitter();
    store.set(eventStore);
    return eventStore;
  } else {
    return eventStore;
  }
};

class EventTransmitter {
  private connections: EventEmitter[];
  private guests: EventEmitter[];

  constructor() {
    this.connections = [];
    this.guests = [];
  }

  newGuestID() {
    let index = this.guests.length;
    if (index === 0) index = 1;

    this.guests[index] = new EventEmitter();
    return index;
  }

  getEventEmitter(did: number) {
    if (did < 0) {
      if (this.guests[Math.abs(did)] === undefined) {
        this.guests[Math.abs(did)] = new EventEmitter();
      }
      return this.guests[Math.abs(did)];
    } else {
      if (this.connections[did] === undefined) {
        this.connections[did] = new EventEmitter();
      }
      return this.connections[did];
    }
  }

  async shareAuthorized(
    ctx: Authorized,
    did: number,
    data: { type: "webrtc"; data?: any } | { type: "signal"; data: string },
  ) {
    if (did >= 0) {
      const contacts = await getContacts(ctx.database, ctx.user);
      if (contacts.success) {
        const result = contacts.message.find(
          (contact) =>
            contact.devices.find((device) => device.did === did) !== undefined,
        );
        if (result === undefined) throw new TRPCError({ code: "NOT_FOUND" });
        this.getEventEmitter(did).emit("webrtc-data", ctx.device, data);
      } else throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    } else {
      const ee = this.guests[Math.abs(did)];
      if (ee === undefined) throw new TRPCError({ code: "NOT_FOUND" });
      ee.emit("webrtc-data", ctx.device, data);
    }
  }

  async shareGuest(
    ctx: Guest,
    message: {
      did: number;
      guestTransfer: string;
      data: { type: "webrtc"; data?: any } | { type: "signal"; data: string };
    },
  ) {
    try {
      const device = await ctx.database
        .selectFrom("devices")
        .select(["is_online"])
        .where((eb) =>
          eb("did", "=", message.did)
            .and("is_online", "=", 1)
            .and("last_seen_at", ">", dayjs().unix() - ONLINE_STATUS_TIMEOUT),
        )
        .executeTakeFirst();

      const transfer = get(filetransfers).find(
        (transfer) =>
          transfer.id == message.guestTransfer && transfer.did === message.did,
      );

      if (device !== undefined && transfer !== undefined) {
        this.getEventEmitter(message.did).emit(
          "webrtc-data",
          ctx.guest * -1,
          message.data,
        );
      } else {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
    } catch (e: any) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e });
    }
  }
}
