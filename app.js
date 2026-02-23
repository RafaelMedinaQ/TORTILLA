// =======================================================
//  SISTEMA TORTILLERÍA (Harina/Integral)
//  - Locales con precio harina 24 o 26
//  - Integral siempre 30
//  - Ventas por día (se guardan por fecha)
//  - Exportar CSV, imprimir, borrar día
//  - Sección de locales colapsable (minimizar/mostrar)
// =======================================================


// ===================== Utilidades =====================

// Formato moneda MXN
const mxn = (n) => (Number(n || 0)).toLocaleString("es-MX", {
  style: "currency",
  currency: "MXN"
});

// padding para fechas/horas (ej: 01, 02, 09)
const pad2 = (n) => String(n).padStart(2, "0");

// clave del día: AAAA-MM-DD
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// hora actual HH:MM
function nowHHMM() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// Evita que se inyecte HTML en tablas (seguridad básica)
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ID único para locales
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}


// ===================== Config fija =====================

// Precio fijo de integral
const FIXED_INTEGRAL_PRICE = 30;

// Precios permitidos para harina (según tu regla)
const HARINA_PRICES = [24, 26];


// ===================== Estado (memoria en ejecución) =====================

const state = {
  // fecha actual
  dateKey: todayKey(),

  // ventas del día (se guarda por fecha)
  sales: [],

  // lista de locales (se guarda permanente)
  locals: [],

  // si estás editando un local, aquí guardamos su id
  editingLocalId: null
};


// ===================== Storage (localStorage) =====================

// Ventas por día: se separan por fecha
function salesStorageKey() {
  return `tortilleria_sales_${state.dateKey}`;
}

// Locales: siempre el mismo key
const LOCALS_KEY = "tortilleria_locals_v1";

// Estado UI colapsable de locales (guardado)
const LOCALS_UI_KEY = "tortilleria_locals_collapsed_v1";

// Carga locales guardados
function loadLocals() {
  try {
    const raw = localStorage.getItem(LOCALS_KEY);
    state.locals = raw ? JSON.parse(raw) : [];
  } catch {
    state.locals = [];
  }
}

// Guarda locales
function saveLocals() {
  localStorage.setItem(LOCALS_KEY, JSON.stringify(state.locals));
}

// Carga ventas del día
function loadDaySales() {
  try {
    const raw = localStorage.getItem(salesStorageKey());
    state.sales = raw ? JSON.parse(raw) : [];
  } catch {
    state.sales = [];
  }
}

// Guarda ventas del día
function saveDaySales() {
  localStorage.setItem(salesStorageKey(), JSON.stringify(state.sales));
}


// ===================== DOM (referencias a elementos) =====================

const el = (id) => document.getElementById(id);

// --- UI locales ---
const localName = el("localName");
const localHarinaPrice = el("localHarinaPrice");
const btnAddLocal = el("btnAddLocal");
const btnCancelEditLocal = el("btnCancelEditLocal");
const localsBody = el("localsBody");

// Colapsable locales
const btnToggleLocals = el("btnToggleLocals");
const localsContent = el("localsContent");

// --- UI pedido ---
const customerSelect = el("customerSelect");
const priceHarina = el("priceHarina");
const priceIntegral = el("priceIntegral");
const qtyHarina = el("qtyHarina");
const qtyIntegral = el("qtyIntegral");
const notes = el("notes");
const paid = el("paid");

// --- UI preview ---
const subHarina = el("subHarina");
const subIntegral = el("subIntegral");
const total = el("total");
const change = el("change");
const changeHint = el("changeHint");

// --- UI ventas ---
const salesBody = el("salesBody");
const dayHarina = el("dayHarina");
const dayIntegral = el("dayIntegral");
const dayMoney = el("dayMoney");

const todayLabel = el("todayLabel");

// Botones principales
const btnPrint = el("btnPrint");
const btnExport = el("btnExport");
const btnClearDay = el("btnClearDay");

const btnAddSale = el("btnAddSale");
const btnReset = el("btnReset");


