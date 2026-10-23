"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRightLeft, CalendarDays, CheckCircle2, ClipboardList, History, LockKeyhole, LogOut, Play, Plus, Timer, X } from "lucide-react";

type AppRole = "manager" | "worker";

type Task = {
  id: number;
  title: string;
  description: string;
  location: string;
  assignee: string;
  workDate: string;
  priority: "today" | "tomorrow";
  status: "planned" | "active" | "completed";
  startedAt: number | null;
  completedAt: number | null;
  durationSeconds: number | null;
  postponedReason: string;
  previousWorkDate: string | null;
  postponedAt: number | null;
  transferCount: number;
};

const ukDate = (value: string) => new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", weekday: "short" }).format(new Date(`${value}T12:00:00`));
const inputDate = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const duration = (seconds: number) => { const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60; return h ? `${h} год ${m} хв` : m ? `${m} хв ${s} с` : `${s} с`; };
const clock = (seconds: number) => `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [role, setRole] = useState<AppRole | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginRole, setLoginRole] = useState<AppRole>("worker");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [section, setSection] = useState<"tasks" | "history">("tasks");
  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now());
  const [form, setForm] = useState({ title: "", workDate: inputDate(), priority: "today" as "today" | "tomorrow" });
  const [transfer, setTransfer] = useState<{ task: Task | null; reason: string; newDate: string }>({ task: null, reason: "", newDate: inputDate(1) });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTasks(data.tasks);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Помилка завантаження"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then(async (res) => { if (!res.ok) return; const data = await res.json(); setRole(data.role); await load(); })
      .finally(() => setAuthLoading(false));
  }, [load]);
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);

  const visible = useMemo(() => tasks.filter((task) => section === "history" ? task.status === "completed" : task.status !== "completed"), [tasks, section]);
  const planned = visible.filter((task) => task.status === "planned");
  const active = visible.filter((task) => task.status === "active");
  const completedToday = tasks.filter((task) => task.status === "completed" && task.workDate === inputDate()).length;

  async function createTask(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) return setNotice(data.error || "Не вдалося додати завдання");
    setTasks((current) => [data.task, ...current]);
    setForm({ title: "", workDate: inputDate(), priority: "today" });
    setOpenForm(false); setNotice("Завдання додано до плану");
  }

  async function action(id: number, actionName: "start" | "finish") {
    setBusy(id);
    const res = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionName }) });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return setNotice(data.error || "Не вдалося оновити завдання");
    setTasks((current) => current.map((item) => item.id === id ? data.task : item));
    setNotice(actionName === "start" ? "Таймер запущено — гарної роботи!" : `Роботу завершено за ${duration(data.task.durationSeconds)}`);
  }

  async function postponeTask(event: React.FormEvent) {
    event.preventDefault();
    if (!transfer.task) return;
    setBusy(transfer.task.id);
    const res = await fetch(`/api/tasks/${transfer.task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "postpone", reason: transfer.reason, newDate: transfer.newDate }) });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return setNotice(data.error || "Не вдалося перенести роботу");
    setTasks((current) => current.map((item) => item.id === data.task.id ? data.task : item));
    setTransfer({ task: null, reason: "", newDate: inputDate(1) });
    setNotice(`Роботу перенесено на ${ukDate(data.task.workDate)}`);
  }

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoginError("");
    const res = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: loginRole, pin }) });
    const data = await res.json();
    if (!res.ok) return setLoginError(data.error || "Не вдалося увійти");
    setRole(data.role); setPin(""); setLoading(true); await load();
  }

  async function logout() {
    await fetch("/api/session", { method: "DELETE" });
    setRole(null); setTasks([]); setPin(""); setSection("tasks");
  }

  if (authLoading) return <div className="auth-loading"><img src="/logo-vantazh-komanda.svg" alt="" /><Timer className="spin" size={25} /><span>Перевіряємо доступ…</span></div>;
  if (!role) return <LoginScreen role={loginRole} setRole={setLoginRole} pin={pin} setPin={setPin} error={loginError} onSubmit={login} />;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><img src="/logo-vantazh-komanda.svg" alt="" /></span><div><strong>Вантаж Команда</strong><small>роботи під контролем</small></div></div>
        <div className="role-badge"><LockKeyhole size={15} /> {role === "manager" ? "Доступ керівника" : "Доступ бригади"}</div>
        <div className="profile"><span>{role === "manager" ? "К" : "Б"}</span><div><strong>{role === "manager" ? "Керівник" : "Загальна бригада"}</strong><small>{role === "manager" ? "Планування робіт" : "Робочий режим"}</small></div><button className="logout-button" onClick={logout} aria-label="Вийти"><LogOut size={18} /></button></div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="date-card"><small>Сьогодні</small><strong>{new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long" }).format(new Date())}</strong><span>{new Intl.DateTimeFormat("uk-UA", { weekday: "long" }).format(new Date())}</span></div>
          <nav><button className={section === "tasks" ? "active" : ""} onClick={() => setSection("tasks")}><ClipboardList size={19} /> Завдання <em>{tasks.filter((t) => t.status !== "completed").length}</em></button><button className={section === "history" ? "active" : ""} onClick={() => setSection("history")}><History size={19} /> Історія робіт</button></nav>
          <div className="shift-summary"><small>Зміна сьогодні</small><div><span><b>{tasks.filter((t) => t.status === "active").length}</b> у роботі</span><span><b>{completedToday}</b> виконано</span></div></div>
        </aside>

        <section className="content">
          <div className="page-head">
            <div><p className="eyebrow">{section === "history" ? "АРХІВ ЗМІН" : role === "worker" ? "РОБОТА БРИГАДИ" : "ПЛАН НА ДЕНЬ"}</p><h1>{section === "history" ? "Історія робіт" : role === "worker" ? "Загальні завдання" : "Завдання бригади"}</h1><p>{section === "history" ? "Завершені роботи та фактично витрачений час" : "Загальний список робіт по фірмі в одному місці"}</p></div>
            {role === "manager" && section === "tasks" && <button className="primary" onClick={() => setOpenForm(true)}><Plus size={20} /> Нове завдання</button>}
          </div>

          <div className="toolbar simple"><span>Загальна робота по фірмі</span><span className="sync-dot"><i /> Дані збережено</span></div>

          {notice && <button className="notice" onClick={() => setNotice("")}>{notice}<X size={16} /></button>}

          {loading ? <div className="empty"><Timer className="spin" size={28} /><h3>Завантажуємо зміну…</h3></div> : section === "history" ? (
            <div className="history-list">{visible.length ? visible.map((task) => <article className="history-row" key={task.id}><span className="done-icon"><CheckCircle2 size={22} /></span><div className="history-main"><strong>{task.title}</strong><small>Загальна робота</small></div><div><small>{ukDate(task.workDate)}</small><strong>{duration(task.durationSeconds || 0)}</strong></div></article>) : <EmptyHistory />}</div>
          ) : (
            <div className="board">
              <TaskColumn title="Треба зробити" count={planned.length} icon={<ClipboardList size={18} />} tasks={planned} now={now} busy={busy} onAction={action} onPostpone={(task) => setTransfer({ task, reason: "", newDate: task.workDate < inputDate() ? inputDate() : inputDate(1) })} />
              <TaskColumn title="Зараз у роботі" count={active.length} icon={<Timer size={18} />} tasks={active} now={now} busy={busy} onAction={action} active />
            </div>
          )}
        </section>
      </div>

      {openForm && <div className="modal-backdrop" onMouseDown={() => setOpenForm(false)}><section className="modal" onMouseDown={(e) => e.stopPropagation()}><header><div><span className="modal-icon"><Plus size={22} /></span><div><p className="eyebrow">ПЛАНУВАННЯ</p><h2>Нове завдання</h2></div></div><button className="icon-button" onClick={() => setOpenForm(false)} aria-label="Закрити"><X size={20} /></button></header><form onSubmit={createTask}>
        <label>Текст завдання <textarea autoFocus required placeholder="Наприклад: розвантажити 12 палет і скласти у зоні B" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label>Дата виконання <input required type="date" value={form.workDate} onChange={(e) => setForm({ ...form, workDate: e.target.value })} /></label>
        <fieldset><legend>Важливість</legend><div className="priority-picker"><button type="button" className={form.priority === "today" ? "selected urgent" : ""} onClick={() => setForm({ ...form, priority: "today" })}><span>●</span><div><strong>Обов’язково сьогодні</strong><small>Високий пріоритет</small></div></button><button type="button" className={form.priority === "tomorrow" ? "selected calm" : ""} onClick={() => setForm({ ...form, priority: "tomorrow" })}><span>●</span><div><strong>Можна завтра</strong><small>Звичайний пріоритет</small></div></button></div></fieldset>
        <footer><button type="button" className="secondary" onClick={() => setOpenForm(false)}>Скасувати</button><button className="primary" type="submit"><Plus size={19} /> Додати до плану</button></footer>
      </form></section></div>}

      {transfer.task && <div className="modal-backdrop" onMouseDown={() => setTransfer({ task: null, reason: "", newDate: inputDate(1) })}><section className="modal transfer-modal" onMouseDown={(e) => e.stopPropagation()}><header><div><span className="modal-icon transfer-icon"><ArrowRightLeft size={22} /></span><div><p className="eyebrow">ПЕРЕНЕСЕННЯ</p><h2>Перенести роботу</h2></div></div><button className="icon-button" onClick={() => setTransfer({ task: null, reason: "", newDate: inputDate(1) })} aria-label="Закрити"><X size={20} /></button></header><form onSubmit={postponeTask}>
        <div className="transfer-task"><small>Робота за {ukDate(transfer.task.workDate)}</small><strong>{transfer.task.title}</strong></div>
        <label>Чому робота не була виконана? <textarea autoFocus required placeholder="Наприклад: машина приїхала із запізненням" value={transfer.reason} onChange={(e) => setTransfer({ ...transfer, reason: e.target.value })} /></label>
        <label>Нова дата <input required type="date" min={inputDate()} value={transfer.newDate} onChange={(e) => setTransfer({ ...transfer, newDate: e.target.value })} /></label>
        <footer><button type="button" className="secondary" onClick={() => setTransfer({ task: null, reason: "", newDate: inputDate(1) })}>Скасувати</button><button className="postpone-confirm" type="submit"><ArrowRightLeft size={18} /> Перенести роботу</button></footer>
      </form></section></div>}
    </main>
  );
}

