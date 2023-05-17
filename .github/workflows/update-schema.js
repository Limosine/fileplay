import { readFileSync } from "fs";
import { config } from "dotenv-vault-core";
import fetch from "node-fetch";

config();

let schema = readFileSync("src/gql/schema.gql", "utf8");

schema += `\n# Dgraph.Authorization {"VerificationKey": "${process.env.DGRAPH_JWT_PUBLIC_KEY.replace(
  /(?:\r\n|\r|\n)/g,
  "\\n"
)}", "Header": "Authorization", "Namespace": "${
  process.env.JWT_NAMESPACE
}", "Algo": "RS256"}`;

const url = new URL("/admin/schema", process.env.PUBLIC_DGRAPH_HTTP);
const token = process.env.DGRAPH_ADMIN_TOKEN;

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "text/plain",
    Accept: "application/json",
    "X-Dgraph-AuthToken": token,
  },
  body: schema,
});

const json = await res.json();

if (json.errors) {
  process.exit(1);
}
