import React, { useState, useRef } from 'react'
import { QRCodeSVG as QRCode } from 'qrcode.react'
import { useNotification } from '../context/NotificationContext'

interface InvoiceQrCodeProps {
  invoiceId: number
  invoiceNumber: string
  isPrint?: boolean
  size?: number
}

/**
 * مكون عرض QR Code للفاتورة
 * يمكن طباعته أو تحميله
 */
export default function InvoiceQrCode({
  invoiceId,
  invoiceNumber,
  isPrint = false,
  size = isPrint ? 150 : 120
}: InvoiceQrCodeProps) {
  const qrRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const { notify } = useNotification()

  // بناء الرابط
  const baseUrl = process.env.REACT_APP_URL || process.env.VITE_API_URL || 'https://smartaccountant.com'
  const qrValue = `${baseUrl}/verify-invoice/${invoiceId}?ref=verify`

  /**
   * تحميل QR Code كصورة PNG
   */
  const downloadQrCode = () => {
    setLoading(true)
    try {
      const element = qrRef.current?.querySelector('canvas') as HTMLCanvasElement
      if (element) {
        const url = element.toDataURL('image/png')
        const link = document.createElement('a')
        link.href = url
        link.download = `invoice-${invoiceNumber}-qr.png`
        link.click()
      }
    } catch (error) {
      console.error('Error downloading QR code:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * نسخ الرابط إلى clipboard
   */
  const copyQrLink = async () => {
    try {
      await navigator.clipboard.writeText(qrValue)
      notify('تم نسخ الرابط إلى الحافظة', 'success')
    } catch (error) {
      console.error('Error copying QR link:', error)
      notify('تعذر نسخ الرابط', 'error')
    }
  }

  return (
    <div className={`qr-code-container flex flex-col items-center gap-3 ${isPrint ? 'print-mode' : ''}`}>
      {/* QR Code */}
      <div
        ref={qrRef}
        className={`border-2 border-gray-300 p-2 rounded bg-white ${
          isPrint ? 'print:border-black' : ''
        }`}
      >
        <QRCode
          value={qrValue}
          size={size}
          level="H"
          includeMargin={true}
          renderAs="canvas"
          quietZone={10}
        />
      </div>

      {/* معلومات الفاتورة */}
      <div className="text-center">
        <p className="text-xs font-semibold text-gray-700">#{invoiceNumber}</p>
        <p className="text-xs text-gray-500">رمز التحقق الفريد</p>
      </div>

      {/* الأزرار (تظهر فقط في الشاشة وليس في الطباعة) */}
      {!isPrint && (
        <div className="flex gap-2 mt-2 flex-col sm:flex-row print:hidden">
          <button
            onClick={downloadQrCode}
            disabled={loading}
            className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
            title="تحميل رمز QR"
          >
            {loading ? 'جاري التحميل...' : '📥 تحميل'}
          </button>

          <button
            onClick={copyQrLink}
            className="text-xs bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
            title="نسخ الرابط"
          >
            📋 نسخ الرابط
          </button>
        </div>
      )}

      {/* معالجة الطباعة */}
      <style jsx>{`
        @media print {
          .print:hidden {
            display: none !important;
          }
          .print-mode {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}
