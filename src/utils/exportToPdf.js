import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

/**
 * Captura un nodo (ej. un div con productos) y genera un PDF en tamaño A4
 * @param {HTMLElement} node - El nodo HTML que quieres exportar
 * @param {{ filename?: string, margin?: number }} opts - Opciones
 */
export async function exportNodeToPdf(node, opts = {}) {
  const filename = opts.filename || 'cotizacion.pdf'
  const margin = opts.margin ?? 10

  // Render del nodo a canvas
  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff'
  })

  const imgData = canvas.toDataURL('image/png')

  // Tamaño A4 en mm
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  // Mantener proporción de la imagen
  const imgWidth = pageWidth - margin * 2
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  let y = margin
  let remainingHeight = imgHeight

  // Canvas temporal para cortar en varias páginas si es necesario
  const pageCanvas = document.createElement('canvas')
  const pageCtx = pageCanvas.getContext('2d')
  const scale = imgWidth / canvas.width
  const pageImageHeightPx = ((pageHeight - margin * 2) / scale)

  while (remainingHeight > 0) {
    pageCanvas.width = canvas.width
    pageCanvas.height = Math.min(pageImageHeightPx, canvas.height)

    const offsetY = (imgHeight - remainingHeight) / scale
    pageCtx.drawImage(
      canvas,
      0, offsetY, canvas.width, pageCanvas.height,
      0, 0, canvas.width, pageCanvas.height
    )

    const pageImgData = pageCanvas.toDataURL('image/png')
    if (y !== margin) pdf.addPage()
    pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, (pageCanvas.height * scale))

    remainingHeight -= (pageCanvas.height * scale)
  }

  pdf.save(filename)
}
