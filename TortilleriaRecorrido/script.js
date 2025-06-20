const precioIntegral = 28;
const tabla = document.getElementById("tablaLocales");
let locales = cargarDesdeLocalStorage() || [
  { nombre: "Tienda A", precioHarina: 22, harina: 0, integral: 0, devueltas: 0, pago: 0 }
];

function renderizarTabla() {
  const filtroActivo = document.getElementById("buscador").value.toLowerCase(); // guardar filtro

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

  // reaplica el filtro visual si está activo
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

  // Obtener y formatear la fecha
  const fechaHoy = new Date();
  const fechaFormateada = fechaHoy.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Encabezado personalizado
  datos.push(["Tortillería Margarita"]);
  datos.push(["Fecha:", fechaFormateada]);
  datos.push([""]); // Espacio en blanco

  // Encabezados de la tabla
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

  // Fila de totales
  datos.push(["", "", "", "", "Totales:", totalVentas.toFixed(2), "", totalCambio.toFixed(2)]);

  const ws = XLSX.utils.aoa_to_sheet(datos);

  // Ancho de columnas
  ws['!cols'] = [
    { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
  ];

  // Configurar impresión para hoja A4 horizontal
  ws['!pageSetup'] = {
    paperSize: 9, // A4
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.25, right: 0.25, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 }
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tortillas");

  const fechaArchivo = fechaHoy.toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Tortilleria_Margarita_${fechaArchivo}.xlsx`);
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


function exportarExcel() {
  const datos = [["Local", "Precio Harina", "Cant. Harina", "Cant. Integral", "Devueltas", "Total $", "Pagó con", "Cambio"]];
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

  // Fila de totales
  datos.push(["", "", "", "", "Totales:", totalVentas.toFixed(2), "", totalCambio.toFixed(2)]);

  const ws = XLSX.utils.aoa_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tortillas");
  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Tortillas_${fecha}.xlsx`);
}


// Inicializar
renderizarTabla();
