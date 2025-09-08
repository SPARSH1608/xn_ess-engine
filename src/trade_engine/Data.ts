import type { User } from "./types.js";

export let users: Record<string, User> = {};

function initializeDummyData() {
  if (Object.keys(users).length === 0) {
    users["57349_457344_fjsdbfsi"] = {
      userId: "57349_457344_fjsdbfsi",
      balance: 5000,
      trades: []
    };
  }
}

initializeDummyData();

export function getSnapshot(): User[] {
  return Object.values(users);
}

export function ensureDummyData() {
  initializeDummyData();
}

export function addUser(user: User) {
  users[user.userId] = user;
  console.log('User added to memory:', user.userId);
}
