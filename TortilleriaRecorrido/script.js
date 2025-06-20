const precioIntegral = 28;
const tabla = document.getElementById("tablaLocales");
let locales = cargarDesdeLocalStorage() || [
  { nombre: "Tienda A", precioHarina: 22, harina: 0, integral: 0, devueltas: 0, pago: 0 }
];

function renderizarTabla() {
  const filtroActivo = document.getElementById("buscador").value.toLowerCase();

  tabla.innerHTML = "";
  locales.forEach((local, index) => {
    const fila = document.createElement("tr");
    const total = calcularTotal(local);
    const cambio = local.pago > 0 ? (local.pago - total).toFixed(2) : "";

    fila.innerHTML = `
      <td><input type="text" value="${local.nombre}" onchange="actualizarNombre(${index}, this.value)"></td>
      <td>
        <select onchange="actualizarPrecio(${index}, this.value)">
          <option value="22" ${local.precioHarina == 22 ? "selected" : ""}>$22</option>
          <option value="24" ${local.precioHarina == 24 ? "selected" : ""}>$24</option>
        </select>
      </td>
      <td><input type="number" inputmode="numeric" min="0" value="${local.harina}" onchange="actualizarCantidad(${index}, 'harina', this.value)"></td>
      <td><input type="number" inputmode="numeric" min="0" value="${local.integral}" onchange="actualizarCantidad(${index}, 'integral', this.value)"></td>
      <td><input type="number" inputmode="numeric" min="0" value="${local.devueltas || 0}" onchange="actualizarCantidad(${index}, 'devueltas', this.value)"></td>
      <td class="total" id="total-${index}">$${total.toFixed(2)}</td>
      <td><input type="number" inputmode="numeric" min="0" value="${local.pago || ""}" onchange="actualizarPago(${index}, this.value)"></td>
      <td id="cambio-${index}">${cambio ? `$${cambio}` : ""}</td>
      <td><button onclick="eliminarLocal(${index})">❌</button></td>
    `;
    tabla.appendChild(fila);
  });

  calcularTotales();

  if (filtroActivo !== "") {
    document.getElementById("buscador").value = filtroActivo;
    filtrarLocales();
  }
}

function actualizarNombre(index, nuevoNombre) {
  locales[index].nombre = nuevoNombre;
  guardarEnLocalStorage();
}

function actualizarPrecio(index, nuevoPrecio) {
  locales[index].precioHarina = parseInt(nuevoPrecio);
  guardarEnLocalStorage();
  renderizarTabla();
}

function actualizarCantidad(index, tipo, valor) {
  locales[index][tipo] = parseInt(valor) || 0;
  guardarEnLocalStorage();
  renderizarTabla();
}

function actualizarPago(index, valor) {
  locales[index].pago = parseFloat(valor) || 0;
  guardarEnLocalStorage();
  renderizarTabla();
}

function calcularTotal(local) {
  return (local.harina * local.precioHarina) + (local.integral * precioIntegral);
}

function calcularTotales() {
  let totalCambio = 0;
  let totalVentas = 0;

  locales.forEach(local => {
    const total = calcularTotal(local);
    totalVentas += total;
    if (local.pago > total) {
      totalCambio += (local.pago - total);
    }
  });

  document.getElementById("resumenTotal").textContent = 
    `Total vendido: $${totalVentas.toFixed(2)}`;
  document.getElementById("resumenCambio").textContent =
    `Total de cambio entregado: $${totalCambio.toFixed(2)}`;
}

function guardarEnLocalStorage() {
  localStorage.setItem("localesTortilla", JSON.stringify(locales));
}

function cargarDesdeLocalStorage() {
  return JSON.parse(localStorage.getItem("localesTortilla"));
}

function exportarExcel() {
  const datos = [];
  const fechaHoy = new Date();
  const fechaFormateada = fechaHoy.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  datos.push(["Tortillería Margarita"]);
  datos.push(["Fecha:", fechaFormateada]);
  datos.push([""]);

  datos.push([
    "Local", "Precio Harina", "Cant. Harina",
    "Cant. Integral", "Devueltas", "Total $", "Pagó con", "Cambio"
  ]);

  let totalVentas = 0;
  let totalCambio = 0;

  locales.forEach(local => {
    const total = calcularTotal(local);
    const cambio = local.pago ? (local.pago - total).toFixed(2) : "";
    totalVentas += total;
    if (local.pago > total) {
      totalCambio += (local.pago - total);
    }

    datos.push([
      local.nombre,
      local.precioHarina,
      local.harina,
      local.integral,
      local.devueltas || 0,
      total.toFixed(2),
      local.pago || "",
      cambio
    ]);
  });

  datos.push(["", "", "", "", "Totales:", totalVentas.toFixed(2), "", totalCambio.toFixed(2)]);

  const ws = XLSX.utils.aoa_to_sheet([]);
  XLSX.utils.sheet_add_aoa(ws, datos, { origin: "A1" });

  // Cuadrícula y ancho de columnas
  ws['!cols'] = [
    { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
  ];
  ws['!gridlines'] = true;
  ws['!pageSetup'] = {
    paperSize: 9, // A4
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.25, right: 0.25, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 }
  };

  // Fila de encabezado: fila 4
  const encabezadoFila = 4;
  const columnaCount = 8;
  for (let c = 0; c < columnaCount; c++) {
    const letra = String.fromCharCode(65 + c); // A, B, C...
    const celda = ws[`${letra}${encabezadoFila}`];
    if (celda && !celda.s) celda.s = {};
    celda.s.fill = { fgColor: { rgb: "FFF4CC" } }; // amarillo claro
    celda.s.font = { bold: true };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tortillas");

  const fechaArchivo = fechaHoy.toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Tortilleria_Margarita_${fechaArchivo}.xlsx`);
}

function filtrarLocales() {
  const filtro = document.getElementById("buscador").value.toLowerCase();
  const filas = tabla.getElementsByTagName("tr");
  locales.forEach((local, i) => {
    const visible = local.nombre.toLowerCase().includes(filtro);
    filas[i].style.display = visible ? "" : "none";
  });
}

function agregarLocal() {
  locales.push({
    nombre: "",
    precioHarina: 22,
    harina: 0,
    integral: 0,
    devueltas: 0,
    pago: 0
  });
  guardarEnLocalStorage();
  renderizarTabla();
}

function eliminarLocal(index) {
  if (confirm("¿Estás seguro de eliminar este local?")) {
    locales.splice(index, 1);
    guardarEnLocalStorage();
    renderizarTabla();
  }
}

function borrarTodo() {
  if (confirm("¿Quieres borrar solo los datos numéricos (cantidades, pagos, etc.)?")) {
    locales = locales.map(local => ({
      ...local,
      harina: 0,
      integral: 0,
      devueltas: 0,
      pago: 0
    }));
    guardarEnLocalStorage();
    renderizarTabla();
    alert("Los datos numéricos han sido reiniciados.");
  }
}

// Inicializar
renderizarTabla();
