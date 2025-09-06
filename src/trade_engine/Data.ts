import type { User } from "./types.js";

export let users: Record<string, User> = {};

// Initialize dummy data
function initializeDummyData() {
  if (Object.keys(users).length === 0) {
    users["57349_457344_fjsdbfsi"] = {
      userId: "57349_457344_fjsdbfsi",
      balance: 5000,
      trades: []
    };
  }
}

// Call initialization immediately
initializeDummyData();

export function getSnapshot(): User[] {
  return Object.values(users);
}

export function ensureDummyData() {
  initializeDummyData();
}
