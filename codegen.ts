import { CodegenConfig } from "@graphql-codegen/cli";
import * as dotenv from "dotenv";

dotenv.config();

export default <CodegenConfig>{
  schema: process.env.PUBLIC_DGRAPH_HTTP_URL,
  documents: "src/gql/**/*.gql",
  generates: {
    "src/lib/gql.ts": {
      plugins: [
        "typescript",
        "typescript-operations",
        "typed-document-node",
        "graphql-codegen-svelte-apollo",
      ],
    },
  },
};