// ===================== Cálculo en vivo =====================
// Calcula subtotal harina/integral, total, cambio/faltante antes de registrar venta
function calcPreview() {
  const ph = Number(priceHarina.value || 0);
  const pi = Number(priceIntegral.value || 0);
  const qh = Number(qtyHarina.value || 0);
  const qi = Number(qtyIntegral.value || 0);
  const p = Number(paid.value || 0);

  const sh = ph * qh;
  const si = pi * qi;
  const t = sh + si;
  const diff = p - t; // positivo = cambio, negativo = faltante

  subHarina.textContent = mxn(sh);
  subIntegral.textContent = mxn(si);
  total.textContent = mxn(t);

  change.textContent = mxn(Math.abs(diff));

  if (t === 0 && p === 0) {
    changeHint.textContent = "";
    change.className = "pill-value";
    return;
  }

  if (diff > 0) {
    changeHint.textContent = "Cambio a regresar";
    change.className = "pill-value badge-ok";
  } else if (diff < 0) {
    changeHint.textContent = "Faltante por cobrar";
    change.className = "pill-value badge-danger";
  } else {
    changeHint.textContent = "Pago exacto";
    change.className = "pill-value badge-warn";
  }
}


// ===================== Colapsable (Locales) =====================

// Lee del storage si estaba colapsado
function getLocalsCollapsed() {
  return localStorage.getItem(LOCALS_UI_KEY) === "1";
}

// Abre/cierra y guarda preferencia
function setLocalsCollapsed(collapsed) {
  if (collapsed) {
    localsContent.classList.remove("open");
    btnToggleLocals.textContent = "▸ Mostrar locales";
    localStorage.setItem(LOCALS_UI_KEY, "1");
  } else {
    localsContent.classList.add("open");
    btnToggleLocals.textContent = "▾ Minimizar";
    localStorage.setItem(LOCALS_UI_KEY, "0");
  }
}


// ===================== Locales: render y CRUD =====================

// Muestra tabla de locales + llena el select de clientes
function renderLocals() {
  localsBody.innerHTML = "";

  // Si no hay locales, mostramos mensaje
  if (state.locals.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="3" class="muted">No hay locales registrados. Agrega uno arriba.</td>`;
    localsBody.appendChild(tr);
  } else {
    // Orden alfabético por nombre
    state.locals
      .slice()
      .sort((a,b) => a.name.localeCompare(b.name, "es"))
      .forEach((l) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(l.name)}</td>
          <td><b>${mxn(l.harinaPrice)}</b></td>
          <td style="display:flex; gap:8px; justify-content:flex-end;">
            <button class="btn" data-edit-local="${l.id}">✏️ Editar</button>
            <button class="btn danger" data-del-local="${l.id}">🗑️ Eliminar</button>
          </td>
        `;
        localsBody.appendChild(tr);
      });
  }

  // Guardamos selección actual del cliente (para no perderla)
  const selected = customerSelect.value;

  // Re-llenamos select de clientes
  customerSelect.innerHTML = `<option value="">— Selecciona un local —</option>`;
  state.locals
    .slice()
    .sort((a,b) => a.name.localeCompare(b.name, "es"))
    .forEach((l) => {
      const opt = document.createElement("option");
      opt.value = l.id;
      opt.textContent = `${l.name} (Harina ${mxn(l.harinaPrice)})`;
      customerSelect.appendChild(opt);
    });

  // Restaurar selección si aún existe
  if (selected && state.locals.some(l => l.id === selected)) {
    customerSelect.value = selected;
  } else {
    customerSelect.value = "";
  }

  // Eventos para botones editar/eliminar
  document.querySelectorAll("[data-edit-local]").forEach(btn => {
    btn.addEventListener("click", () => startEditLocal(btn.getAttribute("data-edit-local")));
  });
  document.querySelectorAll("[data-del-local]").forEach(btn => {
    btn.addEventListener("click", () => deleteLocal(btn.getAttribute("data-del-local")));
  });
}

// Pone el formulario de locales en modo editar
function startEditLocal(id) {
  const l = state.locals.find(x => x.id === id);
  if (!l) return;

  state.editingLocalId = id;
  localName.value = l.name;
  localHarinaPrice.value = String(l.harinaPrice);

  btnAddLocal.textContent = "💾 Guardar cambios";
  btnCancelEditLocal.disabled = false;
  localName.focus();
}

// Sale del modo editar
function cancelEditLocal() {
  state.editingLocalId = null;
  localName.value = "";
  localHarinaPrice.value = String(HARINA_PRICES[0]);

  btnAddLocal.textContent = "➕ Agregar local";
  btnCancelEditLocal.disabled = true;
}

