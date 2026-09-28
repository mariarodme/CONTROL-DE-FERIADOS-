"use strict";
const KEY = "jaco-jornadas-v5";
const companies = [
  "Condominio Monte Carlo",
  "Jacó Beach Onsite Management Services Ltda.",
];
const PEOPLE = [
  ["Harold Valverde", 0],
  ["Arlis Mejías Ramírez", 0],
  ["Nelson Ramón Icabalzeta", 0],
  ["Martín de los Santos", 0],
  ["Marlon Granados", 0],
  ["Cristian Chavarría", 0],
  ["Karen Enríquez", 1],
  ["María Beatriz Rodríguez", 1],
  ["Paula Urbina", 1],
  ["Álvaro Salas", 1],
  ["María Mercedes Torrez González", 1],
  ["Griselda Robles", 1],
];
const INITIAL_HOLIDAYS_2026 = [
  ["2026-01-01", "Año Nuevo"],
  ["2026-04-02", "Jueves Santo"],
  ["2026-04-03", "Viernes Santo"],
  ["2026-04-11", "Día de Juan Santamaría"],
  ["2026-05-01", "Día del Trabajador"],
  ["2026-07-25", "Anexión del Partido de Nicoya"],
  ["2026-08-15", "Día de la Madre"],
  ["2026-08-31", "Día de la Persona Negra y la Cultura Afrodescendiente"],
  ["2026-09-15", "Independencia de Costa Rica"],
  ["2026-12-25", "Navidad"],
];
// Calendario proyectado con las fechas vigentes; los años futuros se pueden editar.
const HOLY_WEEK_2027_2031 = {
  2027: ["03-25", "03-26"],
  2028: ["04-13", "04-14"],
  2029: ["03-29", "03-30"],
  2030: ["04-18", "04-19"],
  2031: ["04-10", "04-11"],
};
const ANNUAL_HOLIDAYS = [
  ["01-01", "Año Nuevo"],
  ["04-11", "Día de Juan Santamaría"],
  ["05-01", "Día del Trabajador"],
  ["07-25", "Anexión del Partido de Nicoya"],
  ["08-02", "Día de la Virgen de los Ángeles"],
  ["08-15", "Día de la Madre"],
  ["08-31", "Día de la Persona Negra y la Cultura Afrocostarricense"],
  ["09-15", "Independencia de Costa Rica"],
  ["12-01", "Abolición del Ejército"],
  ["12-25", "Navidad"],
];
function seedUpcomingHolidays(data) {
  if (data.upcomingHolidaySeedVersion === 1) return false;
  const existing = new Set(data.holidays.map((holiday) => holiday.date));
  for (const [yearText, [thursday, friday]] of Object.entries(HOLY_WEEK_2027_2031)) {
    const year = Number(yearText);
    const byDate = new Map(ANNUAL_HOLIDAYS);
    byDate.set(thursday, "Jueves Santo");
    byDate.set(friday, [byDate.get(friday), "Viernes Santo"].filter(Boolean).reverse().join(" · "));
    for (const [monthDay, name] of byDate) {
      const date = `${year}-${monthDay}`;
      if (!existing.has(date)) {
        data.holidays.push({id: id(), date, name});
        existing.add(date);
      }
    }
  }
  data.upcomingHolidaySeedVersion = 1;
  return true;
}
const TRACKING = {
  pendiente: "Pendiente",
  disfrutado: "Disfrutado",
  pago_pendiente: "Trabajado – Pago pendiente",
  pagado: "Trabajado – Pagado",
  no_aplica: "No aplica",
};
const $ = (s) => document.querySelector(s),
  escapeHtml = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const id = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID?.()) ||
  `${Date.now()}-${Math.random()}`;
