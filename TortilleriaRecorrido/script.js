const precioIntegral = 28;
const tabla = document.getElementById("tablaLocales");
let locales = cargarDesdeLocalStorage() || [
  { nombre: "Tienda A", precioHarina: 22, harina: 0, integral: 0, pago: 0 }
];

function renderizarTabla() {
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
      <td><input type="number" min="0" value="${local.harina}" onchange="actualizarCantidad(${index}, 'harina', this.value)"></td>
      <td><input type="number" min="0" value="${local.integral}" onchange="actualizarCantidad(${index}, 'integral', this.value)"></td>
      <td class="total" id="total-${index}">$${total.toFixed(2)}</td>
      <td><input type="number" min="0" value="${local.pago || ""}" onchange="actualizarPago(${index}, this.value)"></td>
      <td id="cambio-${index}">${cambio ? `$${cambio}` : ""}</td>
      <td><button onclick="eliminarLocal(${index})">❌</button></td>
    `;

    tabla.appendChild(fila);
  });
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

function guardarEnLocalStorage() {
  localStorage.setItem("localesTortilla", JSON.stringify(locales));
}

function cargarDesdeLocalStorage() {
  return JSON.parse(localStorage.getItem("localesTortilla"));
}

function exportarExcel() {
  const datos = [["Local", "Precio Harina", "Cant. Harina", "Cant. Integral", "Total $", "Pagó con", "Cambio"]];
  locales.forEach(local => {
    const total = calcularTotal(local);
    const cambio = local.pago ? (local.pago - total).toFixed(2) : "";
    datos.push([
      local.nombre,
      local.precioHarina,
      local.harina,
      local.integral,
      total.toFixed(2),
      local.pago || "",
      cambio
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tortillas");
  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Tortillas_${fecha}.xlsx`);
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

// Inicializar
renderizarTabla();