// Agrega nuevo local o guarda edición (upsert)
function upsertLocal() {
  const name = localName.value.trim();
  const harinaPrice = Number(localHarinaPrice.value);

  if (!name) {
    alert("Escribe el nombre del local.");
    localName.focus();
    return;
  }

  if (!HARINA_PRICES.includes(harinaPrice)) {
    alert("El precio de harina debe ser 24 o 26.");
    return;
  }

  // Evita duplicados por nombre
  const existingByName = state.locals.find(l =>
    l.name.toLowerCase() === name.toLowerCase() &&
    l.id !== state.editingLocalId
  );
  if (existingByName) {
    alert("Ya existe un local con ese nombre.");
    return;
  }

  if (state.editingLocalId) {
    // Editar existente
    const idx = state.locals.findIndex(l => l.id === state.editingLocalId);
    if (idx >= 0) {
      state.locals[idx] = { ...state.locals[idx], name, harinaPrice };
    }
  } else {
    // Agregar nuevo
    state.locals.push({ id: uid(), name, harinaPrice });
  }

  saveLocals();
  renderLocals();
  cancelEditLocal();

  // Si estaba colapsado y agregaste local, opcionalmente lo dejamos como esté
}

// Elimina local
function deleteLocal(id) {
  const l = state.locals.find(x => x.id === id);
  if (!l) return;

  const ok = confirm(`¿Eliminar el local "${l.name}"?`);
  if (!ok) return;

  // Si estaba seleccionado, lo quitamos
  if (customerSelect.value === id) {
    customerSelect.value = "";
    applySelectedLocalPricing();
  }

  state.locals = state.locals.filter(x => x.id !== id);
  saveLocals();
  renderLocals();
  cancelEditLocal();
}


// ===================== Pedido: aplicar precios según local =====================

// Aplica precio harina según el local seleccionado
function applySelectedLocalPricing() {
  // Integral fijo
  priceIntegral.value = FIXED_INTEGRAL_PRICE;

  const localId = customerSelect.value;

  // Si no hay local seleccionado: default harina 24
  if (!localId) {
    priceHarina.value = HARINA_PRICES[0];
  } else {
    const l = state.locals.find(x => x.id === localId);
    priceHarina.value = l ? Number(l.harinaPrice) : HARINA_PRICES[0];
  }

  // Recalcular preview
  calcPreview();
}


// ===================== Ventas: render y acciones =====================