const normalize = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
function load() {
  let data;
  try {
    data = JSON.parse(
      localStorage.getItem(KEY) ||
        localStorage.getItem("jaco-jornadas-v4") ||
        localStorage.getItem("jaco-jornadas-v3") ||
        localStorage.getItem("jaco-jornadas-v2") ||
        localStorage.getItem("jaco-jornadas-v1"),
    );
  } catch {}
  if (!data || !Array.isArray(data.employees) || !Array.isArray(data.entries))
    data = { employees: [], entries: [] };
  if (!data.seededEmployees) {
    for (const [name, c] of PEOPLE)
      if (
        !data.employees.some(
          (e) =>
            normalize(e.name) === normalize(name) && e.company === companies[c],
        )
      )
        data.employees.push({ id: id(), name, company: companies[c] });
    data.seededEmployees = true;
  }
  if (!Array.isArray(data.holidays))
    data.holidays = INITIAL_HOLIDAYS_2026.map(([date, name]) => ({
      id: id(),
      date,
      name,
    }));
  for (const e of data.entries) {
    if (!Object.hasOwn(TRACKING, e.trackingState))
      e.trackingState = "no_aplica";
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
  return data;
}
let state = load(),
  returnToCalendarDate = null,
  editing = null,
  editingEmployee = null,
  editingHoliday = null,
  teamFilter = "";
function businessSnapshot(data) {
  return JSON.parse(JSON.stringify({
    employees: data.employees || [], holidays: data.holidays || [], entries: data.entries || [],
  }));
}
let lastBusinessSnapshot = businessSnapshot(state);
function historyDescription(entity, value) {
  if (!value) return "";
  if (entity === "colaborador") return `${value.name} · ${value.company}`;
  if (entity === "feriado") return `${displayDate(value.date)} · ${value.name}`;
  return `${displayDate(value.date)} · ${value.type === "feriado" ? "Feriado" : "Ordinario"} · ${TRACKING[value.trackingState] || TRACKING.no_aplica}${value.note ? " · " + value.note : ""}`;
}
function collectHistoryChanges(previous, current) {
  const actor = window.jornadasCloud?.actor?.() || "Este dispositivo";
  const at = new Date().toISOString();
  const people = new Map([...previous.employees, ...current.employees].map((person) => [person.id, person]));
  const events = [];
  for (const [key, entity] of [["employees", "colaborador"], ["holidays", "feriado"], ["entries", "registro"]]) {
    const oldById = new Map(previous[key].map((item) => [item.id, item]));
    const newById = new Map(current[key].map((item) => [item.id, item]));
    for (const itemId of new Set([...oldById.keys(), ...newById.keys()])) {
      const before = oldById.get(itemId);
      const after = newById.get(itemId);
      if (JSON.stringify(before) === JSON.stringify(after)) continue;
      const value = after || before;
      const person = entity === "registro" ? people.get(value.employeeId) : null;
      events.push({
        id: id(), at, actor, entity,
        action: !before ? "Creó" : !after ? "Eliminó" : "Editó",
        title: entity === "registro" ? `${person?.name || "Colaborador eliminado"} · ${displayDate(value.date)}`
          : entity === "feriado" ? value.name : value.name,
        company: entity === "colaborador" ? value.company : person?.company || "",
        before: historyDescription(entity, before),
        after: historyDescription(entity, after),
      });
    }
  }
  return events;
}
function save(options = {}) {
  const previousHistory = state.history;
  const current = businessSnapshot(state);
  const actor = window.jornadasCloud?.actor?.() || "Este dispositivo";
  const changes = options.importSummary
    ? [{id: id(), at: new Date().toISOString(), actor, entity: "respaldo", action: "Importó",
        title: "Respaldo JSON", company: "", before: "", after: options.importSummary}]
    : collectHistoryChanges(lastBusinessSnapshot, current);
  if (changes.length) state.history = [...(state.history || []), ...changes];
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    lastBusinessSnapshot = current;
    render();
    window.jornadasCloud?.changed();
  } catch {
    state.history = previousHistory;
    alert("No se pudo guardar. Descargá un respaldo y liberá espacio antes de continuar.");
  }
}
function displayDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return s || "";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}
function employee(x) {
  return state.employees.find((e) => e.id === x.employeeId);
}
function filters() {
  return state.entries
    .filter((x) => {
      const e = employee(x),
        month = $("#month").value;
      return (
        (!month || x.date.startsWith(month)) &&
        (!$("#search").value ||
          normalize(e?.name || "").includes(normalize($("#search").value))) &&
        (!$("#companyFilter").value ||
          e?.company === $("#companyFilter").value) &&
        (!$("#typeFilter").value || x.type === $("#typeFilter").value) &&
        (!$("#holidayFilter").value || x.date === $("#holidayFilter").value) &&
        (!$("#trackingFilter").value ||
          x.trackingState === $("#trackingFilter").value)
      );
    })
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        String(employee(a)?.name).localeCompare(
          String(employee(b)?.name),
          "es",
        ),
    );
}
function renderHolidayFilter() {
  const select = $("#holidayFilter");
  const selected = select.value;
  const month = $("#month").value;
  const holidays = [...state.holidays].sort((a, b) => a.date.localeCompare(b.date));
  const years = [...new Set(holidays.map((x) => x.date.slice(0, 4)))];
  select.innerHTML = '<option value="">Todos los feriados</option>' +
    years.map((year) => `<optgroup label="${escapeHtml(year)}">${holidays
      .filter((x) => x.date.startsWith(year + "-"))
      .map((x) => `<option value="${escapeHtml(x.date)}">${escapeHtml(displayDate(x.date))} · ${escapeHtml(x.name)}</option>`)
      .join("")}</optgroup>`).join("");
  select.value = selected && selected.startsWith(month) ? selected : "";
}
function renderEmployeeCard(person) {
  const entries = state.entries.filter((entry) => entry.employeeId === person.id);
  const counts = [
    ["Registros", entries.length, "total"],
    ["Disfrutados", entries.filter((entry) => entry.trackingState === "disfrutado").length, "enjoyed"],
    ["Pagados", entries.filter((entry) => entry.trackingState === "pagado").length, "paid"],
    ["Pendientes", entries.filter((entry) => ["pendiente", "pago_pendiente"].includes(entry.trackingState)).length, "pending"],
  ];
  const initials = person.name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toLocaleUpperCase("es")).join("");
  const shortCompany = person.company === companies[0] ? "Monte Carlo" : "Jacó Beach Onsite";
  return `<article class="person-card">
    <div class="person-card-head"><span class="person-avatar" aria-hidden="true">${escapeHtml(initials)}</span><div class="person-identity"><h4>${escapeHtml(person.name)}</h4><small>${escapeHtml(shortCompany)}</small></div></div>
    <div class="person-stats">${counts.map(([label, count, tone]) => `<div class="person-stat person-stat-${tone}"><span>${label}</span><strong>${count}</strong></div>`).join("")}</div>
    <div class="person-actions"><button type="button" class="person-add" data-new-for-employee="${escapeHtml(person.id)}" aria-label="Registrar día para ${escapeHtml(person.name)}">+ Registrar día</button><button type="button" class="link" data-edit-employee="${escapeHtml(person.id)}" aria-label="Editar a ${escapeHtml(person.name)}">Editar</button><button type="button" class="link danger" data-remove-employee="${escapeHtml(person.id)}" aria-label="Eliminar a ${escapeHtml(person.name)}">Eliminar</button></div>
  </article>`;
}
function renderHistory() {
  const search = normalize($("#historySearch").value.trim());
  const type = $("#historyType").value;
  const events = [...(Array.isArray(state.history) ? state.history : [])]
    .filter((event) => (!type || event.entity === type) &&
      (!search || normalize([event.title, event.actor, event.before, event.after].join(" ")).includes(search)))
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
  $("#historyCount").textContent = `${events.length} movimiento${events.length === 1 ? "" : "s"}`;
  let previousDay = "";
  $("#historyList").innerHTML = events.length ? events.map((event) => {
    const date = new Date(event.at);
    const validDate = !Number.isNaN(date.valueOf());
    const day = validDate ? new Intl.DateTimeFormat("es-CR", {dateStyle: "long", timeZone: "America/Costa_Rica"}).format(date) : "Fecha desconocida";
    const time = validDate ? new Intl.DateTimeFormat("es-CR", {timeStyle: "short", timeZone: "America/Costa_Rica"}).format(date) : "";
    const heading = day !== previousDay ? `<h3 class="history-day">${escapeHtml(day)}</h3>` : "";
    previousDay = day;
    const kind = {registro: "Registro", feriado: "Feriado", colaborador: "Colaborador", respaldo: "Importación"}[event.entity] || "Cambio";
    return `${heading}<article class="history-item">
      <div class="history-top"><span class="history-kind history-kind-${escapeHtml(event.entity)}">${escapeHtml(kind)}</span><span class="history-time">${escapeHtml(time)}</span></div>
      <h4>${escapeHtml(event.action)} · ${escapeHtml(event.title)}</h4>
      <p class="history-actor">${escapeHtml(event.actor || "Este dispositivo")}${event.company ? " · " + escapeHtml(event.company) : ""}</p>
      ${event.before || event.after ? `<div class="history-diff">
        ${event.before ? `<div><span>ANTES</span><p>${escapeHtml(event.before)}</p></div>` : ""}
        ${event.after ? `<div><span>DESPUÉS</span><p>${escapeHtml(event.after)}</p></div>` : ""}
      </div>` : ""}
    </article>`;
  }).join("") : '<p class="history-empty">Todavía no hay movimientos para mostrar con estos filtros. Los cambios nuevos aparecerán aquí.</p>';
}
$("#historySearch").addEventListener("input", renderHistory);
$("#historyType").addEventListener("change", renderHistory);
function render() {
  const month = $("#month").value,
    period = state.entries.filter((x) => !month || x.date.startsWith(month));
  $("#controlMonth").value = month;
  renderHolidayFilter();
  for (const [elementId, value] of [
    ["pending", "pendiente"],
    ["enjoyed", "disfrutado"],
    ["paymentPending", "pago_pendiente"],
    ["paid", "pagado"],
  ])
    $(`#${elementId}`).textContent = period.filter(
      (x) => x.trackingState === value,
    ).length;
  const rows = filters();
  $("#resultCount").textContent =
    `${rows.length} registro${rows.length === 1 ? "" : "s"}`;
  $("#empty").hidden = rows.length > 0;
  $("#rows").innerHTML = rows
    .map(
      (x) =>
        `<tr><td data-label="Fecha">${escapeHtml(displayDate(x.date))}</td><td data-label="Colaborador">${escapeHtml(employee(x)?.name || "Colaborador eliminado")}</td><td data-label="Empresa">${escapeHtml(employee(x)?.company || "—")}</td><td data-label="Tipo"><span class="pill ${x.type === "feriado" ? "feriado" : ""}">${x.type === "feriado" ? "Feriado" : "Ordinario"}</span></td><td data-label="Estado"><span class="tracking tracking-${escapeHtml(x.trackingState || "no_aplica")}"><span class="tracking-dot" aria-hidden="true"></span>${escapeHtml(TRACKING[x.trackingState] || TRACKING.no_aplica)}</span></td><td data-label="Comentarios">${escapeHtml(x.note) || '<span class="muted">—</span>'}</td><td data-label="Acciones"><div class="actions"><button class="link" data-edit="${escapeHtml(x.id)}">Editar</button><button class="link danger" data-delete="${escapeHtml(x.id)}">Eliminar</button></div></td></tr>`,
    )
    .join("");
  const visiblePeople = state.employees.filter((person) => !teamFilter || person.company === teamFilter);
  const visibleEntries = state.entries.filter((entry) => visiblePeople.some((person) => person.id === entry.employeeId));
  $("#teamOverview").textContent = `${visiblePeople.length} colaborador${visiblePeople.length === 1 ? "" : "es"} · ${visibleEntries.length} registro${visibleEntries.length === 1 ? "" : "s"}`;
  $("#employees").innerHTML = state.employees.length
    ? companies.filter((company) => !teamFilter || company === teamFilter)
        .map((company) => {
          const members = state.employees.filter((person) => person.company === company)
            .sort((a, b) => a.name.localeCompare(b.name, "es"));
          return `<section class="team-group"><div class="team-header"><div><span class="team-eyebrow">EMPRESA</span><h3>${escapeHtml(company)}</h3></div><span class="team-count">${members.length} colaborador${members.length === 1 ? "" : "es"}</span></div>
            <div class="team-list">${members.length ? members.map(renderEmployeeCard).join("") : '<p class="team-empty">Todavía no hay colaboradores en esta empresa.</p>'}</div></section>`;
        }).join("")
    : '<p class="empty">Agregá colaboradores para comenzar.</p>';
  renderHolidays();
  $("#entryForm").elements.employeeId.innerHTML = state.employees
    .map(
      (e) =>
        `<option value="${escapeHtml(e.id)}">${escapeHtml(e.name)} · ${escapeHtml(e.company)}</option>`,
    )
    .join("");
  renderCalendar();
  renderMatrix();
  renderPending();
  renderReports();
  renderHistory();
}
function renderHolidays() {
  const year = $("#holidayYear").value;
  const matches = state.holidays
    .filter((holiday) => holiday.date.startsWith(year + "-"))
    .sort((a, b) => a.date.localeCompare(b.date));
  const linked = state.entries.filter((entry) => matches.some((holiday) => holiday.date === entry.date));
  $("#holidaySummary").textContent = `${matches.length} feriado${matches.length === 1 ? "" : "s"} · ${linked.length} registro${linked.length === 1 ? "" : "s"} asociado${linked.length === 1 ? "" : "s"}`;
  $("#holidays").innerHTML = matches.length ? matches.map((holiday) => {
    const date = new Date(holiday.date + "T12:00:00Z");
    const month = new Intl.DateTimeFormat("es-CR", {month: "short", timeZone: "UTC"}).format(date).replace(".", "").toLocaleUpperCase("es");
    const weekday = new Intl.DateTimeFormat("es-CR", {weekday: "long", timeZone: "UTC"}).format(date);
    const records = state.entries.filter((entry) => entry.date === holiday.date);
    const pending = records.filter((entry) => ["pendiente", "pago_pendiente"].includes(entry.trackingState)).length;
    return `<article class="holiday-card">
      <div class="holiday-card-main">
        <time class="holiday-date" datetime="${escapeHtml(holiday.date)}"><span>${escapeHtml(month)}</span><strong>${escapeHtml(holiday.date.slice(8, 10))}</strong></time>
        <div class="holiday-details"><span class="holiday-eyebrow">${escapeHtml(weekday)} · ${escapeHtml(year)}</span><h3>${escapeHtml(holiday.name)}</h3>
          <div class="holiday-meta"><span>${records.length} registro${records.length === 1 ? "" : "s"}</span>${pending ? `<span class="holiday-pending">${pending} pendiente${pending === 1 ? "" : "s"}</span>` : ""}</div>
        </div>
      </div>
      <div class="holiday-actions"><button type="button" class="secondary holiday-bulk-button" data-bulk-holiday="${escapeHtml(holiday.date)}" aria-label="Registrar colaboradores para ${escapeHtml(holiday.name)}">Registrar colaboradores</button><button type="button" class="link" data-edit-holiday="${escapeHtml(holiday.id)}" aria-label="Editar ${escapeHtml(holiday.name)}">Editar</button><button type="button" class="link danger" data-delete-holiday="${escapeHtml(holiday.id)}" aria-label="Eliminar ${escapeHtml(holiday.name)}">Eliminar</button></div>
    </article>`;
  }).join("") : '<p class="empty holiday-empty">No hay feriados registrados para este año. Agregá el primero con el botón de arriba.</p>';
}
function renderCalendar() {
  const month = $("#month").value;
  if (!/^\d{4}-\d{2}$/.test(month)) return;
  const [year, number] = month.split("-").map(Number);
  const start = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, number, 0)).getUTCDate();
  $("#calendarTitle").textContent = new Intl.DateTimeFormat("es-CR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, number - 1, 1)));
  const labels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const cells = labels.map((day) => `<div class="calendar-weekday">${day}</div>`);
  for (let i = 0; i < start; i++) cells.push('<div class="calendar-blank" aria-hidden="true"></div>');
  for (let day = 1; day <= length; day++) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const holiday = state.holidays.find((x) => x.date === date)?.name;
    const entries = state.entries.filter((x) => x.date === date);
    const visibleEntries = entries.slice(0, 3);
    const entryList = visibleEntries.length
      ? `<div class="day-entries">${visibleEntries.map((entry) => {
          const person = employee(entry);
          const label = `${person?.name || "Colaborador eliminado"} · ${TRACKING[entry.trackingState] || TRACKING.no_aplica}`;
          return `<span class="day-entry tracking-${escapeHtml(entry.trackingState || "no_aplica")}" title="${escapeHtml(label)}"><span class="tracking-dot" aria-hidden="true"></span><span class="day-entry-text">${escapeHtml(label)}</span></span>`;
        }).join("")}${entries.length > visibleEntries.length ? `<span class="day-more">+${entries.length - visibleEntries.length} más</span>` : ""}</div>`
      : "";
    cells.push(`<button type="button" class="calendar-day${holiday ? " is-holiday" : ""}" data-calendar-date="${date}" aria-label="${day} de ${escapeHtml($("#calendarTitle").textContent)}: ${entries.length} registros${holiday ? `, ${escapeHtml(holiday)}` : ""}"><span class="day-number">${day}</span>${holiday ? `<small class="day-holiday">${escapeHtml(holiday)}</small>` : ""}${entryList}${entries.length ? `<span class="day-count">${entries.length} registro${entries.length === 1 ? "" : "s"}</span>` : ""}</button>`);
  }
  $("#calendarGrid").innerHTML = cells.join("");
}
function openCalendarDay(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const dialog = $("#calendarDayDialog");
  const holiday = state.holidays.find((x) => x.date === date);
  const entries = state.entries
    .filter((x) => x.date === date)
    .sort((a, b) => (employee(a)?.company || "").localeCompare(employee(b)?.company || "", "es") ||
      (employee(a)?.name || "").localeCompare(employee(b)?.name || "", "es"));
  dialog.dataset.date = date;
  $("#calendarDayTitle").textContent = new Intl.DateTimeFormat("es-CR", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(date + "T12:00:00Z"));
  $("#calendarDayHoliday").textContent = holiday ? holiday.name : "Día sin feriado registrado";
  $("#calendarDayBulk").hidden = !holiday;
  $("#calendarDayCount").textContent = `${entries.length} colaborador${entries.length === 1 ? "" : "es"} registrado${entries.length === 1 ? "" : "s"}`;
  $("#calendarDayEntries").innerHTML = entries.length
    ? entries.map((x) => `<div class="calendar-detail-row">
        <div class="calendar-detail-person"><strong>${escapeHtml(employee(x)?.name || "Colaborador eliminado")}</strong><small>${escapeHtml(employee(x)?.company || "—")} · ${x.type === "feriado" ? "Feriado" : "Ordinario"}</small></div>
        <span class="tracking tracking-${escapeHtml(x.trackingState || "no_aplica")}"><span class="tracking-dot" aria-hidden="true"></span>${escapeHtml(TRACKING[x.trackingState] || TRACKING.no_aplica)}</span>
        ${x.note ? `<p class="calendar-detail-note">${escapeHtml(x.note)}</p>` : ""}
        <button type="button" class="secondary calendar-detail-edit" data-day-edit="${escapeHtml(x.id)}" aria-label="Editar registro de ${escapeHtml(employee(x)?.name || "colaborador")}">Editar</button>
      </div>`).join("")
    : '<p class="calendar-detail-empty">No hay colaboradores registrados en esta fecha.</p>';
  dialog.showModal();
}
function renderMatrix() {
  const year = Number($("#matrixYear").value);
  const datesByDay = new Map(
    state.holidays.filter((x) => x.date.startsWith(`${year}-`)).map((x) => [x.date, x.name]),
  );
  for (const entry of state.entries)
    if (entry.type === "feriado" && entry.date.startsWith(`${year}-`) && !datesByDay.has(entry.date))
      datesByDay.set(entry.date, "Feriado registrado");
  const dates = [...datesByDay].sort(([a], [b]) => a.localeCompare(b));
  const company = $("#matrixCompany").value;
  const people = state.employees.filter((person) => !company || person.company === company)
    .sort((a,b) => a.company.localeCompare(b.company,"es") || a.name.localeCompare(b.name,"es"));
  $("#matrixEmpty").hidden = dates.length > 0 && people.length > 0;
  $("#matrixEmpty").textContent = dates.length === 0
    ? "No hay feriados ni registros para este año."
    : "No hay colaboradores en la empresa seleccionada.";
  $("#matrixHead").innerHTML = `<tr><th>Colaborador</th>${dates.map(([date, name]) => `<th title="${escapeHtml(name)}">${escapeHtml(displayDate(date).slice(0, 5))}<small>${escapeHtml(name)}</small></th>`).join("")}</tr>`;
  $("#matrixBody").innerHTML = people.map((person) => `<tr><th scope="row"><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(person.company)}</small></th>${dates.map(([date]) => { const entry = state.entries.find((x) => x.employeeId === person.id && x.date === date); return `<td>${entry ? `<span class="tracking tracking-${escapeHtml(entry.trackingState)}"><span class="tracking-dot" aria-hidden="true"></span>${escapeHtml(TRACKING[entry.trackingState])}</span>` : '<span class="muted">—</span>'}</td>`; }).join("")}</tr>`).join("");
}
function renderPending() {
  const entries = state.entries.filter((x) => x.trackingState === "pendiente" || x.trackingState === "pago_pendiente").sort((a,b) => a.date.localeCompare(b.date));
  $("#pendingCount").textContent = `${entries.length} pendiente${entries.length === 1 ? "" : "s"}`;
  $("#pendingList").innerHTML = entries.length ? entries.map((x) => `<div class="pending-item"><div><strong>${escapeHtml(employee(x)?.name || "Colaborador eliminado")}</strong><small>${escapeHtml(employee(x)?.company || "—")} · ${escapeHtml(displayDate(x.date))}</small></div><span class="tracking tracking-${escapeHtml(x.trackingState)}"><span class="tracking-dot" aria-hidden="true"></span>${escapeHtml(TRACKING[x.trackingState])}</span><button type="button" class="link" data-edit="${escapeHtml(x.id)}">Editar</button></div>`).join("") : '<p class="empty">No hay registros pendientes.</p>';
}
const REPORT_LABELS = {
  mensual: ["Reporte mensual", "Detalle de feriados y días laborados por mes."],
  anual: ["Reporte anual", "Detalle de feriados y días laborados del año."],
  pendientes: ["Pendientes al cierre", "Estados pendientes con fecha hasta el cierre elegido."],
};
let reportKind = "mensual";
function reportRecords() {
  const company = $("#reportCompany").value;
  const year = $("#reportYear").value;
  const month = $("#reportMonth").value;
  const cutoff = $("#reportCutoff").value;
  return state.entries
    .filter((entry) => {
      const person = employee(entry);
      if (company && person?.company !== company) return false;
      if (reportKind === "mensual") return entry.date.startsWith(year + "-" + month);
      if (reportKind === "anual") return entry.date.startsWith(year + "-");
      return !!cutoff && entry.date <= cutoff &&
        ["pendiente", "pago_pendiente"].includes(entry.trackingState);
    })
    .sort((a,b) => a.date.localeCompare(b.date) ||
      (employee(a)?.company || "").localeCompare(employee(b)?.company || "", "es") ||
      (employee(a)?.name || "").localeCompare(employee(b)?.name || "", "es"));
}
function reportPeriodText() {
  if (reportKind === "pendientes") return "Corte al " + displayDate($("#reportCutoff").value);
  if (reportKind === "anual") return "Año " + $("#reportYear").value;
  const monthName = $("#reportMonth").selectedOptions[0]?.textContent || "";
  return monthName + " de " + $("#reportYear").value;
}
function renderReports() {
  $("#reportDownloadStatus").textContent = "";
  const yearSelect = $("#reportYear");
  const selectedYear = yearSelect.value || String(new Date().getFullYear());
  const years = [...new Set([String(new Date().getFullYear()),
    ...state.holidays.map((x) => x.date.slice(0,4)),
    ...state.entries.map((x) => x.date.slice(0,4))])]
    .filter((x) => /^\d{4}$/.test(x)).sort((a,b) => b.localeCompare(a));
  yearSelect.innerHTML = years.map((year) => `<option value="${year}">${year}</option>`).join("");
  yearSelect.value = years.includes(selectedYear) ? selectedYear : years[0];
  const [title, subtitle] = REPORT_LABELS[reportKind];
  $("#reportTitle").textContent = title;
  $("#reportSubtitle").textContent = subtitle;
  $("#reportMonthWrap").hidden = reportKind !== "mensual";
  $("#reportYearWrap").hidden = reportKind === "pendientes";
  $("#reportCutoffWrap").hidden = reportKind !== "pendientes";
  document.querySelectorAll("[data-report-kind]").forEach((button) =>
    button.setAttribute("aria-selected", String(button.dataset.reportKind === reportKind)));
  $("#reportPeriod").textContent = reportPeriodText() +
    " · " + ($("#reportCompany").selectedOptions[0]?.textContent || "Todas las empresas");
  const rows = reportRecords();
  const counts = [
    ["Registros", rows.length],
    ["Pendiente", rows.filter((x) => x.trackingState === "pendiente").length],
    ["Disfrutado", rows.filter((x) => x.trackingState === "disfrutado").length],
    ["Pago pendiente", rows.filter((x) => x.trackingState === "pago_pendiente").length],
    ["Pagado", rows.filter((x) => x.trackingState === "pagado").length],
  ];
  $("#reportSummary").innerHTML = counts.map(([label, count]) =>
    `<div><span>${label}</span><strong>${count}</strong></div>`).join("");
  const holidayNames = new Map(state.holidays.map((x) => [x.date, x.name]));
  $("#reportRows").innerHTML = rows.map((entry) => {
    const person = employee(entry);
    const dayName = holidayNames.get(entry.date) ||
      (entry.type === "feriado" ? "Feriado registrado" : "Día ordinario");
    return `<tr><td>${escapeHtml(displayDate(entry.date))}</td><td>${escapeHtml(dayName)}</td><td>${escapeHtml(person?.name || "Colaborador eliminado")}</td><td>${escapeHtml(person?.company || "—")}</td><td>${escapeHtml(TRACKING[entry.trackingState] || TRACKING.no_aplica)}</td><td>${escapeHtml(entry.note || "—")}</td></tr>`;
  }).join("");
  $("#reportEmpty").hidden = rows.length > 0;
  $("#reportFootnote").textContent = reportKind === "pendientes"
    ? "Se muestran los registros fechados hasta el cierre que actualmente tienen estado Pendiente o Trabajado – Pago pendiente."
    : "Los estados reflejan la información actual de los registros.";
}
function openEntry(x, selectedDate) {
  if (!state.employees.length) {
    alert("Primero agregá al menos un colaborador.");
    return;
  }
  editing = x?.id || null;
  const f = $("#entryForm");
  f.reset();
  f.elements.date.value = x?.date || selectedDate || new Date().toLocaleDateString("en-CA");
  if (x) {
    for (const k of ["employeeId", "date", "type", "note"])
      f.elements[k].value = x[k] ?? "";
  } else f.elements.type.value = "feriado";
  f.elements.trackingState.value = x?.trackingState || "";
  $("#dialogTitle").textContent = x ? "Editar registro" : "Nuevo registro";
  $("#entryDialog").showModal();
}
$("#calendarDayClose").onclick = () => $("#calendarDayDialog").close();
function closeCalendarDayFromOutside(event) {
  const dialog = $("#calendarDayDialog");
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom) {
    event.preventDefault();
    dialog.close();
  }
}
$("#calendarDayDialog").addEventListener("click", closeCalendarDayFromOutside);
$("#calendarDayDialog").addEventListener("contextmenu", closeCalendarDayFromOutside);
$("#calendarDayAdd").onclick = () => {
  const date = $("#calendarDayDialog").dataset.date;
  returnToCalendarDate = date;
  $("#calendarDayDialog").close();
  openEntry(null, date);
};
$("#calendarDayBulk").onclick = () => {
  const date = $("#calendarDayDialog").dataset.date;
  $("#calendarDayDialog").close();
  openBulk(date);
};
$("#entryDialog").addEventListener("close", () => {
  if (returnToCalendarDate) {
    const date = returnToCalendarDate;
    returnToCalendarDate = null;
    openCalendarDay(date);
  }
});
$("#newEntry").onclick = () => openEntry();
$("#newEntryFromControl").onclick = () => openEntry();
$("#bulkFromControl").onclick = () => openBulk();
$("#closeDialog").onclick = $("#cancelDialog").onclick = () =>
  $("#entryDialog").close();
