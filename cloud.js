"use strict";
(() => {
  const config = window.JORNADAS_CLOUD || {};
  const url = String(config.url || "").replace(/\/$/, "");
  const key = String(config.publishableKey || "");
  const ready = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) && !!key;
  const SESSION_KEY = "jaco-jornadas-cloud-session";
  const LINK_KEY = "jaco-jornadas-cloud-link";
  const $ = (selector) => document.querySelector(selector);
  let host, session, remote, revision = 0, connected = false;
  let dirty = false, saving = false, blocked = false, lastSynced = "";

  function fingerprint(value) {
    const text = JSON.stringify(value);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return `${text.length}:${hash >>> 0}`;
  }
  function message(text, mode = "local") {
    $("#cloudStatus").textContent = text;
    $("#cloudIndicator").textContent = mode === "online" ? "✓ Guardado en línea" : mode === "saving" ? "Guardando…" : mode === "error" ? "⚠ Guardado pendiente" : "Datos en este dispositivo";
    $("#cloudIndicator").dataset.status = mode;
    $("#syncSummary").textContent = mode === "online" ? "✓ Guardado en línea · Ver configuración" : mode === "saving" ? "Guardando en línea…" : mode === "error" ? "⚠ No se guardó en línea · Ver configuración" : "Datos guardados solo en este dispositivo · Ver configuración";
    $("#syncSummary").dataset.status = mode;
  }
  function actions({upload = false, open = false, retry = false} = {}) {
    $("#cloudActions").hidden = !session;
    $("#cloudUpload").hidden = !upload;
    $("#cloudOpen").hidden = !open;
    $("#cloudRetry").hidden = !retry;
    $("#cloudLoginForm").hidden = !!session || !ready;
  }
  function remember() {
    localStorage.setItem(LINK_KEY, JSON.stringify({userId: session.user.id, revision, fingerprint: fingerprint(host.getData())}));
  }
  async function request(path, {method = "GET", body, token} = {}) {
    const response = await fetch(url + path, {
      method,
      headers: {
        apikey: key,
        ...(token ? {Authorization: `Bearer ${token}`} : {}),
        ...(body === undefined ? {} : {"Content-Type": "application/json"}),
      },
      ...(body === undefined ? {} : {body: JSON.stringify(body)}),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || data?.msg || data?.error_description || `Error ${response.status}`);
    return data;
  }
  function setSession(data) {
    session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + Number(data.expires_in || 3600) * 1000,
      user: data.user || session?.user,
    };
    if (!session.user?.id) throw new Error("No se pudo identificar la cuenta.");
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  async function token() {
    if (!session) throw new Error("Iniciá sesión de nuevo.");
    if (Date.now() < session.expires_at - 60000) return session.access_token;
    const data = await request("/auth/v1/token?grant_type=refresh_token", {
      method: "POST", body: {refresh_token: session.refresh_token},
    });
    setSession(data);
    return session.access_token;
  }
  async function getRemote() {
    const rows = await request("/rest/v1/jornadas?select=payload,revision&limit=1", {token: await token()});
    if (!Array.isArray(rows)) throw new Error("No se pudo consultar la base de datos.");
    return rows[0] || null;
  }
  async function putRemote(snapshot, expected) {
    const result = await request("/rest/v1/rpc/save_jornadas", {
      method: "POST", token: await token(), body: {new_payload: snapshot, expected_revision: expected},
    });
    if (!Number.isInteger(result)) throw new Error("La base de datos no confirmó el guardado.");
    return result;
  }
  async function inspect() {
    actions();
    message("Consultando datos en línea…", "saving");
    remote = await getRemote();
    if (!remote) {
      connected = false;
      actions({upload: true});
      message("No hay datos en línea. Abrí esta página desde el dispositivo donde ingresaste los registros y tocá «Subir datos de este dispositivo».");
      return;
    }
    const local = host.getData();
    const link = JSON.parse(localStorage.getItem(LINK_KEY) || "null");
    if (fingerprint(local) === fingerprint(remote.payload) ||
        (link?.userId === session.user.id && link.fingerprint === fingerprint(local))) {
      activate(remote);
    } else {
      connected = false;
      actions({open: true});
      message("Hay datos distintos en este dispositivo y en línea. Descargá un respaldo antes de abrir los datos en línea. Podés importar el respaldo después para combinarlos.");
    }
  }
  function activate(row) {
    host.replaceData(row.payload);
    revision = row.revision;
    remote = row;
    connected = true;
    blocked = false;
    dirty = false;
    lastSynced = fingerprint(host.getData());
    remember();
    actions();
    message(`Guardado en línea · ${session.user.email || "sesión iniciada"}`, "online");
  }
  async function flush() {
    if (!connected || saving || blocked || !dirty) return;
    saving = true;
    while (connected && dirty && !blocked) {
      const snapshot = structuredClone(host.getData());
      const sent = fingerprint(snapshot);
      dirty = false;
      message("Guardando cambios en línea…", "saving");
      try {
        revision = await putRemote(snapshot, revision);
        remote = {payload: snapshot, revision};
        lastSynced = sent;
        if (fingerprint(host.getData()) !== sent) dirty = true;
        else remember();
        if (!dirty) message("Guardado en línea · todos los cambios están disponibles en tus dispositivos", "online");
      } catch (error) {
        dirty = true;
        blocked = true;
        actions({retry: true});
        message(`No se guardó en línea: ${error.message}. Los cambios siguen en este dispositivo.`, "error");
      }
    }
    saving = false;
  }
  async function refresh() {
    if (!connected || dirty || saving || blocked || document.hidden) return;
    try {
      const current = await getRemote();
      if (!connected || dirty || saving || blocked) return;
      if (!current) throw new Error("No se encontraron los datos de la cuenta.");
      if (current.revision !== revision) {
        if (fingerprint(host.getData()) !== lastSynced) {
          blocked = true;
          actions({open: true});
          message("Hay cambios en otro dispositivo. Descargá un respaldo antes de abrirlos.", "error");
          return;
        }
        activate(current);
      }
    } catch (error) {
      message(`Sin conexión: ${error.message}. Revisá la conexión antes de seguir trabajando.`, "error");
    }
  }
  function report(error) {
    actions({retry: !!session});
    message(`${error.message}. Los registros de este dispositivo se conservan.`, "error");
  }
  window.jornadasCloud = {
    async start(adapter) {
      host = adapter;
      if (!ready) {
        actions();
        message("El guardado en línea todavía no está configurado. Los registros se guardan solo en este dispositivo.");
        return;
      }
      try {
        session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
        if (session?.user?.id) await inspect();
        else { session = null; actions(); message("Iniciá sesión para guardar y consultar tus registros en otros dispositivos."); }
      } catch (error) { report(error); }
    },
    changed() {
      if (connected) { dirty = true; flush(); }
      else if (ready) message("Cambio guardado solo en este dispositivo. Iniciá sesión y trasladá los datos para verlos en otros dispositivos.");
    },
  };
  $("#cloudLoginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    message("Iniciando sesión…", "saving");
    try {
      const data = await request("/auth/v1/token?grant_type=password", {method: "POST", body: {email, password}});
      setSession(data);
      form.reset();
      await inspect();
    } catch (error) { report(error); }
  });
  $("#cloudUpload").addEventListener("click", async () => {
    if (!session || remote || !confirm("¿Subir los datos de este dispositivo a tu cuenta? Se descargarán también como respaldo.")) return;
    host.downloadBackup();
    try {
      message("Subiendo datos…", "saving");
      const snapshot = structuredClone(host.getData());
      revision = await putRemote(snapshot, 0);
      if (fingerprint(host.getData()) !== fingerprint(snapshot)) {
        remote = {payload: snapshot, revision};
        lastSynced = fingerprint(snapshot);
        connected = true;
        actions();
        dirty = true;
        await flush();
      } else activate({payload: snapshot, revision});
    } catch (error) { report(error); }
  });
  $("#cloudOpen").addEventListener("click", () => {
    if (!remote || !confirm("Se descargará un respaldo de los datos de este dispositivo. Después se abrirán los datos en línea. Si falta algo, podrás importar el respaldo desde Configuración.")) return;
    host.downloadBackup();
    try { activate(remote); } catch (error) { report(error); }
  });
  $("#cloudRetry").addEventListener("click", async () => {
    try {
      if (!connected) { await inspect(); return; }
      const current = await getRemote();
      if (!current || current.revision !== revision) {
        remote = current;
        connected = false;
        actions({open: !!remote, upload: !remote});
        message("Otro dispositivo guardó cambios. Descargá un respaldo y abrí los datos en línea; después importá el respaldo para combinar tus cambios.", "error");
        return;
      }
      blocked = false;
      dirty = fingerprint(host.getData()) !== lastSynced;
      if (dirty) await flush();
      else message("Guardado en línea", "online");
    } catch (error) { report(error); }
  });
  $("#cloudLogout").addEventListener("click", () => {
    if (dirty && !confirm("Hay cambios que no se guardaron en línea. Descargá un respaldo antes de cerrar sesión.")) return;
    if (dirty) host.downloadBackup();
    session = null; remote = null; connected = false; blocked = false;
    localStorage.removeItem(SESSION_KEY);
    actions();
    message("Sesión cerrada. Los datos visibles siguen guardados en este dispositivo.");
  });
  window.addEventListener("online", () => { if (dirty) flush(); else refresh(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  setInterval(refresh, 30000);
})();
