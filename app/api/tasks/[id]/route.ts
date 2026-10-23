import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { tasks } from "../../../../db/schema";
import { getSessionRole } from "../../../../lib/role-auth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!(await getSessionRole(request))) return Response.json({ error: "Потрібен вхід" }, { status: 401 });
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    const payload = (await request.json()) as { action?: string; reason?: string; newDate?: string };
    if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Невірне завдання" }, { status: 400 });

    const [current] = await getDb().select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!current) return Response.json({ error: "Завдання не знайдено" }, { status: 404 });

    const now = Date.now();
    if (payload.action === "start") {
      if (current.status !== "planned") return Response.json({ error: "Це завдання вже розпочате" }, { status: 409 });
      const [task] = await getDb().update(tasks).set({ status: "active", startedAt: now }).where(eq(tasks.id, id)).returning();
      return Response.json({ task });
    }
    if (payload.action === "finish") {
      if (current.status !== "active" || !current.startedAt) return Response.json({ error: "Спочатку почніть роботу" }, { status: 409 });
      const durationSeconds = Math.max(1, Math.floor((now - current.startedAt) / 1000));
      const [task] = await getDb().update(tasks).set({ status: "completed", completedAt: now, durationSeconds }).where(eq(tasks.id, id)).returning();
      return Response.json({ task });
    }
    if (payload.action === "postpone") {
      const reason = payload.reason?.trim() ?? "";
      const newDate = payload.newDate?.trim() ?? "";
      if (current.status !== "planned") return Response.json({ error: "Перенести можна лише роботу, яку ще не почали" }, { status: 409 });
      if (!reason) return Response.json({ error: "Напишіть причину перенесення" }, { status: 400 });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || newDate <= current.workDate) return Response.json({ error: "Оберіть нову дату після поточної" }, { status: 400 });
      const [task] = await getDb().update(tasks).set({
        workDate: newDate,
        priority: "tomorrow",
        postponedReason: reason,
        previousWorkDate: current.workDate,
        postponedAt: now,
        transferCount: current.transferCount + 1,
      }).where(eq(tasks.id, id)).returning();
      return Response.json({ task });
    }
    return Response.json({ error: "Невідома дія" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не вдалося оновити завдання" }, { status: 500 });
  }
}