$("#entryForm").onsubmit = (e) => {
  e.preventDefault();
  const f = e.currentTarget,
    v = Object.fromEntries(new FormData(f));
  if (!state.employees.some((x) => x.id === v.employeeId))
    return alert("Seleccioná un colaborador válido.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date))
    return alert("Ingresá una fecha válida.");
  if (!Object.hasOwn(TRACKING, v.trackingState))
    return alert("Seleccioná un estado válido.");
  if (
    state.entries.some(
      (x) =>
        x.employeeId === v.employeeId && x.date === v.date && x.id !== editing,
    )
  )
    return alert(
      "Ese colaborador ya tiene un registro en esta fecha. Editá el existente.",
    );
  const record = {
    id: editing || id(),
    employeeId: v.employeeId,
    date: v.date,
    type: v.type,
    trackingState: v.trackingState,
    note: v.note.trim(),
  };
  if (editing)
    state.entries = state.entries.map((x) => (x.id === editing ? record : x));
  else state.entries.push(record);
  $("#entryDialog").close();
  save();
};
function openEmployee(e) {
  editingEmployee = e?.id || null;
  const f = $("#employeeForm");
  f.reset();
  if (e) {
    f.elements.name.value = e.name;
    f.elements.company.value = e.company;
  }
  $("#employeeDialogTitle").textContent = e
    ? "Editar colaborador"
    : "Agregar colaborador";
  $("#employeeDialog").showModal();
  f.elements.name.focus();
}
$("#addEmployee").onclick = () => openEmployee();
$("#closeEmployeeDialog").onclick = $("#cancelEmployeeDialog").onclick = () =>
  $("#employeeDialog").close();
$("#employeeForm").onsubmit = (event) => {
  event.preventDefault();
  const f = event.currentTarget,
    name = f.elements.name.value.trim().replace(/\s+/g, " "),
    company = f.elements.company.value;
  if (!name) return alert("Ingresá el nombre.");
  if (!companies.includes(company)) return alert("Seleccioná una empresa.");
  if (
    state.employees.some(
      (e) =>
        e.id !== editingEmployee &&
        normalize(e.name) === normalize(name) &&
        e.company === company,
    )
  )
    return alert("Ya existe ese colaborador en esa empresa.");
  if (editingEmployee) {
    const e = state.employees.find((x) => x.id === editingEmployee);
    if (!e) return alert("No se encontró el colaborador.");
    e.name = name;
    e.company = company;
  } else state.employees.push({ id: id(), name, company });
  $("#employeeDialog").close();
  save();
};
const bulkDraft = new Map();
let bulkDate = "";
function renderBulkRows() {
  const date = $("#bulkHoliday").value;
  const company = $("#bulkCompany").value;
  const people = state.employees.filter((person) => !company || person.company === company)
    .sort((a, b) => a.company.localeCompare(b.company, "es") || a.name.localeCompare(b.name, "es"));
  const registered = people.filter((person) =>
    state.entries.some((entry) => entry.date === date && entry.employeeId === person.id)).length;
  $("#bulkCount").textContent = `${people.length} colaborador${people.length === 1 ? "" : "es"} · ${registered} con registro en esta fecha`;
  $("#bulkRows").innerHTML = people.length ? people.map((person) => {
    const existing = state.entries.find((entry) => entry.date === date && entry.employeeId === person.id);
    if (!bulkDraft.has(person.id))
      bulkDraft.set(person.id, {status: existing?.trackingState || "", note: existing?.note || ""});
    const draft = bulkDraft.get(person.id);
    const shortCompany = person.company === companies[0] ? "Monte Carlo" : "Jacó Beach Onsite";
    return `<div class="bulk-row" data-bulk-person="${escapeHtml(person.id)}">
      <div class="bulk-person"><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(shortCompany)}${existing ? " · Ya registrado" : ""}</small></div>
      <label class="field">Estado
        <select data-bulk-state aria-label="Estado de ${escapeHtml(person.name)}">
          <option value="">Sin registrar / no cambiar</option>
          ${Object.entries(TRACKING).map(([value, label]) => `<option value="${value}"${draft.status === value ? " selected" : ""}>${escapeHtml(label)}</option>`).join("")}
        </select>
      </label>
      <label class="field">Comentario
        <input data-bulk-note aria-label="Comentario de ${escapeHtml(person.name)}" maxlength="500" value="${escapeHtml(draft.note)}" placeholder="Opcional" />
      </label>
    </div>`;
  }).join("") : '<p class="empty">No hay colaboradores en esta empresa.</p>';
}
function collectBulkChanges(date) {
  const changes = [];
  for (const [employeeId, draft] of bulkDraft) {
    if (!state.employees.some((person) => person.id === employeeId)) continue;
    const note = draft.note.trim();
    const existing = state.entries.find((entry) => entry.date === date && entry.employeeId === employeeId);
    if (!draft.status) continue;
    if (!Object.hasOwn(TRACKING, draft.status)) continue;
    if (!existing || existing.trackingState !== draft.status || (existing.note || "") !== note || existing.type !== "feriado")
      changes.push({employeeId, existing, status: draft.status, note});
  }
  return changes;
}
function openBulk(preferredDate) {
  if (!state.employees.length) return alert("Primero agregá al menos un colaborador.");
  const holidays = [...state.holidays].sort((a, b) => a.date.localeCompare(b.date));
  if (!holidays.length) return alert("Primero agregá un feriado.");
  $("#bulkHoliday").innerHTML = holidays.map((holiday) =>
    `<option value="${escapeHtml(holiday.date)}">${escapeHtml(displayDate(holiday.date))} · ${escapeHtml(holiday.name)}</option>`).join("");
  const today = new Date().toLocaleDateString("en-CA");
  const fallback = holidays.find((holiday) => holiday.date >= today)?.date || holidays[holidays.length - 1].date;
  bulkDate = holidays.some((holiday) => holiday.date === preferredDate) ? preferredDate : fallback;
  $("#bulkHoliday").value = bulkDate;
  $("#bulkCompany").value = $("#companyFilter").value || "";
  bulkDraft.clear();
  renderBulkRows();
  $("#bulkDialog").showModal();
  $("#bulkHoliday").focus();
  $("#bulkDialog").scrollTop = 0;
}
$("#bulkRows").addEventListener("input", (event) => {
  const row = event.target.closest("[data-bulk-person]");
  if (!row) return;
  bulkDraft.set(row.dataset.bulkPerson, {
    status: row.querySelector("[data-bulk-state]").value,
    note: row.querySelector("[data-bulk-note]").value,
  });
});
$("#bulkRows").addEventListener("change", (event) => {
  if (event.target.matches("[data-bulk-state]"))
    event.target.dispatchEvent(new Event("input", {bubbles: true}));
});
$("#bulkCompany").addEventListener("change", renderBulkRows);
$("#bulkHoliday").addEventListener("change", () => {
  if (collectBulkChanges(bulkDate).length &&
      !confirm("Hay cambios sin guardar. ¿Cambiar de feriado y descartarlos?")) {
    $("#bulkHoliday").value = bulkDate;
    return;
  }
  bulkDate = $("#bulkHoliday").value;
  bulkDraft.clear();
  renderBulkRows();
});
$("#closeBulkDialog").onclick = $("#cancelBulkDialog").onclick = () => $("#bulkDialog").close();
$("#bulkDialog").addEventListener("click", (event) => {
  const box = $("#bulkDialog").getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right ||
      event.clientY < box.top || event.clientY > box.bottom) $("#bulkDialog").close();
});
$("#bulkForm").onsubmit = (event) => {
  event.preventDefault();
  const date = $("#bulkHoliday").value;
  if (!state.holidays.some((holiday) => holiday.date === date))
    return alert("Seleccioná un feriado válido.");
  if ([...bulkDraft.values()].some((draft) => !draft.status && draft.note.trim()))
    return alert("Hay un comentario sin estado. Escogé el estado de esa persona o borrá el comentario.");
  const changes = collectBulkChanges(date);
  if (!changes.length) return alert("No hay cambios para guardar.");
  for (const change of changes) {
    if (change.existing) {
      change.existing.trackingState = change.status;
      change.existing.note = change.note;
      change.existing.type = "feriado";
    } else state.entries.push({
      id: id(), employeeId: change.employeeId, date, type: "feriado",
      trackingState: change.status, note: change.note,
    });
  }
  $("#month").value = date.slice(0, 7);
  $("#holidayYear").value = date.slice(0, 4);
  $("#bulkDialog").close();
  save();
};
function openHoliday(holiday) {
  editingHoliday = holiday?.id || null;
  const form = $("#holidayForm");
  form.reset();
  form.elements.name.value = holiday?.name || "";
  form.elements.date.value = holiday?.date || `${$("#holidayYear").value}-01-01`;
  $("#holidayDialogTitle").textContent = holiday ? "Editar feriado" : "Agregar feriado";
  $("#holidayDialog").showModal();
  form.elements.name.focus();
}
$("#addHoliday").onclick = () => openHoliday();
$("#closeHolidayDialog").onclick = $("#cancelHolidayDialog").onclick = () => $("#holidayDialog").close();
$("#holidayForm").onsubmit = (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = form.elements.name.value.trim().replace(/\s+/g, " ");
  const date = form.elements.date.value;
  if (!name) return alert("Escribí el nombre del feriado.");
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date)
    return alert("Seleccioná una fecha válida.");
  if (state.holidays.some((x) => x.date === date && x.id !== editingHoliday))
    return alert("Ya existe un feriado en esa fecha. Editá el existente.");
  const holiday = {id: editingHoliday || id(), name, date};
  if (editingHoliday) state.holidays = state.holidays.map((x) => x.id === editingHoliday ? holiday : x);
  else state.holidays.push(holiday);
  $("#holidayYear").value = date.slice(0, 4);
  $("#holidayDialog").close();
  save();
};
document.querySelectorAll("[data-team-filter]").forEach(
  (button) =>
    (button.onclick = () => {
      teamFilter = button.dataset.teamFilter;
      document.querySelectorAll("[data-team-filter]").forEach((b) => {
        b.classList.toggle("active", b === button);
        b.setAttribute("aria-pressed", String(b === button));
      });
      render();
    }),
);
document.addEventListener("click", (e) => {
  const edit = e.target.closest("[data-edit]"),
    calendarDate = e.target.closest("[data-calendar-date]"),
    dayEdit = e.target.closest("[data-day-edit]"),
    editHoliday = e.target.closest("[data-edit-holiday]"),
    deleteHoliday = e.target.closest("[data-delete-holiday]"),
    bulkHoliday = e.target.closest("[data-bulk-holiday]"),
    del = e.target.closest("[data-delete]"),
    remove = e.target.closest("[data-remove-employee]"),
    editEmployee = e.target.closest("[data-edit-employee]"),
    newForEmployee = e.target.closest("[data-new-for-employee]");
  if (newForEmployee) {
    openEntry(null);
    $("#entryForm").elements.employeeId.value = newForEmployee.dataset.newForEmployee;
  }
  if (editEmployee)
    openEmployee(
      state.employees.find((x) => x.id === editEmployee.dataset.editEmployee),
    );
  if (edit) openEntry(state.entries.find((x) => x.id === edit.dataset.edit));
  if (dayEdit) {
    const record = state.entries.find((x) => x.id === dayEdit.dataset.dayEdit);
    if (record) {
      returnToCalendarDate = record.date;
      $("#calendarDayDialog").close();
      openEntry(record);
    }
  }
  if (calendarDate) openCalendarDay(calendarDate.dataset.calendarDate);
  if (bulkHoliday) openBulk(bulkHoliday.dataset.bulkHoliday);
  if (editHoliday)
    openHoliday(state.holidays.find((x) => x.id === editHoliday.dataset.editHoliday));
  if (deleteHoliday && confirm("¿Eliminar este feriado? Los registros de colaboradores en esa fecha se conservarán.")) {
    state.holidays = state.holidays.filter((x) => x.id !== deleteHoliday.dataset.deleteHoliday);
    save();
  }
  if (del && confirm("¿Eliminar este registro?")) {
    state.entries = state.entries.filter((x) => x.id !== del.dataset.delete);
    save();
  }
  if (remove) {
    const x = state.employees.find(
        (z) => z.id === remove.dataset.removeEmployee,
      ),
      n = state.entries.filter((z) => z.employeeId === x.id).length;
    if (
      confirm(
        `¿Eliminar a ${x.name}? También se eliminarán sus ${n} registros. Esta acción no se puede deshacer.`,
      )
    ) {
      state.employees = state.employees.filter((z) => z.id !== x.id);
      state.entries = state.entries.filter((z) => z.employeeId !== x.id);
      save();
    }
  }
});
for (const s of [
  "#month",
  "#search",
  "#companyFilter",
  "#typeFilter",
  "#trackingFilter",
])
  $(s).addEventListener(s === "#search" ? "input" : "change", render);
