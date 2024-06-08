import dayjs from "dayjs";
import { zValidator } from "@hono/zod-validator";
import { Hono, validator } from "hono/mod.ts";
import { deleteCookie, getCookie } from "hono/helper/cookie/index.ts";
import { nanoid } from "nanoid";
import { z } from "zod";

import { isProfane } from "./common.ts";
import { deleteDevice, httpAuthorized, httpContext } from "./db.ts";
import { getGuestID, setGuestID } from "./guest.ts";
import { setDeviceID } from "./signing.ts";
import { deviceStateChanged, notifyDevices, sendMessage } from "./ws.ts";

import { DeviceType } from "../../common/common.ts";

export const addHandlers = (app: Hono) => {
  app.post(
    "/checkProfanity",
    zValidator(
      "json",
      z.object({
        username: z.string(),
      })
    ),
    async (c) => {
      const { username } = c.req.valid("json");
      if (!username) return c.text("Missing username!", 400);
      return c.json(await isProfane(username));
    }
  );

  app.delete(
    "/devices",
    validator("cookie", async (_, c) => {
      return await httpAuthorized(c, false);
    }),
    zValidator(
      "query",
      z.object({
        did: z.coerce.number(),
      })
    ),
    async (c) => {
      const ctx = c.req.valid("cookie");
      const { did } = c.req.valid("query");

      try {
        await deleteDevice(ctx.database, ctx.device, did, ctx.user);
      } catch (e) {
        console.log("Error:", e);
        return c.text(JSON.stringify(e), 500);
      }

      if (ctx.user !== undefined) deviceStateChanged(ctx.database, ctx.user);
      return c.newResponse(null, 200);
    }
  );

  app.post(
    "/devices/link",
    validator("cookie", async (_, c) => {
      return await httpAuthorized(c, false);
    }),
    zValidator(
      "json",
      z.object({
        code: z.string(),
      })
    ),
    async (c) => {
      const ctx = c.req.valid("cookie");
      const code = c.req.valid("json").code.toUpperCase().replaceAll("O", "0");

      try {
        const response1 = await ctx.database
          .selectFrom("devices_link_codes")
          .select(["uid", "created_did"])
          .where("code", "=", code)
          .where("expires", ">", dayjs().unix())
          .executeTakeFirst();

        if (!response1) return c.text("Invalid code", 404);

        await ctx.database
          .deleteFrom("devices_link_codes")
          .where((eb) =>
            eb.or([eb("code", "=", code), eb("expires", "<=", dayjs().unix())])
          )
          .execute();

        await ctx.database
          .updateTable("devices")
          .set({ uid: response1.uid, linked_at: dayjs().unix() })
          .where("did", "=", ctx.device)
          .returning("did")
          .executeTakeFirst();

        sendMessage(response1.created_did, {
          type: "deviceCodeRedeemed",
        });
        if (ctx.user !== undefined)
          notifyDevices(ctx.database, ctx.user, { devices: true }, {});
        return c.newResponse(null, 200);
      } catch (e) {
        console.log("Error:", e);
        return c.text(JSON.stringify(e), 500);
      }
    }
  );

  app.delete(
    "/user",
    validator("cookie", async (_, c) => {
      return await httpAuthorized(c);
    }),
    async (c) => {
      const ctx = c.req.valid("cookie");

      try {
        await ctx.database.transaction().execute(async (trx) => {
          await trx
            .deleteFrom("contacts")
            .where((eb) =>
              eb.or([eb("a", "=", ctx.user), eb("b", "=", ctx.user)])
            )
            .execute();

          await trx
            .deleteFrom("group_members")
            .where("uid", "=", ctx.user)
            .execute();

          await trx
            .deleteFrom("group_requests")
            .where("uid", "=", ctx.user)
            .execute();

          await notifyDevices(
            ctx.database,
            ctx.user,
            {},
            { contacts: true, groups: true, group_devices: true }
          );

          await trx
            .deleteFrom("users")
            .where("users.uid", "=", ctx.user)
            .execute();
        });

        deleteCookie(c, "did_sig", { path: "/" });
        deleteCookie(c, "did", { path: "/" });
        return c.newResponse(null, 200);
      } catch (e) {
        return c.text(JSON.stringify(e), 500);
      }
    }
  );

  app.post(
    "/setup/device",
    validator("cookie", () => {
      return httpContext();
    }),
    zValidator(
      "json",
      z.object({
        display_name: z.string(),
        type: z.nativeEnum(DeviceType),
      })
    ),
    async (c) => {
      const ctx = c.req.valid("cookie");
      const update = Object.assign(c.req.valid("json"), { salt: nanoid() });

      try {
        const response = await ctx.database
          .insertInto("devices")
          .values(update)
          .returning("did")
          .executeTakeFirst();

        if (response) {
          await setDeviceID(response.did, update.salt, c, ctx.key);

          return c.newResponse(null, 201);
        } else {
          return c.text("Failed to create device", 500);
        }
      } catch (e) {
        console.log("Error:", e);
        return c.text(JSON.stringify(e), 500);
      }
    }
  );

  app.post(
    "/setup/user",
    validator("cookie", async (_, c) => {
      return await httpAuthorized(c, false);
    }),
    zValidator(
      "json",
      z.object({
        display_name: z.string(),
        avatar_seed: z.string(),
      })
    ),
    async (c) => {
      const ctx = c.req.valid("cookie");
      const update = c.req.valid("json");

      if (await isProfane(update.display_name))
        return c.text("Display name is profane", 418);

      try {
        const response = await ctx.database
          .insertInto("users")
          .values(update)
          .returning("uid")
          .executeTakeFirst();

        if (!response) return c.text("Failed to create user", 500);

        await ctx.database
          .updateTable("devices")
          .set({ uid: response.uid, linked_at: dayjs().unix() })
          .where("did", "=", ctx.device)
          .returning("did")
          .executeTakeFirstOrThrow();

        return c.newResponse(null, 201);
      } catch (e) {
        return c.text(JSON.stringify(e), 500);
      }
    }
  );

  app.post("/setup/guest", async (c) => {
    if (
      (await getGuestID(getCookie(c, "gid"), getCookie(c, "gid_sig"))) !==
      undefined
    ) {
      return c.newResponse(null, 200);
    }

    await setGuestID(c);

    return c.newResponse(null, 201);
  });
};
