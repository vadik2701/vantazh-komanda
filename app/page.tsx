"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ClipboardList, History, PackageCheck, Play, Plus, Timer, X } from "lucide-react";

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
};

const ukDate = (value: string) => new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", weekday: "short" }).format(new Date(`${value}T12:00:00`));
const inputDate = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const duration = (seconds: number) => { const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60; return h ? `${h} год ${m} хв` : m ? `${m} хв ${s} с` : `${s} с`; };
const clock = (seconds: number) => `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [role, setRole] = useState<"manager" | "worker">("manager");
  const [section, setSection] = useState<"tasks" | "history">("tasks");
  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now());
  const [form, setForm] = useState({ title: "", workDate: inputDate(), priority: "today" as "today" | "tomorrow" });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTasks(data.tasks);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Помилка завантаження"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><PackageCheck size={23} /></span><div><strong>Вантаж Команда</strong><small>роботи під контролем</small></div></div>
        <div className="role-switch" aria-label="Оберіть режим">
          <button className={role === "manager" ? "active" : ""} onClick={() => setRole("manager")}>Керівник</button>
          <button className={role === "worker" ? "active" : ""} onClick={() => setRole("worker")}>Бригада</button>
        </div>
        <div className="profile"><span>{role === "manager" ? "К" : "Б"}</span><div><strong>{role === "manager" ? "Керівник" : "Загальна бригада"}</strong><small>{role === "manager" ? "Планування робіт" : "Робочий режим"}</small></div></div>
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
              <TaskColumn title="Треба зробити" count={planned.length} icon={<ClipboardList size={18} />} tasks={planned} now={now} busy={busy} onAction={action} />
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
    </main>
  );
}

function TaskColumn({ title, count, icon, tasks, now, busy, onAction, active = false }: { title: string; count: number; icon: React.ReactNode; tasks: Task[]; now: number; busy: number | null; onAction: (id: number, action: "start" | "finish") => void; active?: boolean }) {
  return <section className={`column ${active ? "active-column" : ""}`}><header><span>{icon}</span><h2>{title}</h2><em>{count}</em></header><div className="cards">{tasks.length ? tasks.map((task) => <article className={`task-card ${task.priority}`} key={task.id}><div className="task-top"><span className={`priority ${task.priority}`}>{task.priority === "today" ? "● Обов’язково сьогодні" : "● Можна завтра"}</span><small><CalendarDays size={14} /> {ukDate(task.workDate)}</small></div><h3>{task.title}</h3>{active && task.startedAt ? <div className="live-timer"><div><small>Час у роботі</small><strong>{clock(Math.max(0, Math.floor((now - task.startedAt) / 1000)))}</strong></div><span><i /> Таймер працює</span></div> : null}<button disabled={busy === task.id} className={active ? "finish-button" : "start-button"} onClick={() => onAction(task.id, active ? "finish" : "start")}>{active ? <><CheckCircle2 size={19} /> Завершити роботу</> : <><Play size={18} fill="currentColor" /> Почати роботу</>}</button></article>) : <div className="empty-column"><CheckCircle2 size={24} /><strong>{active ? "Ніхто ще не почав" : "Усе виконано"}</strong><small>{active ? "Активні роботи з’являться тут" : "Нові завдання з’являться тут"}</small></div>}</div></section>;
}

function EmptyHistory() { return <div className="empty"><History size={30} /><h3>Історія поки порожня</h3><p>Завершені роботи з тривалістю з’являться тут автоматично.</p></div>; }
