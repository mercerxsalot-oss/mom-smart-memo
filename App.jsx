import React, { useEffect, useState, useRef } from "react";

// ----------------------- helpers -----------------------
const uid = (prefix = "id") => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const load = (k, fallback) => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error("load error", e);
    return fallback;
  }
};

function formatDateInput(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function niceDate(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  return d.toLocaleString();
}

// request browser notification permission
async function ensureNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const perm = await Notification.requestPermission();
  return perm === "granted";
}

function notify(title, options = {}) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, options);
    setTimeout(() => n.close(), 6000);
  } catch (e) {
    console.warn("notification failed", e);
  }
}

// ----------------------- small UI atoms -----------------------
function IconBell() {
  return (
    <svg className="w-5 h-5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 relative">
        <button
          aria-label="Close dialog"
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-800"
        >
          ✕
        </button>
        {title && <h3 className="text-xl font-semibold mb-4">{title}</h3>}
        <div>{children}</div>
      </div>
    </div>
  );
}

// ----------------------- App sections -----------------------
function Header({ onOpenBackup, onAskNotify }) {
  return (
    <header className="flex items-center justify-between gap-4 p-4 border-b bg-gradient-to-r from-pink-50 to-white">
      <div className="flex items-center gap-3">
        <div className="rounded-full w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white font-bold text-lg">أم</div>
        <div>
          <h1 className="text-lg font-bold">MOM — مذكّرة أمي الذكية</h1>
          <p className="text-xs text-gray-500">مكان واحد ينظم يومها ويخليك قريب</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onAskNotify}
          className="flex items-center gap-2 px-3 py-2 bg-white border rounded-xl shadow-sm hover:shadow-md"
        >
          <IconBell /> Enable reminders
        </button>

        <button onClick={onOpenBackup} className="px-3 py-2 bg-pink-600 text-white rounded-xl shadow">Backup / Share</button>
      </div>
    </header>
  );
}

function Dashboard({ dataCounts }) {
  return (
    <section className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-sm text-gray-600">Medications</h3>
        <p className="text-2xl font-bold">{dataCounts.medications}</p>
        <p className="text-xs text-gray-500">قائمة الأدوية والجرعات</p>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-sm text-gray-600">Appointments</h3>
        <p className="text-2xl font-bold">{dataCounts.appointments}</p>
        <p className="text-xs text-gray-500">مواعيد قادمة</p>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-sm text-gray-600">Shopping items</h3>
        <p className="text-2xl font-bold">{dataCounts.shopping}</p>
        <p className="text-xs text-gray-500">قائمة تسوق سريعة</p>
      </div>
    </section>
  );
}

