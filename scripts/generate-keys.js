import crypto from "crypto";
import { setWebCrypto, ApplicationServerKeys } from "webpush-webcrypto";
setWebCrypto(crypto);

const keys = await ApplicationServerKeys.generate();
const json = await keys.toJSON();
console.log(json);
