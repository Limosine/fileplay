import { readFileSync, writeFileSync } from 'fs';

const file = readFileSync('./src/lib/gql.ts', 'utf8')
const newFile = file.replace(/import { TypedDocumentNode/, 'import type { TypedDocumentNode')
writeFileSync('./src/lib/gql.ts', newFile, 'utf8')
