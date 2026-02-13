import React from 'react'
import InvoiceQrCode from '../components/InvoiceQrCode'

interface InvoicePrintTemplateProps {
  invoice: {
    id: number
    number: string
    createdAt: string
    account?: {
      name: string
      email?: string
      phone?: string
      address?: string
      taxId?: string
    }
    customer?: {
      name: string
      email?: string
      phone?: string
      address?: string
    }
    items?: Array<{
      id: number
      description: string
      quantity: number
      price: number
      total: number
    }>
    totalAmount: number
    taxAmount?: number
    discountAmount?: number
    finalAmount?: number
    paidAmount?: number
    notes?: string
    status: string
  }
}

/**
 * قالب طباعة الفاتورة مع QR Code
 */
export default function InvoicePrintTemplate({ invoice }: InvoicePrintTemplateProps) {
  const finalAmount =
    invoice.finalAmount ||
    invoice.totalAmount + (invoice.taxAmount || 0) - (invoice.discountAmount || 0)

  return (
    <div className="w-full max-w-4xl mx-auto p-8 bg-white">
      {/* الرأس مع QR Code */}
      <div className="flex justify-between items-start mb-8 border-b-2 pb-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">فاتورة</h1>
          <p className="text-lg text-gray-600 mt-2">رقم: {invoice.number}</p>
          <p className="text-sm text-gray-500">
            التاريخ: {new Date(invoice.createdAt).toLocaleDateString('ar-SA')}
          </p>
        </div>

        {/* QR Code في الزاوية العلوية اليمنى */}
        <div className="border-4 border-gray-300 p-3 rounded-lg bg-gray-50">
          <InvoiceQrCode
            invoiceId={invoice.id}
            invoiceNumber={invoice.number}
            isPrint={true}
            size={150}
          />
        </div>
      </div>

      {/* المعلومات - من وإلى */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* من */}
        <div>
          <h3 className="font-bold text-lg mb-4 text-gray-800">الشركة:</h3>
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-gray-900">{invoice.account?.name}</p>
            {invoice.account?.address && <p className="text-gray-600">{invoice.account.address}</p>}
            {invoice.account?.phone && <p className="text-gray-600">هاتف: {invoice.account.phone}</p>}
            {invoice.account?.email && <p className="text-gray-600">البريد: {invoice.account.email}</p>}
            {invoice.account?.taxId && <p className="text-gray-600">الرقم الضريبي: {invoice.account.taxId}</p>}
          </div>
        </div>

        {/* إلى */}
        <div>
          <h3 className="font-bold text-lg mb-4 text-gray-800">العميل:</h3>
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-gray-900">{invoice.customer?.name}</p>
            {invoice.customer?.address && <p className="text-gray-600">{invoice.customer.address}</p>}
            {invoice.customer?.phone && <p className="text-gray-600">هاتف: {invoice.customer.phone}</p>}
            {invoice.customer?.email && <p className="text-gray-600">البريد: {invoice.customer.email}</p>}
          </div>
        </div>
      </div>

      {/* جدول البنود */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200 border-2 border-gray-400">
              <th className="border border-gray-400 p-3 text-right font-bold">الوصف</th>
              <th className="border border-gray-400 p-3 text-center font-bold">الكمية</th>
              <th className="border border-gray-400 p-3 text-center font-bold">السعر</th>
              <th className="border border-gray-400 p-3 text-center font-bold">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items && invoice.items.length > 0 ? (
              invoice.items.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-400 p-3 text-right">{item.description}</td>
                  <td className="border border-gray-400 p-3 text-center">{item.quantity}</td>
                  <td className="border border-gray-400 p-3 text-center">${item.price.toFixed(2)}</td>
                  <td className="border border-gray-400 p-3 text-center font-semibold">
                    ${item.total.toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="border border-gray-400 p-3 text-center text-gray-500">
                  لا توجد بنود
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* المجاميع */}
      <div className="flex justify-end mb-8">
        <div className="w-64 space-y-2">
          <div className="flex justify-between border-b-2 pb-2">
            <span className="font-semibold">الإجمالي:</span>
            <span className="font-semibold">${invoice.totalAmount.toFixed(2)}</span>
          </div>

          {invoice.discountAmount && invoice.discountAmount > 0 && (
            <div className="flex justify-between border-b pb-2 text-red-600">
              <span className="font-semibold">الخصم:</span>
              <span className="font-semibold">-${invoice.discountAmount.toFixed(2)}</span>
            </div>
          )}

          {invoice.taxAmount && invoice.taxAmount > 0 && (
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold">الضريبة:</span>
              <span className="font-semibold">${invoice.taxAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between pt-2 border-t-4 border-gray-900 text-lg">
            <span className="font-bold">المستحق:</span>
            <span className="font-bold text-blue-600">${finalAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between pt-2 text-sm">
            <span className="font-semibold">المدفوع:</span>
            <span className="font-semibold">${(invoice.paidAmount || 0).toFixed(2)}</span>
          </div>

          {(invoice.paidAmount || 0) < finalAmount && (
            <div className="flex justify-between pt-2 bg-yellow-50 p-2 rounded">
              <span className="font-semibold text-orange-600">المتبقي:</span>
              <span className="font-semibold text-orange-600">
                ${(finalAmount - (invoice.paidAmount || 0)).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* QR Code في الأسفل للتحقق */}
      <div className="border-t-4 pt-8 flex flex-col items-center mb-8">
        <p className="text-center text-gray-600 mb-4 font-semibold">
          امسح رمز QR أدناه للتحقق من صحة هذه الفاتورة
        </p>
        <InvoiceQrCode
          invoiceId={invoice.id}
          invoiceNumber={invoice.number}
          isPrint={true}
          size={120}
        />
      </div>

      {/* الملاحظات */}
      {invoice.notes && (
        <div className="border-t pt-4">
          <p className="font-semibold text-gray-700 mb-2">ملاحظات:</p>
          <p className="text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      {/* الحالة */}
      <div className="mt-8 text-center border-t pt-4">
        <span
          className={`inline-block px-4 py-2 rounded font-semibold ${
            invoice.status === 'Paid'
              ? 'bg-green-100 text-green-800'
              : invoice.status === 'Partial'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
          }`}
        >
          {invoice.status === 'Paid'
            ? '✓ مدفوعة'
            : invoice.status === 'Partial'
              ? '◐ دفع جزئي'
              : '✗ معلقة'}
        </span>
      </div>

      {/* تذييل */}
      <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
        <p>شكراً لتعاملكم معنا</p>
        <p className="mt-1">تاريخ الطباعة: {new Date().toLocaleString('ar-SA')}</p>
      </div>

      {/* أنماط الطباعة */}
      <style jsx>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background-color: white;
          }

          .page-break {
            page-break-before: always;
          }

          /* تحسينات الطباعة */
          * {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            print-color-adjust: exact;
          }

          table {
            page-break-inside: avoid;
          }

          tr {
            page-break-inside: avoid;
          }
        }

        @page {
          size: A4;
          margin: 0.5in;
        }
      `}</style>
    </div>
  )
}
