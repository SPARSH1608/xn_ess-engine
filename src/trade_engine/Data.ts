

import type {  User } from "./types.js";
export let users: Record<string, User>={}

export function getSnapshot():User[]{
  return Object.values(users);
}
