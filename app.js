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
  editing = null,
  editingEmployee = null,
  editingHoliday = null,
  teamFilter = "";
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    render();
    window.jornadasCloud?.changed();
  } catch {
    alert(
      "No se pudo guardar. Descargá un respaldo y liberá espacio antes de continuar.",
    );
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
function render() {
  const month = $("#month").value,
    period = state.entries.filter((x) => !month || x.date.startsWith(month));
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
  $("#employees").innerHTML = state.employees.length
    ? companies
        .filter((c) => !teamFilter || c === teamFilter)
        .map((c) => {
          const members = state.employees
            .filter((e) => e.company === c)
            .sort((a, b) => a.name.localeCompare(b.name, "es"));
          return `<div class="team-group"><div class="team-header"><h3>${escapeHtml(c)}</h3><span>${members.length} colaborador${members.length === 1 ? "" : "es"}</span></div><div class="team-list">${members.map((e, i) => `<div class="person"><span class="person-number">${String(i + 1).padStart(2, "0")}</span><strong>${escapeHtml(e.name)}</strong><span class="person-records">${state.entries.filter((x) => x.employeeId === e.id).length} registros</span><div class="person-actions"><button type="button" class="link" data-edit-employee="${escapeHtml(e.id)}" aria-label="Editar a ${escapeHtml(e.name)}">Editar</button><button type="button" class="link danger" data-remove-employee="${escapeHtml(e.id)}" aria-label="Eliminar a ${escapeHtml(e.name)}">Eliminar</button></div></div>`).join("")}</div></div>`;
        })
        .join("")
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
}
function renderHolidays() {
  const year = $("#holidayYear").value;
  const matches = state.holidays.filter((x) => x.date.startsWith(`${year}-`)).sort((a, b) => a.date.localeCompare(b.date));
  $("#holidays").innerHTML = matches.length
    ? matches.map((x) => `<div class="holiday"><time>${escapeHtml(displayDate(x.date).slice(0, 5))}</time><span>${escapeHtml(x.name)}</span><div class="holiday-actions"><button type="button" class="link" data-edit-holiday="${escapeHtml(x.id)}">Editar</button><button type="button" class="link danger" data-delete-holiday="${escapeHtml(x.id)}">Eliminar</button></div></div>`).join("")
    : '<p class="empty">No hay feriados registrados para este año. Agregá el primero con el botón de arriba.</p>';
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
function renderMatrix() {
  const year = Number($("#matrixYear").value);
  const datesByDay = new Map(
    state.holidays.filter((x) => x.date.startsWith(`${year}-`)).map((x) => [x.date, x.name]),
  );
  for (const entry of state.entries)
    if (entry.type === "feriado" && entry.date.startsWith(`${year}-`) && !datesByDay.has(entry.date))
      datesByDay.set(entry.date, "Feriado registrado");
  const dates = [...datesByDay].sort(([a], [b]) => a.localeCompare(b));
  $("#matrixEmpty").hidden = dates.length > 0;
  $("#matrixHead").innerHTML = `<tr><th>Colaborador</th>${dates.map(([date, name]) => `<th title="${escapeHtml(name)}">${escapeHtml(displayDate(date).slice(0, 5))}<small>${escapeHtml(name)}</small></th>`).join("")}</tr>`;
  $("#matrixBody").innerHTML = state.employees.slice().sort((a,b) => a.company.localeCompare(b.company,"es") || a.name.localeCompare(b.name,"es")).map((person) => `<tr><th scope="row"><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(person.company)}</small></th>${dates.map(([date]) => { const entry = state.entries.find((x) => x.employeeId === person.id && x.date === date); return `<td>${entry ? `<span class="tracking tracking-${escapeHtml(entry.trackingState)}"><span class="tracking-dot" aria-hidden="true"></span>${escapeHtml(TRACKING[entry.trackingState])}</span>` : '<span class="muted">—</span>'}</td>`; }).join("")}</tr>`).join("");
}
function renderPending() {
  const entries = state.entries.filter((x) => x.trackingState === "pendiente" || x.trackingState === "pago_pendiente").sort((a,b) => a.date.localeCompare(b.date));
  $("#pendingCount").textContent = `${entries.length} pendiente${entries.length === 1 ? "" : "s"}`;
  $("#pendingList").innerHTML = entries.length ? entries.map((x) => `<div class="pending-item"><div><strong>${escapeHtml(employee(x)?.name || "Colaborador eliminado")}</strong><small>${escapeHtml(employee(x)?.company || "—")} · ${escapeHtml(displayDate(x.date))}</small></div><span class="tracking tracking-${escapeHtml(x.trackingState)}"><span class="tracking-dot" aria-hidden="true"></span>${escapeHtml(TRACKING[x.trackingState])}</span><button type="button" class="link" data-edit="${escapeHtml(x.id)}">Editar</button></div>`).join("") : '<p class="empty">No hay registros pendientes.</p>';
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
$("#newEntry").onclick = () => openEntry();
$("#newEntryFromControl").onclick = () => openEntry();
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
    editHoliday = e.target.closest("[data-edit-holiday]"),
    deleteHoliday = e.target.closest("[data-delete-holiday]"),
    del = e.target.closest("[data-delete]"),
    remove = e.target.closest("[data-remove-employee]"),
    editEmployee = e.target.closest("[data-edit-employee]");
  if (editEmployee)
    openEmployee(
      state.employees.find((x) => x.id === editEmployee.dataset.editEmployee),
    );
  if (edit) openEntry(state.entries.find((x) => x.id === edit.dataset.edit));
  if (calendarDate) openEntry(null, calendarDate.dataset.calendarDate);
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
$("#matrixYear").addEventListener("change", renderMatrix);
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
const views = new Set(["inicio", "resumen", "calendario", "registro", "matriz", "pendientes", "equipo", "feriados", "reportes", "configuracion"]);
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
    render();
  }
  if (location.hash !== `#${view}`) history.pushState(null, "", `#${view}`);
  showView(view);
});
window.addEventListener("popstate", () => showView(location.hash.slice(1)));
window.addEventListener("hashchange", () => showView(location.hash.slice(1)));
const APPEARANCE_KEY = "jaco-jornadas-apariencia";
const defaultAppearance = {font: "clasica", size: "normal", theme: "crema"};
function applyAppearance(preferences) {
  const font = ["clasica", "moderna"].includes(preferences?.font) ? preferences.font : "clasica";
  const size = ["normal", "grande"].includes(preferences?.size) ? preferences.size : "normal";
  const theme = ["crema", "claro"].includes(preferences?.theme) ? preferences.theme : "crema";
  document.body.dataset.font = $("#fontChoice").value = font;
  document.body.dataset.textSize = $("#textSize").value = size;
  document.body.dataset.theme = $("#themeChoice").value = theme;
}
function saveAppearance() {
  const preferences = {font: $("#fontChoice").value, size: $("#textSize").value, theme: $("#themeChoice").value};
  applyAppearance(preferences);
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(preferences));
    $("#settingsStatus").textContent = "Preferencias guardadas.";
  } catch {
    $("#settingsStatus").textContent = "La apariencia se aplicó, pero no se pudo guardar en este navegador.";
  }
}
for (const selector of ["#fontChoice", "#textSize", "#themeChoice"])
  $(selector).addEventListener("change", saveAppearance);
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
    save();
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
  const url = URL.createObjectURL(new Blob([data], { type })),
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
      { ...state, version: 6, exportedAt: new Date().toISOString() },
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
$("#month").value = new Date().toISOString().slice(0, 7);
render();
showView(location.hash.slice(1) || "inicio", false);
document.documentElement.classList.add("js-ready");
window.jornadasCloud?.start({
  getData: () => state,
  replaceData(data) {
    if (!Array.isArray(data?.employees) || !Array.isArray(data?.entries) || !Array.isArray(data?.holidays))
      throw new Error("Los datos en línea tienen un formato inválido.");
    state = data;
    localStorage.setItem(KEY, JSON.stringify(state));
    render();
  },
  downloadBackup() { $("#backup").click(); },
});
