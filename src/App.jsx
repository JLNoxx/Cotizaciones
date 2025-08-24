import React, { useEffect, useMemo, useRef, useState } from 'react'
import { exportNodeToPdf } from './utils/exportToPdf.js'
import './styles.css'

/*
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.pdfMake.vfs;

*/


const IGV_RATE = 0.18 // 18%

// Datos fijos de la empresa
const EMPRESA_INFO = {
  nombre: "Dylan S.A.C.",
  sucursal: "Comas",
  direccion: "Av. Universitaria 1234, Comas, Lima",
}

// Cuentas corrientes fijas
const CTAS_CORRIENTES =
  "BCP S/191-1163403-0-44\n" +
  "BCP S/ INTERBANCARIA002-191-001163403044-56\n" +
  "BBVA S/0011-0178-01-00020024\n\n" +
  "BBVA S/ INTERBANCARIA011-178-000100020024-14"

// Datos fijos del vendedor
const VENDEDOR_INFO = {
  nombre: "LUIS VELASQUEZ QUISPE",
  telefono: "+51 933866267",
  correo: "lvelasquez@gildemeister.pe"
}

// 🔹 Generador de números de cotización (controlado en localStorage)
function nextCotizacion() {
  const last = localStorage.getItem("lastCotizacion") || "PTA-00000-1"
  const [_, numStr, serieStr] = last.match(/PTA-(\d+)-(\d+)/) || []
  let num = parseInt(numStr || "0", 10)
  let serie = parseInt(serieStr || "1", 10)

  if (num >= 99999) {
    num = 1
    serie += 1
  } else {
    num += 1
  }

  const next = `PTA-${num.toString().padStart(5, "0")}-${serie}`
  localStorage.setItem("lastCotizacion", next)
  return next
}

