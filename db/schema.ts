import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  location: text("location").notNull().default(""),
  assignee: text("assignee").notNull(),
  workDate: text("work_date").notNull(),
  priority: text("priority", { enum: ["today", "tomorrow"] }).notNull().default("today"),
  status: text("status", { enum: ["planned", "active", "completed"] }).notNull().default("planned"),
  startedAt: integer("started_at"),
  completedAt: integer("completed_at"),
  durationSeconds: integer("duration_seconds"),
  postponedReason: text("postponed_reason").notNull().default(""),
  previousWorkDate: text("previous_work_date"),
  postponedAt: integer("postponed_at"),
  transferCount: integer("transfer_count").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});
