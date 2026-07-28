"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bell, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Circle, Clock3, Grid2X2, LayoutDashboard, ListTodo, LogOut, MapPin, Menu,
  MoreHorizontal, Plus, Printer, Search, Settings, Sparkles, Target, X
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type View = "month" | "week" | "day" | "year" | "tasks";
type Category = "vestibular" | "prova" | "tarefa" | "concurso" | "pessoal";
type Priority = "low" | "medium" | "high";
type CalendarEvent = {
  id: string; user_id?: string; title: string; description?: string | null;
  start_at: string; end_at: string; all_day: boolean; category: Category;
  priority: Priority; completed: boolean; location?: string | null; color?: string | null;
  reminder_minutes?: number | null; recurrence: string; status?: string; notes?: string | null;
};

const categoryMeta: Record<Category, { label: string; color: string; soft: string }> = {
  vestibular: { label: "Vestibular", color: "#ef476f", soft: "#fff0f3" },
  prova: { label: "Prova", color: "#7c5cff", soft: "#f1edff" },
  tarefa: { label: "Tarefa", color: "#008a79", soft: "#e7f7f3" },
  concurso: { label: "Concurso", color: "#e07922", soft: "#fff2e6" },
  pessoal: { label: "Pessoal", color: "#2684ff", soft: "#eaf3ff" },
};
const weekdays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const hours = Array.from({ length: 15 }, (_, i) => i + 7);

function isoLocal(date: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}
function startOfDay(d: Date) { const n = new Date(d); n.setHours(0, 0, 0, 0); return n; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }
function monthName(date: Date, full = true) {
  return new Intl.DateTimeFormat("pt-BR", { month: full ? "long" : "short", year: full ? "numeric" : undefined }).format(date);
}
function makeDemoEvents(today: Date): CalendarEvent[] {
  const event = (id: string, title: string, offset: number, hour: number, category: Category, extra = {}) => {
    const start = addDays(startOfDay(today), offset); start.setHours(hour);
    return { id, title, start_at: start.toISOString(), end_at: new Date(start.getTime() + 3600000).toISOString(), all_day: false, category, priority: "medium" as Priority, completed: false, recurrence: "none", ...extra };
  };
  return [
    event("demo-1", "Simulado ENEM — Linguagens", 0, 9, "vestibular", { location: "Sala de estudos", priority: "high" }),
    event("demo-2", "Revisar análise combinatória", 0, 14, "tarefa"),
    event("demo-3", "Prova de Física II", 2, 10, "prova", { priority: "high" }),
    event("demo-4", "Inscrição concurso público", 4, 8, "concurso", { all_day: true }),
    event("demo-5", "Entregar redação", -1, 16, "tarefa", { completed: true }),
    event("demo-6", "Academia", 1, 18, "pessoal"),
  ];
}