$("#holidayFilter").addEventListener("change", () => {
  const date = $("#holidayFilter").value;
  if (date) $("#month").value = date.slice(0, 7);
  render();
});
$("#controlMonth").addEventListener("change", () => {
  const chosen = $("#controlMonth").value;
  if (!chosen) {
    $("#controlMonth").value = $("#month").value;
    return;
  }
  $("#month").value = chosen;
  render();
});
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({length: 81}, (_, i) => String(2100 - i))
  .map((year) => `<option value="${year}">${year}</option>`).join("");
for (const selector of ["#matrixYear", "#holidayYear"]) {
  $(selector).innerHTML = yearOptions;
  $(selector).value = String(Math.min(2100, Math.max(2020, currentYear)));
}
$("#matrixYear").addEventListener("change", renderMatrix);
$("#matrixCompany").addEventListener("change", renderMatrix);
$("#holidayYear").addEventListener("change", renderHolidays);
for (const [button, offset] of [["#previousMonth", -1], ["#nextMonth", 1]])
  $(button).onclick = () => {
    const [year, month] = $("#month").value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1 + offset, 1));
    $("#month").value = date.toISOString().slice(0, 7);
    render();
  };
$("#menuDisclosure").addEventListener("toggle", () =>
  $("#menuToggle").setAttribute("aria-label", $("#menuDisclosure").open ? "Cerrar menú" : "Abrir menú"),
);
document.addEventListener("click", (event) => {
  if ($("#menuDisclosure").open && !event.target.closest("#menuDisclosure"))
    $("#menuDisclosure").open = false;
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && $("#menuDisclosure").open) {
    $("#menuDisclosure").open = false;
    $("#menuToggle").focus();
  }
});
const views = new Set(["inicio", "resumen", "calendario", "registro", "matriz", "pendientes", "equipo", "feriados", "reportes", "historial", "configuracion"]);
function showView(view, scroll = true) {
  const selected = views.has(view) ? view : "inicio";
  document.body.dataset.view = selected;
  document.querySelectorAll("#sideNav a, #menuPanel a").forEach((item) => {
    const active = item.getAttribute("href") === `#${selected}`;
    item.classList.toggle("active", active);
    if (active) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
  $("#menuDisclosure").open = false;
  $("#menuToggle").setAttribute("aria-label", "Abrir menú");
  if (scroll) window.scrollTo({top: 0, behavior: "auto"});
}
document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const view = link.getAttribute("href").slice(1);
  if (!views.has(view)) return;
  event.preventDefault();
  const summaryState = link.dataset.summaryState;
  if (summaryState && Object.hasOwn(TRACKING, summaryState)) {
    $("#trackingFilter").value = summaryState;
    $("#search").value = "";
    $("#companyFilter").value = "";
    $("#typeFilter").value = "";
    $("#holidayFilter").value = "";
    render();
  }
  if (location.hash !== `#${view}`) history.pushState(null, "", `#${view}`);
  showView(view);
});
window.addEventListener("popstate", () => showView(location.hash.slice(1)));
window.addEventListener("hashchange", () => showView(location.hash.slice(1)));
const APPEARANCE_KEY = "jaco-jornadas-apariencia";
const sizePresets = {
  pequeno: {titlePx: 32, subtitlePx: 20, bodyPx: 13},
  normal: {titlePx: 42, subtitlePx: 24, bodyPx: 16},
  grande: {titlePx: 48, subtitlePx: 28, bodyPx: 18},
  "muy-grande": {titlePx: 54, subtitlePx: 32, bodyPx: 20},
};
const fontRanges = {
  title: {min: 24, max: 64, step: 2},
  subtitle: {min: 16, max: 42, step: 2},
  body: {min: 12, max: 26, step: 1},
};
const defaultAppearance = {font: "clasica", size: "normal", theme: "crema", ...sizePresets.normal};
function fontSize(value, range, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= range.min && n <= range.max
    ? Math.round(n) : fallback;
}
function applyAppearance(preferences) {
  const font = ["clasica", "moderna", "editorial", "ejecutiva"].includes(preferences?.font) ? preferences.font : "clasica";
  const size = Object.hasOwn(sizePresets, preferences?.size) ? preferences.size : "normal";
  const theme = ["crema", "claro", "azul", "arena"].includes(preferences?.theme) ? preferences.theme : "crema";
  document.body.dataset.font = $("#fontChoice").value = font;
  document.body.dataset.textSize = $("#textSize").value = size;
  document.body.dataset.theme = $("#themeChoice").value = theme;
  for (const kind of ["title", "subtitle", "body"]) {
    const key = kind + "Px";
    const px = fontSize(preferences?.[key], fontRanges[kind], sizePresets[size][key]);
    document.body.style.setProperty("--" + kind + "-size", px + "px");
    $("#" + key).textContent = px + "px";
  }
}
function saveAppearance() {
  const preferences = {
    font: $("#fontChoice").value,
    size: $("#textSize").value,
    theme: $("#themeChoice").value,
    titlePx: parseInt($("#titlePx").value, 10),
    subtitlePx: parseInt($("#subtitlePx").value, 10),
    bodyPx: parseInt($("#bodyPx").value, 10),
  };
  applyAppearance(preferences);
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(preferences));
    $("#settingsStatus").textContent = "Preferencias guardadas.";
  } catch {
    $("#settingsStatus").textContent = "La apariencia se aplicó, pero no se pudo guardar en este navegador.";
  }
}
for (const selector of ["#fontChoice", "#themeChoice"])
  $(selector).addEventListener("change", saveAppearance);
