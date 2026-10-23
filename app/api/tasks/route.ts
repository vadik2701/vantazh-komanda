import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { tasks } from "../../../db/schema";

export async function GET() {
  try {
    const rows = await getDb().select().from(tasks).orderBy(desc(tasks.createdAt), desc(tasks.id));
    return Response.json({ tasks: rows });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не вдалося завантажити завдання" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const title = String(payload.title ?? "").trim();
    const assignee = String(payload.assignee ?? "").trim();
    const workDate = String(payload.workDate ?? "").trim();
    if (!title || !assignee || !/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
      return Response.json({ error: "Заповніть назву, працівника і дату" }, { status: 400 });
    }
    const [task] = await getDb().insert(tasks).values({
      title,
      assignee,
      workDate,
      description: String(payload.description ?? "").trim(),
      location: String(payload.location ?? "").trim(),
      priority: payload.priority === "tomorrow" ? "tomorrow" : "today",
      createdAt: Date.now(),
    }).returning();
    return Response.json({ task }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не вдалося створити завдання" }, { status: 500 });
  }
}
