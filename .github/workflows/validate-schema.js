import { readFileSync } from "fs";
import fetch from "node-fetch";
import { config } from "dotenv-vault-core";

config();

let schema = readFileSync("src/gql/schema.gql", "utf8");

const url = new URL("/admin/schema/validate", process.env.PUBLIC_DGRAPH_HTTP);

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "text/plain",
    Accept: "application/json",
  },
  body: schema,
});

const json = await res.json();

if (res.status !== 200) {
  console.log(json.errors);
  process.exit(1);
}