export default function CalendarApp() {
  const today = useMemo(() => new Date(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [demo, setDemo] = useState(false);
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(startOfDay(today));
  const [events, setEvents] = useState<CalendarEvent[]>(makeDemoEvents(today));
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [filters, setFilters] = useState<Record<Category, boolean>>({ vestibular: true, prova: true, tarefa: true, concurso: true, pessoal: true });

  useEffect(() => {
    if (!isSupabaseConfigured) { setAuthReady(true); setDemo(true); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase.from("calendar_events").select("*").order("start_at").then(({ data, error }) => {
      if (!error) setEvents((data ?? []) as CalendarEvent[]);
    });
  }, [session]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const visible = useMemo(() => events.filter(e => filters[e.category] && (!query || e.title.toLowerCase().includes(query.toLowerCase()))), [events, filters, query]);
  const pending = events.filter(e => !e.completed).length;
  const completed = events.filter(e => e.completed).length;

  function navigate(delta: number) {
    const d = new Date(cursor);
    if (view === "month") d.setMonth(d.getMonth() + delta);
    else if (view === "year") d.setFullYear(d.getFullYear() + delta);
    else d.setDate(d.getDate() + delta * (view === "week" ? 7 : 1));
    setCursor(d);
  }
  function openNew(date = cursor) {
    const start = new Date(date); start.setHours(9, 0, 0, 0);
    setSelected({ id: "", title: "", start_at: start.toISOString(), end_at: new Date(start.getTime() + 3600000).toISOString(), all_day: false, category: "tarefa", priority: "medium", completed: false, recurrence: "none" });
    setEditorOpen(true);
  }
  async function saveEvent(event: CalendarEvent) {
    if (session) {
      const payload = { ...event, id: event.id || undefined, user_id: session.user.id };
      const { data, error } = await supabase.from("calendar_events").upsert(payload).select().single();
      if (error) { setToast("Não foi possível salvar. Tente novamente."); return; }
      setEvents(prev => event.id ? prev.map(e => e.id === event.id ? data as CalendarEvent : e) : [...prev, data as CalendarEvent]);
    } else {
      const next = { ...event, id: event.id || crypto.randomUUID() };
      setEvents(prev => event.id ? prev.map(e => e.id === event.id ? next : e) : [...prev, next]);
      setDemo(true);
    }
    setEditorOpen(false); setToast(event.id ? "Compromisso atualizado" : "Compromisso criado");
  }
  async function removeEvent(id: string) {
    if (session) await supabase.from("calendar_events").delete().eq("id", id);
    setEvents(prev => prev.filter(e => e.id !== id)); setEditorOpen(false); setToast("Compromisso removido");
  }
  async function toggleDone(event: CalendarEvent) {
    const updated = { ...event, completed: !event.completed, status: !event.completed ? "done" : "planned" };
    setEvents(prev => prev.map(e => e.id === event.id ? updated : e));
    if (session) await supabase.from("calendar_events").update({ completed: updated.completed, status: updated.status }).eq("id", event.id);
  }

  if (!authReady) return <div className="app-loading"><div className="brand-mark"><Sparkles size={20}/></div><span>Preparando seu calendário…</span></div>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Abrir menu"><Menu size={22}/></button>
        <div className="brand"><span className="brand-mark"><Sparkles size={19}/></span><span>Lumina</span></div>
        <div className="search-wrap"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar compromissos, provas, tarefas…"/><kbd>⌘ K</kbd></div>
        <div className="top-actions">
          {demo && <span className="demo-badge">Modo demonstração</span>}
          <button className="icon-btn" aria-label="Notificações"><Bell size={19}/><i/></button>
          <button className="avatar" onClick={() => session ? supabase.auth.signOut() : setAuthOpen(true)} title={session ? "Sair" : "Entrar"}>
            {session?.user.email?.slice(0, 2).toUpperCase() ?? "MV"}
          </button>
        </div>
      </header>

      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <button className="create-btn" onClick={() => openNew()}><Plus size={19}/> Novo compromisso</button>
        <nav>
          <button className={view === "month" ? "active" : ""} onClick={() => { setView("month"); setMobileNav(false); }}><CalendarDays/> Calendário</button>
          <button className={view === "tasks" ? "active" : ""} onClick={() => { setView("tasks"); setMobileNav(false); }}><ListTodo/> Minhas tarefas <span>{pending}</span></button>
          <button onClick={() => setView("year")}><LayoutDashboard/> Visão geral</button>
        </nav>
        <div className="sidebar-section">
          <div className="section-label">MINHAS CATEGORIAS <button><Plus size={15}/></button></div>
          {(Object.keys(categoryMeta) as Category[]).map(key => <label key={key} className="filter-row">
            <input type="checkbox" checked={filters[key]} onChange={() => setFilters({ ...filters, [key]: !filters[key] })}/>
            <span className="color-dot" style={{ background: categoryMeta[key].color }}/>{categoryMeta[key].label}
          </label>)}
        </div>
        <div className="progress-card">
          <div><span>Seu progresso</span><strong>{completed}/{events.length}</strong></div>
          <div className="progress-track"><i style={{ width: `${events.length ? Math.round(completed / events.length * 100) : 0}%` }}/></div>
          <small>{events.length ? Math.round(completed / events.length * 100) : 0}% concluído esta semana</small>
        </div>
        <div className="sidebar-bottom">
          <button><Settings/> Configurações</button>
          {session && <button onClick={() => supabase.auth.signOut()}><LogOut/> Sair</button>}
        </div>
      </aside>

      <main className="main">
        <div className="calendar-head">
          <div>
            <div className="date-navigation">
              <h1>{view === "year" ? cursor.getFullYear() : view === "tasks" ? "Minhas tarefas" : monthName(cursor)}</h1>
              {view !== "tasks" && <><button onClick={() => navigate(-1)} aria-label="Anterior"><ChevronLeft/></button><button onClick={() => navigate(1)} aria-label="Próximo"><ChevronRight/></button><button className="today-btn" onClick={() => setCursor(startOfDay(today))}>Hoje</button></>}
            </div>
            <p>{view === "tasks" ? `${pending} pendentes · ${completed} concluídas` : "Planeje com calma. Conquiste no seu ritmo."}</p>
          </div>
          <div className="view-actions">
            <div className="view-switcher">
              {(["day", "week", "month", "year"] as View[]).map(v => <button key={v} className={view === v ? "active" : ""} onClick={() => setView(v)}>{({ day: "Dia", week: "Semana", month: "Mês", year: "Ano" } as Record<string,string>)[v]}</button>)}
            </div>
            <button className="print-btn" onClick={() => window.print()}><Printer size={18}/><span>Imprimir</span></button>
          </div>
        </div>

        {view === "month" && <MonthView cursor={cursor} events={visible} today={today} onDay={openNew} onEvent={e => { setSelected(e); setEditorOpen(true); }}/>}
        {view === "week" && <WeekView cursor={cursor} events={visible} today={today} onDay={openNew} onEvent={e => { setSelected(e); setEditorOpen(true); }}/>}
        {view === "day" && <DayView cursor={cursor} events={visible} onDay={openNew} onEvent={e => { setSelected(e); setEditorOpen(true); }}/>}
        {view === "year" && <YearView cursor={cursor} events={visible} today={today} onMonth={m => { const d = new Date(cursor); d.setMonth(m); setCursor(d); setView("month"); }}/>}
        {view === "tasks" && <TasksView events={visible} onToggle={toggleDone} onEvent={e => { setSelected(e); setEditorOpen(true); }} onNew={openNew}/>}
      </main>

      {!session && !authOpen && <div className="signin-nudge">
        <div><strong>Salve seu planejamento</strong><span>Entre para acessar em qualquer dispositivo.</span></div>
        <button onClick={() => setAuthOpen(true)}>Entrar ou criar conta</button><button className="nudge-x" onClick={e => (e.currentTarget.parentElement!.style.display = "none")}><X/></button>
      </div>}
      {editorOpen && selected && <EventEditor event={selected} onClose={() => setEditorOpen(false)} onSave={saveEvent} onDelete={removeEvent}/>}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onDone={() => { setAuthOpen(false); setDemo(false); }}/>}
      {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}</div>}
    </div>
  );
}

function MonthView({ cursor, events, today, onDay, onEvent }: { cursor: Date; events: CalendarEvent[]; today: Date; onDay: (d: Date) => void; onEvent: (e: CalendarEvent) => void }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = addDays(first, -first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  return <div className="month-card"><div className="weekday-row">{weekdays.map(d => <div key={d}>{d}</div>)}</div><div className="month-grid">
    {days.map(day => {
      const dayEvents = events.filter(e => sameDay(new Date(e.start_at), day));
      return <div key={day.toISOString()} className={`day-cell ${day.getMonth() !== cursor.getMonth() ? "muted" : ""} ${sameDay(day, today) ? "today" : ""}`} onDoubleClick={() => onDay(day)}>
        <button className="day-number" onClick={() => onDay(day)}>{day.getDate()}</button>
        <div className="day-events">{dayEvents.slice(0, 3).map(e => <button key={e.id} className={`event-pill ${e.completed ? "done" : ""}`} style={{ "--event": categoryMeta[e.category].color, "--soft": categoryMeta[e.category].soft } as React.CSSProperties} onClick={() => onEvent(e)}><i/>{!e.all_day && <time>{new Date(e.start_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time>}<span>{e.title}</span></button>)}
        {dayEvents.length > 3 && <small>+{dayEvents.length - 3} outros</small>}</div>
      </div>;
    })}
  </div></div>;
}

function WeekView({ cursor, events, today, onDay, onEvent }: { cursor: Date; events: CalendarEvent[]; today: Date; onDay: (d: Date) => void; onEvent: (e: CalendarEvent) => void }) {
  const start = addDays(cursor, -cursor.getDay());
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return <div className="schedule-card"><div className="week-header"><div/><>{days.map(d => <button key={d.toISOString()} className={sameDay(d, today) ? "today" : ""} onClick={() => onDay(d)}><span>{weekdays[d.getDay()]}</span><strong>{d.getDate()}</strong></button>)}</></div>
    <div className="week-scroll">{hours.map(hour => <div className="time-row" key={hour}><time>{String(hour).padStart(2, "0")}:00</time>{days.map(day => <div className="time-cell" key={day.toISOString()} onDoubleClick={() => { const d = new Date(day); d.setHours(hour); onDay(d); }}>{events.filter(e => sameDay(new Date(e.start_at), day) && new Date(e.start_at).getHours() === hour).map(e => <button key={e.id} onClick={() => onEvent(e)} style={{ borderLeftColor: categoryMeta[e.category].color, background: categoryMeta[e.category].soft }}><strong>{e.title}</strong><span>{new Date(e.start_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></button>)}</div>)}</div>)}</div>
  </div>;
}

function DayView({ cursor, events, onDay, onEvent }: { cursor: Date; events: CalendarEvent[]; onDay: (d: Date) => void; onEvent: (e: CalendarEvent) => void }) {
  const dayEvents = events.filter(e => sameDay(new Date(e.start_at), cursor));
  return <div className="day-layout"><section className="day-agenda"><div className="day-hero"><span>{weekdays[cursor.getDay()]}</span><strong>{cursor.getDate()}</strong><p>{cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p></div>{hours.map(hour => <div className="day-time" key={hour}><time>{hour}:00</time><div onDoubleClick={() => { const d = new Date(cursor); d.setHours(hour); onDay(d); }}>{dayEvents.filter(e => new Date(e.start_at).getHours() === hour).map(e => <button key={e.id} onClick={() => onEvent(e)} style={{ borderColor: categoryMeta[e.category].color, background: categoryMeta[e.category].soft }}><strong>{e.title}</strong><span><Clock3/> {new Date(e.start_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}{e.location && <> · {e.location}</>}</span></button>)}</div></div>)}</section>
    <aside className="day-summary"><span>RESUMO DO DIA</span><strong>{dayEvents.length}</strong><p>compromissos planejados</p><div>{dayEvents.filter(e => e.completed).length} concluídos</div><div>{dayEvents.filter(e => e.priority === "high").length} alta prioridade</div><button onClick={() => onDay(cursor)}><Plus/> Adicionar</button></aside>
  </div>;
}

function YearView({ cursor, events, today, onMonth }: { cursor: Date; events: CalendarEvent[]; today: Date; onMonth: (m: number) => void }) {
  return <div className="year-grid">{Array.from({ length: 12 }, (_, month) => {
    const first = new Date(cursor.getFullYear(), month, 1); const start = addDays(first, -first.getDay());
    return <button className="mini-month" key={month} onClick={() => onMonth(month)}><h3>{new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(first)}</h3><div className="mini-week">{weekdays.map(w => <span key={w}>{w[0]}</span>)}</div><div className="mini-grid">{Array.from({ length: 42 }, (_, i) => addDays(start, i)).map(d => <span key={d.toISOString()} className={`${d.getMonth() !== month ? "muted" : ""} ${sameDay(d, today) ? "today" : ""} ${events.some(e => sameDay(new Date(e.start_at), d)) ? "has-event" : ""}`}>{d.getDate()}</span>)}</div></button>;
  })}</div>;
}

function TasksView({ events, onToggle, onEvent, onNew }: { events: CalendarEvent[]; onToggle: (e: CalendarEvent) => void; onEvent: (e: CalendarEvent) => void; onNew: () => void }) {
  const groups = [{ label: "Atrasadas", filter: (e: CalendarEvent) => !e.completed && new Date(e.start_at) < startOfDay(new Date()) }, { label: "Próximas", filter: (e: CalendarEvent) => !e.completed && new Date(e.start_at) >= startOfDay(new Date()) }, { label: "Concluídas", filter: (e: CalendarEvent) => e.completed }];
  return <div className="tasks-board">{groups.map(group => { const list = events.filter(group.filter); return <section key={group.label}><header><h2>{group.label}</h2><span>{list.length}</span></header>{list.length ? list.map(e => <article key={e.id} className={e.completed ? "completed" : ""}><button className="check-btn" onClick={() => onToggle(e)}>{e.completed ? <Check/> : <Circle/>}</button><button className="task-body" onClick={() => onEvent(e)}><strong>{e.title}</strong><span><i style={{ background: categoryMeta[e.category].color }}/>{categoryMeta[e.category].label} · {new Date(e.start_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span></button><span className={`priority ${e.priority}`}>{e.priority === "high" ? "Alta" : e.priority === "medium" ? "Média" : "Baixa"}</span><MoreHorizontal/></article>) : <div className="empty-list">Tudo em ordem por aqui.</div>}</section>})}<button className="floating-add" onClick={onNew}><Plus/> Nova tarefa</button></div>;
}

function EventEditor({ event, onClose, onSave, onDelete }: { event: CalendarEvent; onClose: () => void; onSave: (e: CalendarEvent) => void; onDelete: (id: string) => void }) {
  const [draft, setDraft] = useState(event);
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><form className="event-modal" onSubmit={e => { e.preventDefault(); if (draft.title.trim()) onSave(draft); }}>
    <header><div><span>{event.id ? "EDITAR COMPROMISSO" : "NOVO COMPROMISSO"}</span><h2>{event.id ? "Ajuste os detalhes" : "O que você vai conquistar?"}</h2></div><button type="button" onClick={onClose}><X/></button></header>
    <label className="field"><span>Título</span><input autoFocus required value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Ex.: Prova de matemática"/></label>
    <div className="field-row"><label className="field"><span>Início</span><input type="datetime-local" value={isoLocal(new Date(draft.start_at))} onChange={e => setDraft({ ...draft, start_at: new Date(e.target.value).toISOString() })}/></label><label className="field"><span>Fim</span><input type="datetime-local" value={isoLocal(new Date(draft.end_at))} onChange={e => setDraft({ ...draft, end_at: new Date(e.target.value).toISOString() })}/></label></div>
    <div className="field-row"><label className="field"><span>Categoria</span><select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value as Category })}>{Object.entries(categoryMeta).map(([key, meta]) => <option value={key} key={key}>{meta.label}</option>)}</select></label><label className="field"><span>Prioridade</span><select value={draft.priority} onChange={e => setDraft({ ...draft, priority: e.target.value as Priority })}><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></label></div>
    <label className="field"><span>Local</span><div className="input-icon"><MapPin/><input value={draft.location ?? ""} onChange={e => setDraft({ ...draft, location: e.target.value })} placeholder="Opcional"/></div></label>
    <label className="field"><span>Descrição e anotações</span><textarea value={draft.description ?? ""} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Materiais, links ou observações importantes…"/></label>
    <div className="editor-options"><label><input type="checkbox" checked={draft.all_day} onChange={e => setDraft({ ...draft, all_day: e.target.checked })}/> Dia inteiro</label><label><input type="checkbox" checked={draft.completed} onChange={e => setDraft({ ...draft, completed: e.target.checked })}/> Concluído</label></div>
    <footer>{event.id ? <button className="delete-btn" type="button" onClick={() => onDelete(event.id)}>Excluir</button> : <span/>}<div><button type="button" className="cancel-btn" onClick={onClose}>Cancelar</button><button className="save-btn">Salvar compromisso</button></div></footer>
  </form></div>;
}

function AuthModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [signup, setSignup] = useState(false); const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setLoading(true); setMessage("");
    if (!isSupabaseConfigured) { setMessage("A demonstração está ativa. Configure o Supabase para entrar."); setLoading(false); return; }
    const result = signup ? await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } }) : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (result.error) setMessage(result.error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : result.error.message);
    else if (signup && !result.data.session) setMessage("Enviamos um link de confirmação para seu e-mail.");
    else onDone();
  }
  return <div className="modal-backdrop"><div className="auth-modal"><button className="auth-close" onClick={onClose}><X/></button><div className="auth-brand"><span className="brand-mark"><Sparkles/></span><strong>Lumina</strong></div><h2>{signup ? "Crie seu espaço" : "Que bom ter você de volta"}</h2><p>{signup ? "Seu planejamento, sincronizado e seguro." : "Entre para continuar organizando suas conquistas."}</p><form onSubmit={submit}>{signup && <label><span>Como podemos te chamar?</span><input required value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome"/></label>}<label><span>E-mail</span><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com"/></label><label><span>Senha</span><input type="password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres"/></label>{message && <div className="auth-message">{message}</div>}<button disabled={loading}>{loading ? "Aguarde…" : signup ? "Criar minha conta" : "Entrar"}</button></form><div className="auth-switch">{signup ? "Já possui uma conta?" : "Ainda não tem uma conta?"} <button onClick={() => { setSignup(!signup); setMessage(""); }}>{signup ? "Entrar" : "Criar agora"}</button></div></div></div>;
}
