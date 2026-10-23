import { clearSessionCookie, createSession, getSessionRole, sessionCookie, type AppRole, verifyPin } from "../../../lib/role-auth";

export async function GET(request: Request) {
  const role = await getSessionRole(request);
  return role ? Response.json({ role }) : Response.json({ error: "Потрібен вхід" }, { status: 401 });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as { role?: AppRole; pin?: string };
  if ((payload.role !== "manager" && payload.role !== "worker") || !(await verifyPin(payload.role, String(payload.pin ?? "")))) {
    return Response.json({ error: "Невірний PIN-код" }, { status: 401 });
  }
  const token = await createSession(payload.role);
  return Response.json({ role: payload.role }, { headers: { "Set-Cookie": sessionCookie(token), "Cache-Control": "no-store" } });
}

export async function DELETE() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie(), "Cache-Control": "no-store" } });
}