// Renderiza la tabla de ventas del día y los totales
function renderSales() {
  salesBody.innerHTML = "";

  state.sales.forEach((s, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.time}</td>
      <td>${escapeHtml(s.customer || "")}</td>
      <td>${s.qtyHarina}</td>
      <td>${s.qtyIntegral}</td>
      <td><strong>${mxn(s.total)}</strong></td>
      <td>${mxn(s.paid)}</td>
      <td>${mxn(s.change)}</td>
      <td>${escapeHtml(s.notes || "")}</td>
      <td><button class="btn danger" data-del-sale="${idx}">Eliminar</button></td>
    `;
    salesBody.appendChild(tr);
  });

  // Totales del día
  const sumHarina = state.sales.reduce((a, s) => a + Number(s.qtyHarina || 0), 0);
  const sumIntegral = state.sales.reduce((a, s) => a + Number(s.qtyIntegral || 0), 0);
  const sumMoney = state.sales.reduce((a, s) => a + Number(s.total || 0), 0);

  dayHarina.textContent = sumHarina;
  dayIntegral.textContent = sumIntegral;
  dayMoney.textContent = mxn(sumMoney);

  // Botones eliminar por venta
  document.querySelectorAll("[data-del-sale]").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = Number(btn.getAttribute("data-del-sale"));
      state.sales.splice(i, 1);
      saveDaySales();
      renderSales();
    });
  });
}

// Limpia formulario de pedido
function resetForm() {
  customerSelect.value = "";
  qtyHarina.value = 0;
  qtyIntegral.value = 0;
  notes.value = "";
  paid.value = 0;
  applySelectedLocalPricing();
}

// Registra una venta
function addSale() {
  const localId = customerSelect.value;
  if (!localId) {
    alert("Selecciona un local/cliente.");
    customerSelect.focus();
    return;
  }

  const loc = state.locals.find(l => l.id === localId);
  const custName = loc ? loc.name : "Sin nombre";

  const ph = Number(priceHarina.value || 0);
  const pi = Number(priceIntegral.value || 0);

  const qh = Number(qtyHarina.value || 0);
  const qi = Number(qtyIntegral.value || 0);

  const nt = notes.value.trim();
  const p = Number(paid.value || 0);

  if (qh === 0 && qi === 0) {
    alert("Agrega al menos 1 paquete (harina o integral).");
    return;
  }

  const sh = ph * qh;
  const si = pi * qi;
  const t = sh + si;

  const diff = p - t;

  const sale = {
    time: nowHHMM(),
    customer: custName,
    localId,

    priceHarina: ph,
    priceIntegral: pi,

    qtyHarina: qh,
    qtyIntegral: qi,

    notes: nt,

    subtotalHarina: sh,
    subtotalIntegral: si,
    total: t,

    paid: p,
    change: Math.max(0, diff),   // cambio si pagó de más
    missing: Math.max(0, -diff)  // faltante si pagó de menos
  };

  // Unshift para que la venta más nueva aparezca arriba
  state.sales.unshift(sale);

  saveDaySales();
  renderSales();

  // Limpia cantidades pero mantiene el local seleccionado (más rápido)
  qtyHarina.value = 0;
  qtyIntegral.value = 0;
  notes.value = "";
  paid.value = 0;

  calcPreview();
  qtyHarina.focus();
}

// Exporta CSV de ventas del día
function exportCSV() {
  const headers = [
    "Fecha","Hora","Cliente",
    "Paquetes Harina","Paquetes Integral",
    "Precio Harina","Precio Integral",
    "Subtotal Harina","Subtotal Integral",
    "Total","Pago","Cambio","Faltante","Notas/Cambios"
  ];

  const rows = state.sales.map(s => ([
    state.dateKey,
    s.time,
    s.customer,
    s.qtyHarina,
    s.qtyIntegral,
    s.priceHarina,
    s.priceIntegral,
    s.subtotalHarina,
    s.subtotalIntegral,
    s.total,
    s.paid,
    s.change,
    s.missing,
    (s.notes || "").replaceAll("\n", " ")
  ]));

  const csv = [headers, ...rows]
    .map(r => r.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `tortilleria_${state.dateKey}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Borra ventas del día (solo hoy)
function clearDay() {
  const ok = confirm("¿Seguro que quieres borrar todas las ventas de HOY?");
  if (!ok) return;

  state.sales = [];
  saveDaySales();
  renderSales();
}


// ===================== INIT (arranque de la app) =====================

function init() {
  // Muestra fecha arriba
  todayLabel.textContent = `Registro del día: ${state.dateKey}`;

  // Precio integral fijo
  priceIntegral.value = FIXED_INTEGRAL_PRICE;

  // Default de harina en creación de local
  localHarinaPrice.value = String(HARINA_PRICES[0]);

  // Cargar datos guardados
  loadLocals();
  loadDaySales();

  // Pintar UI
  renderLocals();
  renderSales();

  // Aplicar precios según selección del local
  applySelectedLocalPricing();

  // Estado inicial del colapsable (guardado)
  setLocalsCollapsed(getLocalsCollapsed());

  // =====================
  // Listeners (eventos)
  // =====================

  // Colapsar/expandir locales
  btnToggleLocals.addEventListener("click", () => {
    const isOpen = localsContent.classList.contains("open");
    setLocalsCollapsed(isOpen); // si está abierto -> colapsa, si está colapsado -> abre
  });

  // Locales: agregar/guardar
  btnAddLocal.addEventListener("click", upsertLocal);

  // Locales: cancelar edición
  btnCancelEditLocal.addEventListener("click", cancelEditLocal);

  // Enter en nombre del local = agregar/guardar
  localName.addEventListener("keydown", (e) => {
    if (e.key === "Enter") upsertLocal();
  });

  // Cuando cambias local, cambian precios
  customerSelect.addEventListener("change", applySelectedLocalPricing);

  // Recalcular preview cuando cambian cantidades/pago
  [qtyHarina, qtyIntegral, paid].forEach(inp => inp.addEventListener("input", calcPreview));

  // Ventas: registrar
  btnAddSale.addEventListener("click", addSale);

  // Ventas: limpiar formulario
  btnReset.addEventListener("click", resetForm);

  // Botones del header
  btnPrint.addEventListener("click", () => window.print());
  btnExport.addEventListener("click", exportCSV);
  btnClearDay.addEventListener("click", clearDay);
}

init();
