/**
 * Subscription invoice / bill layout (public/assets/invoice.ejs is the server reference for invoices).
 * Bills use the same layout with "Bill" wording; use variant="bill" or document_type BILL.
 */

import { forwardRef } from 'react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDateShort(value) {
  if (!value) return 'N/A'
  try {
    const d = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(d.getTime())) return 'N/A'
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
  } catch {
    return 'N/A'
  }
}

function formatCurrencyRs(value) {
  const num = Number.parseFloat(value)
  const n = Number.isFinite(num) ? num : 0
  return `Rs. ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function defaultLogoSrcYaadro(override) {
  return override || '/assets/yaadro-logo.svg'
}

function defaultLogoSrcCodeteak(override) {
  return override || '/assets/codeteak-logo.png'
}

/** @param {'auto'|'invoice'|'bill'|undefined} variant */
function resolveIsBill(variant, documentType) {
  const v = String(variant || 'auto').toLowerCase()
  if (v === 'bill') return true
  if (v === 'invoice') return false
  return String(documentType || '').toUpperCase() === 'BILL'
}

/**
 * @param {object} props
 * @param {'auto'|'invoice'|'bill'} [props.variant] — default auto from invoice.document_type
 * @param {object} props.invoice
 * @param {object} [props.shop]
 * @param {object} [props.subscription]
 * @param {object} [props.address]
 * @param {string} [props.documentTitle] — overrides inferred Invoice/Bill title
 * @param {string} [props.documentNumberLabel]
 */
const SubscriptionInvoiceDocument = forwardRef(function SubscriptionInvoiceDocument(
  {
    invoice,
    shop,
    subscription,
    address,
    variant = 'auto',
    documentTitle: documentTitleProp,
    documentNumberLabel,
    yaadroLogoSrc,
    codeteakLogoSrc,
    barcodeSrc,
    qrCodeSrc,
  },
  ref,
) {
  if (!invoice) return null

  const isBill = resolveIsBill(variant, invoice.document_type)
  const rawType = String(invoice.document_type ?? '').toUpperCase()

  let documentTitle =
    documentTitleProp ??
    (isBill ? 'Bill' : rawType === 'INVOICE' || rawType === '' ? 'Invoice' : String(invoice.document_type ?? 'Invoice'))

  documentTitle = String(documentTitle)
  const docLabel = documentNumberLabel ?? (isBill ? 'Bill Number' : 'Invoice Number')
  const titleUpper = documentTitle.toUpperCase()
  const titleLower = documentTitle.toLowerCase()

  const baseAmount = Number.parseFloat(invoice.amount) || 0
  const discount = Number.parseFloat(invoice.discount) || 0
  const otherCharges = Number.parseFloat(invoice.other_charges) || 0
  const cgst = Number.parseFloat(invoice.cgst) || 0
  const sgst = Number.parseFloat(invoice.sgst) || 0
  const igst = Number.parseFloat(invoice.igst) || 0
  const vat = cgst + sgst + igst
  const taxableAmount = baseAmount - discount + otherCharges
  const totalAmount = taxableAmount + vat

  const billingStart = formatDateShort(invoice.billing_period_start)
  const billingEnd = formatDateShort(invoice.billing_period_end)
  const invoiceDate = formatDateShort(invoice.created_at)

  const shopName = shop?.shop_name ?? 'Unknown Shop'
  const customerType = shop?.customer_type ?? 'Registered'
  const userIdDisplay = shop?.user_id != null && shop.user_id !== '' ? String(shop.user_id) : 'N/A'
  const subId = subscription?.subscription_id ?? invoice.subscription_id ?? 'N/A'

  const hideManualAddress =
    address &&
    address.city === 'Manual' &&
    address.state === 'Manual' &&
    address.pincode === '000000'

  const yaadro = defaultLogoSrcYaadro(yaadroLogoSrc)
  const codeteak = defaultLogoSrcCodeteak(codeteakLogoSrc)

  return (
    <>
      <style>{`
        .subscription-invoice-doc * { margin: 0; padding: 0; box-sizing: border-box; }
        .subscription-invoice-doc {
          font-family: Arial, Helvetica, sans-serif;
          background: #ffffff;
          color: #000;
          font-size: 10px;
        }
        .subscription-invoice-doc .subscription-doc-container {
          width: 210mm;
          max-width: 100%;
          margin: 0 auto;
          padding: 10mm 2mm;
        }
        .subscription-invoice-doc .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 14px;
        }
        .subscription-invoice-doc .header-left { width: 45%; }
        .subscription-invoice-doc .yaadro-logo { max-width: 90px; margin-bottom: 6px; }
        .subscription-invoice-doc .brand-name { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
        .subscription-invoice-doc .brand-tagline { font-size: 9px; color: #555; margin-bottom: 6px; }
        .subscription-invoice-doc .codeteak-logo { max-width: 200px; height: auto; }
        .subscription-invoice-doc .header-right { width: 40%; text-align: right; }
        .subscription-invoice-doc .doc-title {
          font-size: 22px;
          font-weight: bold;
          margin-bottom: 6px;
          letter-spacing: 0.5px;
        }
        .subscription-invoice-doc .doc-meta { font-size: 10px; margin-bottom: 8px; line-height: 1.4; }
        .subscription-invoice-doc .barcode img { max-width: 130px; margin: 6px 0 8px; }
        .subscription-invoice-doc .qr-section { text-align: right; }
        .subscription-invoice-doc .qr-section img { width: 90px; height: 90px; margin-bottom: 4px; }
        .subscription-invoice-doc .qr-label { font-size: 9px; font-weight: bold; margin-bottom: 4px; }
        .subscription-invoice-doc .qr-doc-number { font-size: 8px; }
        .subscription-invoice-doc .info-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }
        .subscription-invoice-doc .info-box { border: 0.6px solid #000; padding: 8px; }
        .subscription-invoice-doc .info-box h3 {
          font-size: 10px;
          font-weight: bold;
          margin-bottom: 6px;
          border-bottom: 0.6px solid #000;
          padding-bottom: 3px;
          text-transform: uppercase;
        }
        .subscription-invoice-doc .info-box p { margin-bottom: 3px; line-height: 1.4; }
        .subscription-invoice-doc .bill-from { border: 0.6px solid #000; padding: 8px; margin-bottom: 12px; }
        .subscription-invoice-doc .bill-from h3 {
          font-size: 10px;
          font-weight: bold;
          margin-bottom: 6px;
          text-transform: uppercase;
        }
        .subscription-invoice-doc table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
          font-size: 9px;
        }
        .subscription-invoice-doc th, .subscription-invoice-doc td {
          border: 0.6px solid #000;
          padding: 5px 4px;
        }
        .subscription-invoice-doc th {
          background: #f2f2f2;
          text-align: center;
          font-weight: bold;
        }
        .subscription-invoice-doc td { text-align: center; }
        .subscription-invoice-doc td.text-left { text-align: left; }
        .subscription-invoice-doc td.text-right { text-align: right; }
        .subscription-invoice-doc .description-cell { text-align: left; padding-left: 6px; }
        .subscription-invoice-doc .total-row td { font-weight: bold; }
        .subscription-invoice-doc .declaration { font-size: 9px; margin-bottom: 12px; line-height: 1.4; }
        .subscription-invoice-doc .declaration-title { font-weight: bold; margin-bottom: 4px; }
        .subscription-invoice-doc .footer {
          font-size: 8px;
          line-height: 1.4;
          text-align: center;
          margin-top: 12px;
        }
        .subscription-invoice-doc .footer p { margin-bottom: 3px; }
        .subscription-invoice-doc .footer-codeteak-banner {
          text-align: center;
          margin: 12px 0 14px;
        }
        .subscription-invoice-doc .footer-codeteak-banner img {
          max-width: 220px;
          width: 100%;
          height: auto;
          display: inline-block;
          vertical-align: middle;
        }
        .subscription-invoice-doc .powered-by { margin-top: 8px; font-size: 8px; text-align: center; }
        @media print {
          body * { visibility: hidden; }
          .subscription-invoice-print-root,
          .subscription-invoice-print-root * { visibility: visible; }
          .subscription-invoice-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      <div ref={ref} className="subscription-invoice-doc subscription-invoice-print-root text-black">
        <div className="subscription-doc-container">
          <div className="header">
            <div className="header-left">
              <img src={yaadro} alt="Yaadro Logo" className="yaadro-logo" />
              <div className="brand-name">Yaadro</div>
              <div className="brand-tagline">Delivery Management Service</div>
              <img src={codeteak} alt="CodeTeak Logo" className="codeteak-logo" />
            </div>

            <div className="header-right">
              <div className="doc-title">{titleUpper}</div>
              <div className="doc-meta">
                <p>
                  <strong>{docLabel}:</strong> {invoice.invoice_number || 'N/A'}
                </p>
                <p>
                  <strong>{documentTitle} Date:</strong> {invoiceDate}
                </p>
              </div>

              <div className="barcode">{barcodeSrc ? <img src={barcodeSrc} alt="Barcode" /> : null}</div>

              <div className="qr-section">
                <div className="qr-label">
                  {documentTitle} QR Code
                </div>
                {qrCodeSrc ? <img src={qrCodeSrc} alt={`${documentTitle} QR Code`} /> : null}
                <div className="qr-doc-number">
                  {documentTitle}: {invoice.invoice_number || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          <div className="info-section">
            <div className="info-box">
              <h3>BILL TO / SHIP TO:</h3>
              <p>
                <strong>{shopName}</strong>
              </p>
              {address ? (
                <>
                  {address.street_address ? <p>{address.street_address}</p> : null}
                  {!hideManualAddress ? (
                    <p>
                      {address.city || ''}
                      {address.city && (address.state || address.pincode) ? ', ' : ''}
                      {address.state || ''}
                      {address.state && address.pincode ? ' - ' : ''}
                      {address.pincode || ''}
                    </p>
                  ) : null}
                </>
              ) : null}
              <p>
                <strong>Customer Type:</strong> {customerType}
              </p>
              {shop?.email ? (
                <p>
                  <strong>Email:</strong> {shop.email}
                </p>
              ) : null}
              {shop?.phone ? (
                <p>
                  <strong>Phone:</strong> {shop.phone}
                </p>
              ) : null}
            </div>

            <div className="info-box">
              <h3>SUBSCRIPTION DETAILS:</h3>
              <p>
                <strong>Subscription ID:</strong> {String(subId)}
              </p>
              <p>
                <strong>User ID:</strong> {userIdDisplay}
              </p>
              <p>
                <strong>Billing Period:</strong>
              </p>
              <p>
                {billingStart} to {billingEnd}
              </p>
              <p>
                <strong>Status:</strong> {(invoice.status || 'PENDING').toUpperCase()}
              </p>
            </div>
          </div>

          <div className="bill-from">
            <h3>BILL FROM:</h3>
            <p>
              <strong>CODETEAK TECHNOLOGIES</strong>
            </p>
            <p>
              Arine Amaryills, Akshaya Nagar Gardens,
              <br />
              Akshayanagar West 560114,
              <br />
              Bangalore, India
            </p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Gross Amount</th>
                <th>Discount</th>
                <th>Other Charges</th>
                <th>Taxable Amount</th>
                <th>VAT</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="description-cell">
                  <strong>{invoice.description || 'Yaadro Monthly Subscription Fee'}</strong>
                  <br />
                  <small>
                    Period: {billingStart} to {billingEnd}
                  </small>
                </td>
                <td>1</td>
                <td className="text-right">{formatCurrencyRs(baseAmount)}</td>
                <td className="text-right">{formatCurrencyRs(discount)}</td>
                <td className="text-right">{formatCurrencyRs(otherCharges)}</td>
                <td className="text-right">{formatCurrencyRs(taxableAmount)}</td>
                <td className="text-right">{formatCurrencyRs(vat)}</td>
                <td className="text-right">
                  <strong>{formatCurrencyRs(totalAmount)}</strong>
                </td>
              </tr>
              <tr className="total-row">
                <td className="text-left">TOTAL</td>
                <td>1</td>
                <td className="text-right">{formatCurrencyRs(baseAmount)}</td>
                <td className="text-right">{formatCurrencyRs(discount)}</td>
                <td className="text-right">{formatCurrencyRs(otherCharges)}</td>
                <td className="text-right">{formatCurrencyRs(taxableAmount)}</td>
                <td className="text-right">{formatCurrencyRs(vat)}</td>
                <td className="text-right">{formatCurrencyRs(totalAmount)}</td>
              </tr>
            </tbody>
          </table>

          <div className="declaration">
            <div className="declaration-title">DECLARATION</div>
            <p>
              The services provided as part of this {titleLower} are for subscription billing purposes. This{' '}
              {titleLower} is generated automatically by the system.
            </p>
            <p>
              <em>This is an auto generated {titleLower}.</em>
            </p>
          </div>

          <div className="footer">
            <div className="footer-codeteak-banner">
              <img src={codeteak} alt="CodeTeak Technologies" />
            </div>
            <p>
              <strong>Registered Address:</strong> CodeTeak Technologies, Arine Amaryills, Akshaya Nagar Gardens,
              Akshayanagar West 560114, Bangalore, India
            </p>
            <p>
              <strong>For any queries, please contact:</strong>
            </p>
            <p>info@codeteak.com | +91 9995203149</p>

            <div className="powered-by">Powered by CodeTeak Technologies</div>
          </div>
        </div>
      </div>
    </>
  )
})

/** Same layout as invoice with Bill wording; React-only (no bill.ejs). */
export const SubscriptionBillDocument = forwardRef(function SubscriptionBillDocument(props, ref) {
  return <SubscriptionInvoiceDocument {...props} ref={ref} variant="bill" />
})

export default SubscriptionInvoiceDocument
