import type { AssignmentSource } from "./assignment";

export type SourceConnectionStatus =
  | "connected"
  | "syncing"
  | "error"
  | "disabled";

export type SourceConnection = {
  id: string;
  name: string;
  type: AssignmentSource;
  status: SourceConnectionStatus;
  lastSyncedAt?: string;
  errorMessage?: string;
  permissions?: string[];
};
