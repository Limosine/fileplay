import Filter from "bad-words";

export function isProfane(s: string): boolean {
  return new Filter().isProfane(s);
}