function TaskColumn({ title, count, icon, tasks, now, busy, onAction, onPostpone, active = false }: { title: string; count: number; icon: React.ReactNode; tasks: Task[]; now: number; busy: number | null; onAction: (id: number, action: "start" | "finish") => void; onPostpone?: (task: Task) => void; active?: boolean }) {
  return <section className={`column ${active ? "active-column" : ""}`}><header><span>{icon}</span><h2>{title}</h2><em>{count}</em></header><div className="cards">{tasks.length ? tasks.map((task) => { const overdue = task.workDate < inputDate(); const transferred = Boolean(task.previousWorkDate); return <article className={`task-card ${overdue ? "overdue" : task.priority}${transferred ? " transferred" : ""}`} key={task.id}>{transferred && <div className="transfer-ribbon"><ArrowRightLeft size={17} /><strong>ПЕРЕНЕСЕНА РОБОТА</strong>{task.transferCount > 1 && <span>×{task.transferCount}</span>}</div>}<div className="task-top"><span className={`priority ${overdue ? "overdue" : task.priority}`}>{overdue ? "● Не виконано" : task.priority === "today" ? "● Обов’язково сьогодні" : "● Можна завтра"}</span><small><CalendarDays size={14} /> {ukDate(task.workDate)}</small></div><h3>{task.title}</h3>{overdue && <div className="overdue-note"><AlertTriangle size={16} /><span>Термін минув. Робота не виконана.</span></div>}{task.previousWorkDate && task.postponedReason && <div className="transfer-note"><ArrowRightLeft size={17} /><span><b>Було заплановано: {ukDate(task.previousWorkDate)}</b><small>Причина перенесення</small>{task.postponedReason}</span></div>}{active && task.startedAt ? <div className="live-timer"><div><small>Час у роботі</small><strong>{clock(Math.max(0, Math.floor((now - task.startedAt) / 1000)))}</strong></div><span><i /> Таймер працює</span></div> : null}{active ? <button disabled={busy === task.id} className="finish-button" onClick={() => onAction(task.id, "finish")}><CheckCircle2 size={19} /> Завершити роботу</button> : <div className="task-actions"><button disabled={busy === task.id} className="start-button" onClick={() => onAction(task.id, "start")}><Play size={18} fill="currentColor" /> Почати роботу</button><button disabled={busy === task.id} className="postpone-button" onClick={() => onPostpone?.(task)}><ArrowRightLeft size={17} /> Перенести</button></div>}</article>; }) : <div className="empty-column"><CheckCircle2 size={24} /><strong>{active ? "Ніхто ще не почав" : "Усе виконано"}</strong><small>{active ? "Активні роботи з’являться тут" : "Нові завдання з’являться тут"}</small></div>}</div></section>;
}

