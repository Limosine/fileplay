import { sign } from "jsonwebtoken";
import Filter from "bad-words";

// export function signJWT(payload: any) {
//   return sign(payload, PRIVATE_KEY, {
//     algorithm: "RS256",
//   });
// }

export function isProfane(s: string): boolean {
  return new Filter().isProfane(s);
}
