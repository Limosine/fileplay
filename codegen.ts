import { CodegenConfig } from "@graphql-codegen/cli";
import { config } from "dotenv-vault-core";

config();

export default <CodegenConfig>{
  schema: new URL("/graphql", process.env.PUBLIC_DGRAPH_HTTP).href,
  documents: "src/gql/**/*.gql",
  generates: {
    "src/lib/gql.ts": {
      plugins: [
        "typescript",
        "typescript-operations",
        "typed-document-node",
        "graphql-codegen-svelte-apollo",
      ],
      config: {
        arrayInputConversion: false,
      },
    },
  },
};
