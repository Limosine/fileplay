import { sign } from "jsonwebtoken";
import PRIVATE_KEY from "./private-jwt-signing.key?raw";

export function signJWT(payload: any) {
  return sign(payload, PRIVATE_KEY, {
    algorithm: "RS256",
  });
}
