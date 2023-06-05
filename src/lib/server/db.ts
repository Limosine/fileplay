import type { DB, Database } from "$lib/db";
import { error } from "@sveltejs/kit";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";

export function createKysely(platform: App.Platform | undefined): Database {
  if (!platform?.env?.DATABASE) throw error(500, "Database not configured");
  const kys = new Kysely<DB>({
    dialect: new D1Dialect({ database: platform.env.DATABASE }),
  });
  if (!kys) throw error(500, "Database could not be accessed");
  return kys;
}
