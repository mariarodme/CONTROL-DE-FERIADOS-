"use strict";
(() => {
  const $ = (selector) => document.querySelector(selector);
  const config = window.JORNADAS_FIREBASE || {};
  const ready = ["apiKey", "authDomain", "databaseURL", "projectId", "appId"].every((key) => !!config[key]);
  const LINK_KEY = "jaco-jornadas-firebase-link";
  let adapter, sdk, auth, database, user, dataRef, unsubscribe;
  let remote = null, revision = 0, connected = false, dirty = false, saving = false, blocked = false, lastSynced = "";

  function fingerprint(data) {
    const value = JSON.stringify(data);
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
    return `${value.length}:${hash >>> 0}`;
  }
  function message(value, mode = "local") {
    $("#cloudStatus").textContent = value;
    $("#cloudIndicator").textContent = mode === "online" ? "✓ Guardado en línea" : mode === "saving" ? "Guardando…" : mode === "error" ? "⚠ Guardado pendiente" : "Datos en este dispositivo";
    $("#cloudIndicator").dataset.status = mode;
    $("#syncSummary").textContent = mode === "online" ? "✓ Guardado en línea · Ver configuración" : mode === "saving" ? "Guardando en línea…" : mode === "error" ? "⚠ No se guardó en línea · Ver configuración" : "Datos guardados solo en este dispositivo · Ver configuración";
    $("#syncSummary").dataset.status = mode;
  }
  function actions({upload = false, open = false, retry = false} = {}) {
    $("#firebaseSignIn").hidden = !ready || !!user;
    $("#cloudActions").hidden = !user;
    $("#cloudUpload").hidden = !upload;
    $("#cloudOpen").hidden = !open;
    $("#cloudRetry").hidden = !retry;
  }
  function remember() {
    localStorage.setItem(LINK_KEY, JSON.stringify({userId: user.uid, fingerprint: fingerprint(adapter.getData())}));
  }
  function decode(raw) {
    return raw ? {revision: raw.revision, payload: JSON.parse(raw.payloadText)} : null;
  }
  function activate(data) {
    if (!data || !Array.isArray(data.payload?.employees) || !Array.isArray(data.payload?.entries) || !Array.isArray(data.payload?.holidays))
      throw new Error("Los datos en línea tienen un formato inválido.");
    adapter.replaceData(data.payload);
    revision = data.revision;
    remote = data;
    connected = true;
    dirty = blocked = false;
    lastSynced = fingerprint(adapter.getData());
    remember();
    actions();
    message(`Guardado en línea · ${user.email || "sesión iniciada"}`, "online");
  }
  function receive(data) {
    remote = data;
    if (!data) {
      if (connected) {
        connected = false;
        blocked = true;
        message("Los datos en línea ya no están disponibles. Descargá un respaldo antes de continuar.", "error");
      } else {
        actions({upload: true});
        message("Aún no hay datos en línea. Desde el dispositivo donde ingresaste los registros, tocá «Subir datos de este dispositivo».");
      }
      return;
    }
    if (connected) {
      if (data.revision === revision || saving) return;
      if (dirty || fingerprint(adapter.getData()) !== lastSynced) {
        blocked = true;
        actions({open: true});
        message("Hay cambios en otro dispositivo. Descargá un respaldo y abrí los datos en línea; después podés importar el respaldo para combinarlos.", "error");
      } else activate(data);
      return;
    }
    const link = JSON.parse(localStorage.getItem(LINK_KEY) || "null");
    const localHash = fingerprint(adapter.getData());
    if (localHash === fingerprint(data.payload) ||
        (link?.userId === user.uid && link.fingerprint === localHash)) activate(data);
    else {
      actions({open: true});
      message("Este dispositivo y la nube tienen datos distintos. Abrí los datos en línea; antes se descargará un respaldo local para poder combinarlos.");
    }
  }
  async function write(snapshot, expected) {
    const result = await sdk.runTransaction(dataRef, (current) => {
      if ((current?.revision || 0) !== expected) return;
      return {revision: expected + 1, payloadText: JSON.stringify(snapshot), updatedAt: Date.now()};
    }, {applyLocally: false});
    if (!result.committed) throw new Error("Otro dispositivo guardó cambios antes que este");
    return decode(result.snapshot.val());
  }
  async function flush() {
    if (!connected || saving || blocked || !dirty) return;
    saving = true;
    while (connected && dirty && !blocked) {
      const snapshot = structuredClone(adapter.getData());
      const sent = fingerprint(snapshot);
      dirty = false;
      message("Guardando cambios en línea…", "saving");
      try {
        const saved = await write(snapshot, revision);
        revision = saved.revision;
        remote = saved;
        lastSynced = sent;
        if (fingerprint(adapter.getData()) !== sent) dirty = true;
        else remember();
        if (!dirty) message("Guardado en línea · todos los cambios están disponibles en tus dispositivos", "online");
      } catch (error) {
        dirty = blocked = true;
        actions({retry: true});
        message(`No se guardó en línea: ${error.message}. Los cambios siguen en este dispositivo.`, "error");
      }
    }
    saving = false;
  }
  function report(error) {
    actions({retry: !!user && connected});
    message(`No se pudo conectar: ${error.message}. Los registros permanecen en este dispositivo.`, "error");
  }
  async function signIn() {
    if (!sdk) return;
    try {
      message("Abriendo acceso de Google…", "saving");
      await sdk.signInWithPopup(auth, new sdk.GoogleAuthProvider());
    } catch (error) {
      const text = error.code === "auth/unauthorized-domain"
        ? "Falta autorizar mariarodme.github.io en Firebase Authentication → Settings → Authorized domains"
        : error.code === "auth/popup-closed-by-user" ? "Se cerró la ventana de Google sin entrar" : error.message;
      report(new Error(text));
    }
  }
  window.jornadasCloud = {
    async start(host) {
      adapter = host;
      if (!ready) {
        actions();
        message("Firebase aún no está conectado. Los registros se guardan solo en este dispositivo.");
        return;
      }
      try {
        const version = "12.19.0";
        const [app, authModule, dbModule] = await Promise.all([
          import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
          import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),
          import(`https://www.gstatic.com/firebasejs/${version}/firebase-database.js`),
        ]);
        sdk = {...authModule, ...dbModule};
        const client = app.initializeApp(config);
        auth = authModule.getAuth(client);
        database = dbModule.getDatabase(client);
        actions();
        message("Revisando tu sesión de Google…", "saving");
        authModule.onAuthStateChanged(auth, (account) => {
          if (unsubscribe) { unsubscribe(); unsubscribe = null; }
          user = account;
          remote = null; revision = 0; connected = dirty = blocked = saving = false;
          if (!account) {
            dataRef = null;
            actions();
            message("Entrá con Google para ver los registros en el teléfono y la computadora.");
            return;
          }
          dataRef = dbModule.ref(database, `users/${account.uid}`);
          actions();
          message("Consultando datos en línea…", "saving");
          unsubscribe = dbModule.onValue(dataRef, (snapshot) => {
            try { receive(decode(snapshot.val())); } catch (error) { report(error); }
          }, report);
        }, report);
      } catch (error) { report(error); }
    },
    changed() {
      if (connected) { dirty = true; flush(); }
      else if (ready) message("Cambio guardado solo en este dispositivo. Entrá con Google para poder sincronizarlo.");
    },
  };
  $("#firebaseSignIn").addEventListener("click", signIn);
  $("#cloudUpload").addEventListener("click", async () => {
    if (!user || remote || !confirm("¿Subir los datos de este dispositivo a tu cuenta de Google? También se descargará un respaldo.")) return;
    adapter.downloadBackup();
    try {
      message("Subiendo datos en línea…", "saving");
      const snapshot = structuredClone(adapter.getData());
      const saved = await write(snapshot, 0);
      if (fingerprint(adapter.getData()) !== fingerprint(snapshot)) {
        remote = saved; revision = saved.revision; lastSynced = fingerprint(snapshot);
        connected = dirty = true; actions(); await flush();
      } else activate(saved);
    } catch (error) { report(error); }
  });
  $("#cloudOpen").addEventListener("click", () => {
    if (!remote || !confirm("Primero se descargará un respaldo de este dispositivo. Después se abrirán los datos en línea. Podés importar el respaldo para combinar lo que falte.")) return;
    adapter.downloadBackup();
    try { activate(remote); } catch (error) { report(error); }
  });
  $("#cloudRetry").addEventListener("click", async () => {
    if (!user || !dataRef) return;
    try {
      const current = decode((await sdk.get(dataRef)).val());
      if (!current || current.revision !== revision) {
        remote = current;
        connected = false;
        actions({open: !!current, upload: !current});
        message("Otro dispositivo guardó cambios. Abrí los datos en línea y después importá el respaldo de este dispositivo para combinarlos.", "error");
        return;
      }
      blocked = false;
      dirty = fingerprint(adapter.getData()) !== lastSynced;
      if (dirty) await flush();
      else { actions(); message("Guardado en línea", "online"); }
    } catch (error) { report(error); }
  });
  $("#cloudLogout").addEventListener("click", async () => {
    if (dirty && !confirm("Hay cambios sin guardar en línea. Se descargará un respaldo antes de cerrar sesión.")) return;
    if (dirty) adapter.downloadBackup();
    try { await sdk.signOut(auth); } catch (error) { report(error); }
  });
})();
