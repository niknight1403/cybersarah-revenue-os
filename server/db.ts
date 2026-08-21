import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  revenueAgents,
  revenueExternalActions,
  revenueSystemAudits,
  revenueWorkspaces,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { DEFAULT_REVENUE_AGENTS } from "./services/revenueCatalog";

let database: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!database && process.env.DATABASE_URL) {
    try {
      database = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Verbindung konnte nicht initialisiert werden.", error);
      database = null;
    }
  }
  return database;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [user] = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return user;
}

export async function getRevenueWorkspaceByUser(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [workspace] = await db.select().from(revenueWorkspaces).where(eq(revenueWorkspaces.userId, userId)).limit(1);
  return workspace;
}

export async function createRevenueWorkspace(userId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  await db.insert(revenueWorkspaces).values({ userId, name, status: "setup" });
  const workspace = await getRevenueWorkspaceByUser(userId);
  if (!workspace) throw new Error("Arbeitsbereich konnte nicht erstellt werden.");
  await db.insert(revenueAgents).values(
    DEFAULT_REVENUE_AGENTS.map(agent => ({
      workspaceId: workspace.id,
      agentKey: agent.agentKey,
      name: agent.name,
      status: "waiting" as const,
      enabled: true,
    }))
  );
  return workspace;
}

export async function getRevenueOverview(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const workspace = await getRevenueWorkspaceByUser(userId);
  if (!workspace) return { workspace: null, agents: [], pendingApprovals: 0, latestAudit: null };

  const [agents, actions, audits] = await Promise.all([
    db.select().from(revenueAgents).where(eq(revenueAgents.workspaceId, workspace.id)),
    db.select().from(revenueExternalActions).where(eq(revenueExternalActions.workspaceId, workspace.id)),
    db.select().from(revenueSystemAudits).where(eq(revenueSystemAudits.workspaceId, workspace.id)).orderBy(desc(revenueSystemAudits.createdAt)).limit(1),
  ]);

  return {
    workspace,
    agents,
    pendingApprovals: actions.filter(action => action.status === "needs_approval").length,
    approvalActions: actions.filter(action => action.status === "needs_approval").map(action => ({
      id: action.id,
      actionType: action.actionType,
      target: action.target,
      status: action.status,
      createdAt: action.createdAt,
    })),
    latestAudit: audits[0] ?? null,
  };
}

export async function setRevenueAgentEnabled(userId: number, agentId: number, enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const workspace = await getRevenueWorkspaceByUser(userId);
  if (!workspace) throw new Error("Arbeitsbereich wurde nicht gefunden.");
  const [agent] = await db
    .select()
    .from(revenueAgents)
    .where(and(eq(revenueAgents.id, agentId), eq(revenueAgents.workspaceId, workspace.id)))
    .limit(1);
  if (!agent) throw new Error("Agent wurde nicht gefunden.");
  await db.update(revenueAgents).set({ enabled, status: enabled ? "waiting" : "paused" }).where(eq(revenueAgents.id, agent.id));
}

export async function createRevenueApprovalDraft(userId: number, input: { actionType: string; target: string; payload: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank ist nicht verfügbar.");
  const workspace = await getRevenueWorkspaceByUser(userId);
  if (!workspace) throw new Error("Arbeitsbereich wurde nicht gefunden.");
  await db.insert(revenueExternalActions).values({
    workspaceId: workspace.id,
    actionKey: crypto.randomUUID(),
    actionType: input.actionType,
    target: input.target,
    payload: input.payload,
    status: "needs_approval",
    requiresApproval: true,
    requestedAt: new Date(),
  });
}