// Medication manager
function Medications({ meds, onAdd, onUpdate, onRemove }) {
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({ name: "", dose: "", time: "" });

  useEffect(() => {
    if (!openNew) setForm({ name: "", dose: "", time: "" });
  }, [openNew]);

  function handleAdd(e) {
    e.preventDefault();
    if (!form.name || !form.time) return alert("Please provide name and time");
    onAdd({ id: uid("med"), ...form, active: true });
    setOpenNew(false);
  }

  return (
    <section className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">الأدوية</h2>
        <button onClick={() => setOpenNew(true)} className="px-3 py-1 bg-pink-600 text-white rounded">+ Add</button>
      </div>

      <div className="grid gap-3">
        {meds.length === 0 && <p className="text-sm text-gray-500">No medicines yet — add one for daily reminders.</p>}
        {meds.map((m) => (
          <article key={m.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between">
            <div>
              <div className="font-semibold">{m.name}</div>
              <div className="text-xs text-gray-500">Dose: {m.dose || '-'} • Time: {niceDate(m.time)}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdate({ ...m, active: !m.active })}
                className={`px-3 py-1 rounded ${m.active ? 'bg-green-100' : 'bg-gray-100'}`}
              >
                {m.active ? 'On' : 'Off'}
              </button>
              <button onClick={() => onRemove(m.id)} className="px-2 py-1 bg-red-50 rounded">Remove</button>
            </div>
          </article>
        ))}
      </div>

      <Modal open={openNew} onClose={() => setOpenNew(false)} title="Add new medicine">
        <form onSubmit={handleAdd} className="space-y-3">
          <label className="block">
            <div className="text-xs text-gray-600">Name</div>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded p-2" />
          </label>
          <label className="block">
            <div className="text-xs text-gray-600">Dose</div>
            <input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} className="w-full border rounded p-2" />
          </label>
          <label className="block">
            <div className="text-xs text-gray-600">Time (local)</div>
            <input type="datetime-local" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full border rounded p-2" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpenNew(false)} className="px-3 py-1">Cancel</button>
            <button type="submit" className="px-3 py-1 bg-pink-600 text-white rounded">Save</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

// Appointments
function Appointments({ apps, onAdd, onUpdate, onRemove }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", datetime: "", note: "" });

  function handleAdd(e) {
    e.preventDefault();
    if (!form.title || !form.datetime) return alert("Please provide title and date");
    onAdd({ id: uid("app"), ...form });
    setOpen(false);
  }

  return (
    <section className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">مواعيد</h2>
        <button onClick={() => setOpen(true)} className="px-3 py-1 bg-white border rounded">+ Add</button>
      </div>

      <div className="grid gap-2">
        {apps.length === 0 && <p className="text-sm text-gray-500">No upcoming appointments.</p>}
        {apps.map((a) => (
          <div key={a.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between">
            <div>
              <div className="font-semibold">{a.title}</div>
              <div className="text-xs text-gray-500">{niceDate(a.datetime)} • {a.note || '-'}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onRemove(a.id)} className="px-2 py-1 bg-red-50 rounded">Remove</button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add appointment">
        <form onSubmit={handleAdd} className="space-y-3">
          <label className="block">
            <div className="text-xs text-gray-600">Title</div>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border rounded p-2" />
          </label>
          <label className="block">
            <div className="text-xs text-gray-600">Date & Time</div>
            <input type="datetime-local" value={form.datetime} onChange={(e) => setForm({ ...form, datetime: e.target.value })} className="w-full border rounded p-2" />
          </label>
          <label className="block">
            <div className="text-xs text-gray-600">Note</div>
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full border rounded p-2" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="px-3 py-1">Cancel</button>
            <button type="submit" className="px-3 py-1 bg-pink-600 text-white rounded">Save</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

// Shopping list
function Shopping({ items, onAdd, onToggle, onRemove }) {
  const [text, setText] = useState("");
  function add() {
    if (!text.trim()) return;
    onAdd({ id: uid("s"), text: text.trim(), bought: false });
    setText("");
  }
  return (
    <section className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">قائمة التسوق</h2>
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 border rounded p-2" placeholder="Add item" />
        <button onClick={add} className="px-3 py-2 bg-pink-600 text-white rounded">Add</button>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((it) => (
          <li key={it.id} className="bg-white p-2 rounded shadow-sm flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={it.bought} onChange={() => onToggle(it.id)} />
              <span className={`select-none ${it.bought ? 'line-through text-gray-400' : ''}`}>{it.text}</span>
            </label>
            <button onClick={() => onRemove(it.id)} className="text-red-500">Delete</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Recipes and favorites
function Recipes({ recipes, onAdd, onRemove }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', steps: '' });
  function handleAdd(e) {
    e.preventDefault();
    if (!form.title) return alert('Enter title');
    onAdd({ id: uid('r'), title: form.title, steps: form.steps.split('\n').map(s => s.trim()).filter(Boolean) });
    setOpen(false);
    setForm({ title: '', steps: '' });
  }
  return (
    <section className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">وصفات أمي</h2>
        <button onClick={() => setOpen(true)} className="px-3 py-1 bg-white border rounded">+ Add</button>
      </div>
      <div className="grid gap-2">
        {recipes.length === 0 && <p className="text-sm text-gray-500">No recipes yet — add family favorites.</p>}
        {recipes.map(rc => (
          <article key={rc.id} className="bg-white p-3 rounded-xl shadow-sm">
            <div className="font-semibold">{rc.title}</div>
            <ol className="text-sm text-gray-600 mt-2 list-decimal pl-5">
              {rc.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
            <div className="mt-2 flex gap-2">
              <button onClick={() => navigator.clipboard && navigator.clipboard.writeText(rc.steps.join('\n'))} className="px-2 py-1 bg-gray-100 rounded">Copy steps</button>
              <button onClick={() => onRemove(rc.id)} className="px-2 py-1 bg-red-50 rounded">Delete</button>
            </div>
          </article>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add recipe">
        <form onSubmit={handleAdd} className="space-y-3">
          <label>
            <div className="text-xs text-gray-600">Title</div>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border rounded p-2" />
          </label>
          <label>
            <div className="text-xs text-gray-600">Steps (one per line)</div>
            <textarea value={form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })} className="w-full border rounded p-2 h-32" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="px-3 py-1">Cancel</button>
            <button type="submit" className="px-3 py-1 bg-pink-600 text-white rounded">Save</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

// Photos memory manager (simple)
function Photos({ photos, onAdd, onRemove }) {
  const fileRef = useRef();
  function handleChoose(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      onAdd({ id: uid('p'), src: reader.result, name: f.name, date: new Date().toISOString() });
    };
    reader.readAsDataURL(f);
  }
  return (
    <section className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">ذكريات وصور</h2>
        <div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleChoose} className="hidden" />
          <button onClick={() => fileRef.current && fileRef.current.click()} className="px-3 py-1 bg-white border rounded">Upload</button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {photos.map(ph => (
          <div key={ph.id} className="bg-white rounded-lg overflow-hidden shadow-sm">
            <img src={ph.src} alt={ph.name} className="w-full h-36 object-cover" />
            <div className="p-2 text-xs text-gray-600 flex items-center justify-between">
              <div>{ph.name || 'photo'}</div>
              <button onClick={() => onRemove(ph.id)} className="text-red-500">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Reminders watcher: checks meds and appointments each minute
function useReminderWatcher(state, askNotify) {
  useEffect(() => {
    let interval = setInterval(() => {
      const now = Date.now();
      // meds
      state.medications.forEach((m) => {
        if (!m.active || !m.time) return;
        const t = new Date(m.time).getTime();
        // if now within +/- 40 seconds of scheduled time for today
        const todayBase = new Date();
        todayBase.setHours(new Date(m.time).getHours(), new Date(m.time).getMinutes(), 0, 0);
        const diff = Math.abs(now - todayBase.getTime());
        if (diff < 40 * 1000) {
          askNotify && askNotify();
          notify(`وقت الدواء: ${m.name}`, { body: `جرعة: ${m.dose || '-'} الآن` });
        }
      });
      // appointments in next 10 minutes
      state.appointments.forEach((a) => {
        const t = new Date(a.datetime).getTime();
        const diff = t - now;
        if (diff > 0 && diff < 10 * 60 * 1000) {
          askNotify && askNotify();
          notify(`موعد قريب: ${a.title}`, { body: `في ${Math.round(diff / 60000)} دقيقة` });
        }
      });
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, [state, askNotify]);
}

// Settings & backup
function SettingsPanel({ onExport, onImport, onClearAll }) {
  const fileRef = useRef();
  function handleImport(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        onImport(data);
      } catch (e) {
        alert('Failed to read file');
      }
    };
    reader.readAsText(f);
  }
  return (
    <section className="p-4 border-t">
      <h3 className="text-lg font-semibold">Backup & Settings</h3>
      <div className="mt-3 flex flex-col gap-2">
        <button onClick={onExport} className="px-3 py-2 bg-pink-600 text-white rounded">Export JSON</button>
        <div>
          <input ref={fileRef} type="file" accept="application/json" onChange={handleImport} className="hidden" />
          <button onClick={() => fileRef.current && fileRef.current.click()} className="px-3 py-2 bg-white border rounded">Import JSON</button>
        </div>
        <button onClick={onClearAll} className="px-3 py-2 bg-red-50 border rounded">Clear all local data</button>
      </div>
    </section>
  );
}

// ----------------------- main app -----------------------
export default function App() {
  const [medications, setMedications] = useState(() => load('mom_medications', []));
  const [appointments, setAppointments] = useState(() => load('mom_appointments', []));
  const [shopping, setShopping] = useState(() => load('mom_shopping', []));
  const [recipes, setRecipes] = useState(() => load('mom_recipes', []));
  const [photos, setPhotos] = useState(() => load('mom_photos', []));

  // Persist on change
  useEffect(() => save('mom_medications', medications), [medications]);
  useEffect(() => save('mom_appointments', appointments), [appointments]);
  useEffect(() => save('mom_shopping', shopping), [shopping]);
  useEffect(() => save('mom_recipes', recipes), [recipes]);
  useEffect(() => save('mom_photos', photos), [photos]);

  // notification ask state
  const [askedNotify, setAskedNotify] = useState(false);
  async function askNotify() {
    if (askedNotify) return;
    setAskedNotify(true);
    await ensureNotificationPermission();
  }

  useReminderWatcher({ medications, appointments }, askNotify);

  // CRUD helpers
  const medsAdd = (m) => setMedications((s) => [m, ...s]);
  const medsUpdate = (m) => setMedications((s) => s.map(x => x.id === m.id ? m : x));
  const medsRemove = (id) => setMedications((s) => s.filter(x => x.id !== id));

  const appsAdd = (a) => setAppointments((s) => [a, ...s]);
  const appsRemove = (id) => setAppointments((s) => s.filter(x => x.id !== id));

  const shopAdd = (it) => setShopping((s) => [it, ...s]);
  const shopToggle = (id) => setShopping(s => s.map(x => x.id === id ? { ...x, bought: !x.bought } : x));
  const shopRemove = (id) => setShopping(s => s.filter(x => x.id !== id));

  const recAdd = (r) => setRecipes(s => [r, ...s]);
  const recRemove = (id) => setRecipes(s => s.filter(x => x.id !== id));

  const photoAdd = (p) => setPhotos(s => [p, ...s]);
  const photoRemove = (id) => setPhotos(s => s.filter(x => x.id !== id));

  function exportAll() {
    const data = { medications, appointments, shopping, recipes, photos, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mom_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function importAll(data) {
    if (!data) return alert('No data found');
    if (!confirm('Replace local data with imported data?')) return;
    setMedications(data.medications || []);
    setAppointments(data.appointments || []);
    setShopping(data.shopping || []);
    setRecipes(data.recipes || []);
    setPhotos(data.photos || []);
    alert('Imported!');
  }

  function clearAll() {
    if (!confirm('Clear everything from this browser?')) return;
    setMedications([]); setAppointments([]); setShopping([]); setRecipes([]); setPhotos([]);
    localStorage.clear();
  }

  // small UI state
  const [showBackup, setShowBackup] = useState(false);

  const counts = { medications: medications.length, appointments: appointments.length, shopping: shopping.length };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white text-gray-800">
      <div className="max-w-5xl mx-auto">
        <Header onOpenBackup={() => setShowBackup(true)} onAskNotify={askNotify} />

        <Dashboard dataCounts={counts} />

        <main className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          <div className="space-y-4">
            <Medications meds={medications} onAdd={medsAdd} onUpdate={medsUpdate} onRemove={medsRemove} />
            <Appointments apps={appointments} onAdd={appsAdd} onUpdate={appsAdd} onRemove={appsRemove} />
          </div>
          <div className="space-y-4">
            <Shopping items={shopping} onAdd={shopAdd} onToggle={shopToggle} onRemove={shopRemove} />
            <Recipes recipes={recipes} onAdd={recAdd} onRemove={recRemove} />
          </div>
          <div className="md:col-span-2">
            <Photos photos={photos} onAdd={photoAdd} onRemove={photoRemove} />
          </div>
          <div className="md:col-span-2">
            <SettingsPanel onExport={exportAll} onImport={importAll} onClearAll={clearAll} />
          </div>
        </main>

        <footer className="p-4 text-center text-xs text-gray-500">Made with love — a simple helper to make everyday easier.</footer>
      </div>

      <Modal open={showBackup} onClose={() => setShowBackup(false)} title="Share / Backup">
        <div className="space-y-3">
          <p className="text-sm">You can export a JSON backup to save or send to family.</p>
          <div className="flex gap-2">
            <button onClick={exportAll} className="px-3 py-2 bg-pink-600 text-white rounded">Export now</button>
            <button onClick={() => {
              const data = { medications, appointments, shopping, recipes, photos, exportedAt: new Date().toISOString() };
              navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(data, null, 2));
              alert('Copied JSON to clipboard — paste it into a message to share.');
            }} className="px-3 py-2 bg-white border rounded">Copy JSON</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
