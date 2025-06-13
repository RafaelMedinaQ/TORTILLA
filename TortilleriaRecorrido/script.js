const precioIntegral = 28;
const tabla = document.getElementById("tablaLocales");
let locales = cargarDesdeLocalStorage() || [
  { nombre: "Tienda A", precioHarina: 22, harina: 0, integral: 0 },
  { nombre: "Tienda B", precioHarina: 24, harina: 0, integral: 0 }
];

// Genera la tabla
function renderizarTabla() {
  tabla.innerHTML = "";
  locales.forEach((local, index) => {
    const fila = document.createElement("tr");

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
      <td class="total" id="total-${index}">$${calcularTotal(local)}</td>
    `;

    tabla.appendChild(fila);
  });
}

// Actualiza nombre del local
function actualizarNombre(index, nuevoNombre) {
  locales[index].nombre = nuevoNombre;
  guardarEnLocalStorage();
}

// Cambia el precio de harina (22 o 24)
function actualizarPrecio(index, nuevoPrecio) {
  locales[index].precioHarina = parseInt(nuevoPrecio);
  guardarEnLocalStorage();
  actualizarTotales();
}

// Actualiza cantidades
function actualizarCantidad(index, tipo, valor) {
  locales[index][tipo] = parseInt(valor) || 0;
  guardarEnLocalStorage();
  actualizarTotales();
}

// Calcula el total para un local
function calcularTotal(local) {
  return ((local.harina * local.precioHarina) + (local.integral * precioIntegral)).toFixed(2);
}

// Refresca solo los totales
function actualizarTotales() {
  locales.forEach((local, i) => {
    document.getElementById(`total-${i}`).textContent = `$${calcularTotal(local)}`;
  });
}

// Guarda a localStorage
function guardarEnLocalStorage() {
  localStorage.setItem("localesTortilla", JSON.stringify(locales));
}

// Carga desde localStorage
function cargarDesdeLocalStorage() {
  return JSON.parse(localStorage.getItem("localesTortilla"));
}

// Exporta a Excel con nombre con fecha
function exportarExcel() {
  const datos = [["Local", "Precio Harina", "Cant. Harina", "Cant. Integral", "Total $"]];
  locales.forEach(local => {
    datos.push([
      local.nombre,
      local.precioHarina,
      local.harina,
      local.integral,
      calcularTotal(local)
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tortillas");
  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Tortillas_${fecha}.xlsx`);
}

// Filtro en vivo
function filtrarLocales() {
  const filtro = document.getElementById("buscador").value.toLowerCase();
  const filas = tabla.getElementsByTagName("tr");
  locales.forEach((local, i) => {
    const visible = local.nombre.toLowerCase().includes(filtro);
    filas[i].style.display = visible ? "" : "none";
  });
}

// Agrega nueva fila en blanco
function agregarLocal() {
  locales.push({
    nombre: "",
    precioHarina: 22,
    harina: 0,
    integral: 0
  });
  guardarEnLocalStorage();
  renderizarTabla();
}

// Inicializa al cargar
renderizarTabla();