export default function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 🔹 Solo se obtiene un número de cotización al cargar
  const [form, setForm] = useState(() => ({
    numCotizacion: localStorage.getItem("lastCotizacion") || "PTA-00001-1",
    clienteNombre: "",
    clienteDniRuc: "",
    clienteDireccion: "",
    clienteTelefono: "",
    clientePais: "",
    clienteProvincia: "",
    clienteDistrito: "",
    observaciones: ""
  }))

  // filas de productos en tabla
  const [rows, setRows] = useState([
    { sku: '', nombre: '', precio: '', descuento: '', qty: 1 }
  ])

  const pdfRef = useRef(null)

  useEffect(() => {
    const url = `${import.meta.env.BASE_URL}products.json`
    fetch(url)
      .then(r => r.json())
      .then(setProducts)
      .catch(() => setError('No se pudo cargar products.json'))
      .finally(() => setLoading(false))
  }, [])

  // cuando escriben un SKU, autocompleta nombre y precio
  const handleSkuChange = (index, value) => {
    const newRows = [...rows]
    newRows[index].sku = value
    const product = products.find(p => p.sku === value)
    if (product) {
      newRows[index].nombre = product.name
      newRows[index].precio = product.price
    }
    setRows(newRows)
  }

  const handleChange = (index, field, value) => {
    const newRows = [...rows]
    newRows[index][field] = value
    setRows(newRows)
  }

  const addRow = () => {
    setRows([...rows, { sku: '', nombre: '', precio: '', descuento: '', qty: 1 }])
  }

  const removeRow = (index) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index))
    }
  }

  const selectedRows = useMemo(() => {
    return rows.map((r) => {
      const unit = Number(r.precio) || 0
      const discPct = Math.min(Math.max(Number(r.descuento) || 0, 0), 100)
      const qty = Math.max(Number(r.qty) || 0, 0)
      const subtotal = qty * unit * (1 - discPct / 100)
      const totalIgv = subtotal * (1 + IGV_RATE)
      return { ...r, unit, discPct, qty, subtotal, totalIgv }
    })
  }, [rows])

  const totals = useMemo(() => {
    const sub = selectedRows.reduce((a, r) => a + r.subtotal, 0)
    const igv = sub * IGV_RATE
    const total = sub + igv
    return { sub, igv, total }
  }, [selectedRows])

  const handleExportPdf = async () => {
    if (!pdfRef.current) return
    await exportNodeToPdf(pdfRef.current, {
      filename: `${form.numCotizacion}.pdf`,
      margin: 8
    })
    // 🔹 Generar y asignar nuevo número solo DESPUÉS de exportar
    const nuevo = nextCotizacion()
    setForm((prev) => ({ ...prev, numCotizacion: nuevo }))
  }

  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  /*
    // 🔹 Vista previa del PDF usando pdfMake (abre en nueva pestaña, sin descargar)
    const handlePreviewPdf = () => {
      const docDefinition = {
        content: [
          { text: `COTIZACIÓN ${form.numCotizacion}`, style: "header" },
          { text: "Fecha: " + new Date().toLocaleDateString(), margin: [0, 0, 0, 10] },
  
          { text: "EMPRESA", style: "subheader" },
          { text: `${EMPRESA_INFO.nombre} - ${EMPRESA_INFO.sucursal}` },
          { text: `Dirección: ${EMPRESA_INFO.direccion}`, margin: [0, 0, 0, 10] },
  
          { text: "CLIENTE", style: "subheader" },
          { text: `Nombre: ${form.clienteNombre}` },
          { text: `DNI/RUC: ${form.clienteDniRuc}` },
          { text: `Dirección: ${form.clienteDireccion}` },
          { text: `Teléfono: ${form.clienteTelefono}` },
          { text: `País: ${form.clientePais} - Provincia: ${form.clienteProvincia} - Distrito: ${form.clienteDistrito}`, margin: [0, 0, 0, 10] },
  
          { text: "VENDEDOR", style: "subheader" },
          { text: `Nombre: ${VENDEDOR_INFO.nombre}` },
          { text: `Teléfono: ${VENDEDOR_INFO.telefono}` },
          { text: `Correo: ${VENDEDOR_INFO.correo}`, margin: [0, 0, 0, 10] },
  
          { text: "DETALLE DE LA COTIZACIÓN", style: "subheader" },
          {
            table: {
              headerRows: 1,
              widths: ["auto", "*", "auto", "auto", "auto", "auto", "auto"],
              body: [
                ["Código", "Nombre", "Cant.", "Precio Unit.", "% Dscto", "SubTotal", "Total c/ IGV"],
                ...selectedRows.map(r => [
                  r.sku,
                  r.nombre,
                  r.qty.toFixed(2),
                  money(r.unit),
                  r.discPct.toFixed(2) + "%",
                  money(r.subtotal),
                  money(r.totalIgv)
                ])
              ]
            },
            layout: "lightHorizontalLines",
            margin: [0, 8, 0, 12]
          },
  
          {
            table: {
              widths: ["*", "auto"],
              body: [
                ["SUBTOTAL", money(totals.sub)],
                ["IGV (18%)", money(totals.igv)],
                ["TOTAL", money(totals.total)]
              ]
            },
            layout: "noBorders",
            margin: [0, 0, 0, 12]
          },
  
          { text: "Observaciones", style: "subheader" },
          { text: form.observaciones || "-", margin: [0, 0, 0, 12] },
  
          { text: "Cuentas Corrientes", style: "subheader" },
          { text: CTAS_CORRIENTES }
        ],
        styles: {
          header: { fontSize: 18, bold: true },
          subheader: { fontSize: 14, bold: true }
        },
        defaultStyle: {
          fontSize: 10
        },
        pageMargins: [30, 30, 30, 30]
      }
  
      pdfMake.createPdf(docDefinition).open()
    }
  
  
    <button onClick={handlePreviewPdf}>Vista previa</button>
    */

  const [previewMode, setPreviewMode] = useState(true)



  return (
    <div className="container">

      {/* === Toolbar superior === */}
      <header className="toolbar">
        <h1>Catálogo de Productos</h1>
        <button onClick={handleExportPdf}>Exportar a PDF</button>
      </header>



      {/* === Tabla de productos dinámica === */}
      <section className="panel">
        <h2>wazaa</h2>

        {loading && <p>Cargando…</p>}
        {error && <p className="error">{error}</p>}
        <table>
          <thead>
            <tr>
              <th>Código (SKU)</th>
              <th>Nombre</th>
              <th>Precio Unitario</th>
              <th>Cantidad</th>
              <th>% Dscto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td><input type="text" className="tabla-input" value={row.sku} onChange={(e) => handleSkuChange(index, e.target.value)} /></td>
                <td><input type="text" className="tabla-input" value={row.nombre} onChange={(e) => handleChange(index, 'nombre', e.target.value)} /></td>
                <td><input type="number" className="tabla-input" value={row.precio} onChange={(e) => handleChange(index, 'precio', e.target.value)} /></td>
                <td><input type="number" className="tabla-input" value={row.qty} onChange={(e) => handleChange(index, 'qty', e.target.value)} /></td>
                <td><input type="number" className="tabla-input" value={row.descuento} onChange={(e) => handleChange(index, 'descuento', e.target.value)} /></td>
                <td><button onClick={() => removeRow(index)}>❌</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <button className="btn-agregar" onClick={addRow}>➕ Agregar producto</button>
      </section>

      {/* Form de cabecera/cliente*/}
      <section className="panel">
        <h2>INGRESE LOS DATOS DEL CLIENTE</h2>
        <div className="grid-2">
          <div className="form-col">
            <h3>Cliente</h3>
            <div className="row"><label>Nombre</label><input value={form.clienteNombre} onChange={e => setF('clienteNombre', e.target.value)} /></div>
            <div className="row"><label>DNI/RUC</label><input value={form.clienteDniRuc} onChange={e => setF('clienteDniRuc', e.target.value)} /></div>
            <div className="row"><label>Dirección</label><input value={form.clienteDireccion} onChange={e => setF('clienteDireccion', e.target.value)} /></div>
            <div className="row"><label>Teléfono</label><input value={form.clienteTelefono} onChange={e => setF('clienteTelefono', e.target.value)} /></div>
            <div className="row"><label>País</label><input value={form.clientePais} onChange={e => setF('clientePais', e.target.value)} /></div>
            <div className="row"><label>Provincia</label><input value={form.clienteProvincia} onChange={e => setF('clienteProvincia', e.target.value)} /></div>
            <div className="row"><label>Distrito</label><input value={form.clienteDistrito} onChange={e => setF('clienteDistrito', e.target.value)} /></div>
          </div>
          <div className="form-col">
            <h3>Observaciones</h3>
            <textarea rows={6} value={form.observaciones} onChange={e => setF('observaciones', e.target.value)} />
          </div>
        </div>
      </section>

      {/*   CABEZERA / LOGO / COTIZACION / FECHA  
      <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo" style={{ width: '140px', height: 'auto' }} />   */}

      {/*   INICIO DEL PDF  */}
      <button onClick={() => setPreviewMode(!previewMode)}>
        {previewMode ? "Ocultar estructura" : "Ver estructura"}
      </button>

      <section
        className="quote"
        ref={pdfRef}
        style={previewMode ? {} : { position: 'fixed', top: 0, left: 0, transform: 'translate(-10000px, -10000px)', pointerEvents: 'none' }}
      >
        <hr className="rule" />
        <div class="contenido-derecha">
          <div className="texto-cotizacion">COTIZACIÓN {form.numCotizacion}</div>
          <div className="fecha">Fecha: {new Date().toLocaleDateString()}</div>
        </div>

        <hr className="rule" />
        <div class="espacio-editable"></div>

        {/*   DATOS DE EMPRESA    */}
        <section class="seccion">
          <div class="cuadro-cliente">
            <div class="fila-cliente">
              <div class="celda contenido"><b>Empresa:</b></div>
              <div class="celda valores"> {EMPRESA_INFO.nombre} </div>
            </div>
            <div class="fila-cliente">
              <div class="celda contenido"><b>Sucursal:</b></div>
              <div class="celda valores">  {EMPRESA_INFO.sucursal}  </div>
            </div>
            <div class="fila-cliente">
              <div class="celda contenido"><b>Dirección:</b></div>
              <div class="celda valores"> {EMPRESA_INFO.direccion}   </div>
              <div class="celda contenido"></div>
              <div class="celda valores"></div>
            </div>
          </div>
        </section>
        <div class="espacio-editable"></div>
        <hr className="rule" />
        <div class="barra-gris-separadora"></div>

        {/*   DATOS DE CLIENTE   */}
        <section class="seccion">
          <h3 class="titulo-seccion"><i><b>CLIENTE</b></i></h3>
          <div class="cuadro-cliente">
            <div class="fila-cliente">
              <div class="celda contenido">Nombre:</div>
              <div class="celda valores">{form.clienteNombre}</div>
              <div class="celda contenido">País:</div>
              <div class="celda valores">{form.clientePais}</div>
            </div>
            <div class="fila-cliente">
              <div class="celda contenido">DNI/RUC:</div>
              <div class="celda valores">{form.clienteDniRuc}</div>
              <div class="celda contenido">Provincia:</div>
              <div class="celda valores">{form.clienteProvincia}</div>
            </div>
            <div class="fila-cliente">
              <div class="celda contenido">Dirección:</div>
              <div class="celda valores">{form.clienteDireccion}</div>
              <div class="celda contenido">Distrito:</div>
              <div class="celda valores">{form.clienteDistrito}</div>
            </div>
            <div class="fila-cliente">
              <div class="celda contenido">Teléfono:</div>
              <div class="celda valores">{form.clienteTelefono}</div>
            </div>
          </div>
        </section>

        <hr className="rule" />
        <div class="barra-gris-separadora"></div>

        {/*   DATOS DE VENDEDOR   */}
        <section class="seccion">
          <h3 class="titulo-seccion"><i><b>VENDEDOR</b></i></h3>
          <div class="cuadro-cliente">
            <div class="fila-cliente">
              <div class="celda contenido">Nombre:</div>
              <div class="celda valores">{VENDEDOR_INFO.nombre}</div>
              <div class="celda contenido">Correo:</div>
              <div class="celda valores">{VENDEDOR_INFO.correo}</div>
            </div>
            <div class="fila-cliente">
              <div class="celda contenido">Teléfono:</div>
              <div class="celda valores">{VENDEDOR_INFO.telefono}</div>
            </div>
          </div>
        </section>

        <hr className="rule" />
        <div class="barra-gris-separadora"></div>

        {/*   CTA CORRIENTE / OBSERVACIONES   */}
        <div className="quote-section two-col">
          <div>
            <h4><i>Cta Corriente</i></h4>
            <div className="boxed">
              BCP S/191-1163403-0-44<br />
              BCP S/ INTERBANCARIA002-191-001163403044-56<br />
              BBVA S/0011-0178-01-00020024<br />
              BBVA S/ INTERBANCARIA011-178-000100020024-14
            </div>
          </div>
          <div>
            <h4>Observaciones</h4>
            <div className="boxed">{form.observaciones}</div>
          </div>
        </div>

        {/*   DETALLE DE LA COTIZACION   */}
        <div className="quote-section">
          <h4>DETALLE DE LA COTIZACIÓN</h4>
          <hr className="rule" />

          {/* 🔹 TABLA DE PRODUCTOS */}
          <div className="table-wrap">
            <table className="quote-table">
              <thead>
                <tr>
                  <th className="tight">Código</th>
                  <th>Nombre</th>
                  <th className="num tight">Cantidad</th>
                  <th className="num medium">Precio Unit.</th>
                  <th className="num tight">% Dscto</th>
                  <th className="num medium">Sub Total</th>
                  <th className="num wide">TOTAL inc IGV (S/.)</th>
                </tr>
              </thead>
              <tbody>
                {selectedRows.map((r, index) => (
                  <tr key={index}>
                    <td>{r.sku}</td>
                    <td>{r.nombre}</td>
                    <td className="num tight">{r.qty.toFixed(2)}</td>
                    <td className="num medium">{money(r.unit)}</td>
                    <td className="num tight">{r.discPct.toFixed(2)}</td>
                    <td className="num medium">{money(r.subtotal)}</td>
                    <td className="num wide">{money(r.totalIgv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 🔹 TABLA DE TOTALES */}
          <div className="totals-wrap">
            <table className="totals-table">
              <tbody>
                <tr>
                  <td className="label">SUBTOTAL:</td>
                  <td className="num">{money(totals.sub)}</td>
                </tr>
                <tr>
                  <td className="label">IGV (18%):</td>
                  <td className="num">{money(totals.igv)}</td>
                </tr>
                <tr>
                  <td className="label total">TOTAL:</td>
                  <td className="num total">{money(totals.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}

function money(n) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(Number(n || 0))
}