$("#textSize").addEventListener("change", () => {
  applyAppearance({
    font: $("#fontChoice").value,
    theme: $("#themeChoice").value,
    size: $("#textSize").value,
    ...sizePresets[$("#textSize").value],
  });
  saveAppearance();
});
document.querySelectorAll("[data-font-stepper] button").forEach((button) => {
  button.addEventListener("click", () => {
    const kind = button.closest("[data-font-stepper]").dataset.fontStepper;
    const output = $("#" + kind + "Px");
    const range = fontRanges[kind];
    const next = Math.min(range.max, Math.max(range.min, parseInt(output.value, 10) + Number(button.dataset.step) * range.step));
    if (next === parseInt(output.value, 10)) return;
    output.textContent = next + "px";
    saveAppearance();
  });
});
$("#resetAppearance").onclick = () => {
  applyAppearance(defaultAppearance);
  saveAppearance();
  $("#settingsStatus").textContent = "Diseño original restablecido.";
};
$("#configBackup").onclick = () => $("#backup").click();
$("#importBackup").onclick = () => $("#importBackupFile").click();
$("#importBackupFile").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const status = $("#importStatus");
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported.employees) || !Array.isArray(imported.entries))
      throw new Error("Formato inválido");

    const employeeMap = new Map();
    for (const incoming of imported.employees) {
      const name = String(incoming.name || "").trim();
      const company = String(incoming.company || "").trim();
      if (!name || !companies.includes(company)) continue;
      let existing = state.employees.find((e) =>
        normalize(e.name) === normalize(name) && e.company === company
      );
      if (!existing) {
        existing = { id: id(), name, company };
        state.employees.push(existing);
      }
      employeeMap.set(String(incoming.id || `${company}|${name}`), existing.id);
    }

    if (Array.isArray(imported.holidays)) {
      for (const holiday of imported.holidays) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(holiday.date || "") || !holiday.name) continue;
        const existing = state.holidays.find((x) => x.date === holiday.date);
        if (existing) existing.name = holiday.name;
        else state.holidays.push({ id: id(), date: holiday.date, name: holiday.name });
      }
    }

    let added = 0, updated = 0;
    for (const incoming of imported.entries) {
      const mappedEmployeeId = employeeMap.get(String(incoming.employeeId));
      if (!mappedEmployeeId || !/^\d{4}-\d{2}-\d{2}$/.test(incoming.date || "")) continue;
      const trackingState = Object.hasOwn(TRACKING, incoming.trackingState)
        ? incoming.trackingState : "no_aplica";
      const record = {
        id: id(),
        employeeId: mappedEmployeeId,
        date: incoming.date,
        type: incoming.type === "ordinario" ? "ordinario" : "feriado",
        trackingState,
        note: String(incoming.note || "").trim(),
      };
      const existingIndex = state.entries.findIndex((x) =>
        x.employeeId === mappedEmployeeId && x.date === incoming.date
      );
      if (existingIndex >= 0) {
        record.id = state.entries[existingIndex].id;
        state.entries[existingIndex] = record;
        updated++;
      } else {
        state.entries.push(record);
        added++;
      }
    }
    if (Array.isArray(imported.history)) {
      const known = new Set((state.history || []).map((event) => event.id));
      for (const event of imported.history) {
        if (!event || typeof event.id !== "string" || typeof event.at !== "string" ||
            typeof event.title !== "string" || !["registro", "feriado", "colaborador", "respaldo"].includes(event.entity) ||
            known.has(event.id)) continue;
        if (!Array.isArray(state.history)) state.history = [];
        state.history.push({
          id: event.id, at: event.at, entity: event.entity,
          action: String(event.action || "Editó"), title: event.title,
          company: String(event.company || ""), actor: String(event.actor || "Este dispositivo"),
          before: String(event.before || ""), after: String(event.after || ""),
        });
        known.add(event.id);
      }
    }
    save({importSummary: `${added} registros agregados · ${updated} actualizados`});
    status.textContent = `Importación lista: ${added} registros agregados y ${updated} actualizados.`;
  } catch (error) {
    status.textContent = "No se pudo importar el archivo. Verificá que sea un respaldo JSON válido.";
  } finally {
    event.target.value = "";
  }
});
try {
  applyAppearance(JSON.parse(localStorage.getItem(APPEARANCE_KEY)) || defaultAppearance);
} catch {
  applyAppearance(defaultAppearance);
}
function download(filename, data, type) {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("#backup").onclick = () =>
  download(
    `jornadas-respaldo-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(
      { ...state, version: 7, exportedAt: new Date().toISOString() },
      null,
      2,
    ),
    "application/json",
  );
const csvCell = (s) => '"' + String(s ?? "").replace(/"/g, '""') + '"';
$("#exportCsv").onclick = () => {
  const header = [
      "Fecha",
      "Colaborador",
      "Empresa",
      "Tipo de día",
      "Estado",
      "Comentarios",
    ],
    data = filters().map((x) => [
      x.date,
      employee(x)?.name || "",
      employee(x)?.company || "",
      x.type,
      TRACKING[x.trackingState] || TRACKING.no_aplica,
      x.note,
    ]);
  download(
    `jornadas-${$("#month").value || "todas"}.csv`,
    "\ufeff" +
      [header, ...data].map((row) => row.map(csvCell).join(";")).join("\r\n"),
    "text/csv;charset=utf-8",
  );
};
const reportToday = new Date();
$("#reportCutoff").value = [reportToday.getFullYear(), String(reportToday.getMonth()+1).padStart(2,"0"), String(reportToday.getDate()).padStart(2,"0")].join("-");
$("#reportMonth").innerHTML = Array.from({length:12}, (_, i) => {
  const month = String(i+1).padStart(2,"0");
  const label = new Intl.DateTimeFormat("es-CR", {month:"long"}).format(new Date(2026, i, 1));
  return `<option value="${month}">${label.charAt(0).toUpperCase() + label.slice(1)}</option>`;
}).join("");
$("#reportMonth").value = String(reportToday.getMonth()+1).padStart(2,"0");
for (const selector of ["#reportMonth", "#reportYear", "#reportCutoff", "#reportCompany"])
  $(selector).addEventListener("change", renderReports);
document.querySelectorAll("[data-report-kind]").forEach((button) => button.addEventListener("click", () => {
  reportKind = button.dataset.reportKind;
  renderReports();
}));
$("#printReport").onclick = () => window.print();
$("#downloadReport").onclick = () => {
  const names = new Map(state.holidays.map((x) => [x.date, x.name]));
  const header = ["Fecha", "Feriado / día", "Colaborador", "Empresa", "Tipo de día", "Estado", "Comentarios"];
  const data = reportRecords().map((entry) => {
    const person = employee(entry);
    return [entry.date, names.get(entry.date) || (entry.type === "feriado" ? "Feriado registrado" : "Día ordinario"),
      person?.name || "Colaborador eliminado", person?.company || "",
      entry.type === "feriado" ? "Feriado" : "Ordinario",
      TRACKING[entry.trackingState] || TRACKING.no_aplica, entry.note || ""];
  });
  const period = reportKind === "pendientes" ? $("#reportCutoff").value :
    $("#reportYear").value + (reportKind === "mensual" ? "-" + $("#reportMonth").value : "");
  const company = $("#reportCompany").value ? "-" + ($("#reportCompany").value === companies[0] ? "monte-carlo" : "onsite") : "";
  try {
    const workbook = window.makeReportWorkbook({
      title: REPORT_LABELS[reportKind][0],
      period: reportPeriodText(),
      company: $("#reportCompany").selectedOptions[0]?.textContent || "Todas las empresas",
      headings: header,
      rows: data,
    });
    download(`reporte-${reportKind}-${period}${company}.xlsx`, workbook,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    $("#reportDownloadStatus").textContent = "Archivo Excel preparado para descargar.";
  } catch (error) {
    $("#reportDownloadStatus").textContent = "No se pudo preparar el archivo Excel. Volvé a cargar la página e intentá de nuevo.";
  }
};
$("#month").value = new Date().toISOString().slice(0, 7);
render();
showView(location.hash.slice(1) || "inicio", false);
document.documentElement.classList.add("js-ready");
window.jornadasCloud?.start({
  getData: () => state,
  seedUpcomingHolidays() {
    if (!seedUpcomingHolidays(state)) return false;
    localStorage.setItem(KEY, JSON.stringify(state));
    lastBusinessSnapshot = businessSnapshot(state);
    render();
    return true;
  },
  replaceData(data) {
    if (!Array.isArray(data?.employees) || !Array.isArray(data?.entries) || !Array.isArray(data?.holidays))
      throw new Error("Los datos en línea tienen un formato inválido.");
    state = data;
    lastBusinessSnapshot = businessSnapshot(state);
    localStorage.setItem(KEY, JSON.stringify(state));
    render();
  },
  downloadBackup() { $("#backup").click(); },
});