function EmptyHistory() { return <div className="empty"><History size={30} /><h3>Історія поки порожня</h3><p>Завершені роботи з тривалістю з’являться тут автоматично.</p></div>; }

function LoginScreen({ role, setRole, pin, setPin, error, onSubmit }: { role: AppRole; setRole: (role: AppRole) => void; pin: string; setPin: (pin: string) => void; error: string; onSubmit: (event: React.FormEvent) => void }) {
  return <main className="login-page"><section className="login-card"><div className="login-brand"><img src="/logo-vantazh-komanda.svg" alt="Логотип Вантаж Команда" /><div><p className="eyebrow">ЗАХИЩЕНИЙ ВХІД</p><h1>Вантаж Команда</h1><p>Оберіть свій режим і введіть PIN-код</p></div></div><div className="login-role" aria-label="Оберіть роль"><button className={role === "worker" ? "active" : ""} onClick={() => { setRole("worker"); setPin(""); }}>Бригада<small>Виконання робіт</small></button><button className={role === "manager" ? "active" : ""} onClick={() => { setRole("manager"); setPin(""); }}>Керівник<small>Планування і контроль</small></button></div><form onSubmit={onSubmit}><label>PIN-код<input autoFocus required type="password" inputMode="numeric" autoComplete="current-password" placeholder="••••••" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label>{error && <div className="login-error">{error}</div>}<button className="login-submit" type="submit"><LockKeyhole size={18} /> Увійти як {role === "manager" ? "керівник" : "бригада"}</button></form><small className="login-note">Доступ зберігається на цьому пристрої протягом робочої зміни.</small></section></main>;
}
