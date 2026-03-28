import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/**
 * Renders a DOM node (subscription invoice template) to a multi-page A4 PDF and triggers download.
 * @param {HTMLElement} element — root of the invoice (e.g. .subscription-invoice-doc)
 * @param {string} filename — e.g. invoice-INV-001.pdf
 */
export async function downloadInvoicePdfFromElement(element, filename = 'invoice.pdf') {
  if (!element) {
    throw new Error('Invoice element not found')
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = pdf.internal.pageSize.getHeight()
  const imgWidth = pdfWidth
  const imgHeight = (canvas.height * pdfWidth) / canvas.width

  let heightLeft = imgHeight
  let position = 0

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
  heightLeft -= pdfHeight

  while (heightLeft > 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pdfHeight
  }

  pdf.save(filename)
}

export function safeInvoiceFilename(invoiceNumber, invoiceId) {
  const base = invoiceNumber || `invoice-${invoiceId ?? 'unknown'}`
  const safe = String(base).replace(/[^\w.-]+/g, '_')
  return safe.endsWith('.pdf') ? safe : `${safe}.pdf`
}
