const { config } = require("dotenv-vault-core");

config();

module.exports = {
  schema: new URL("/graphql", process.env.PUBLIC_DGRAPH_HTTP).href,
  documents: ["src/gql/**/*.gql"],
  extensions: {
    codegen: {
      generates: {
        "./src/lib/gql.ts": {
          plugins: [
            "typescript",
            "typescript-operations",
            "typed-document-node",
          ],
          config: {
            arrayInputConversion: false,
          },
        },
      },
    },
  },
};