import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

interface InvoiceVerificationData {
  verified: boolean
  invoiceId: number
  invoiceNumber: string
  customerName: string
  amount: number
  taxAmount: number
  finalAmount: number
  createdDate: string
  status: string
  paidAmount: number
  notes?: string
}

/**
 * صفحة التحقق من الفاتورة عند مسح QR Code
 * تعرض معلومات الفاتورة والتحقق من صحتها
 */
export default function VerifyInvoicePage() {
  const [searchParams] = useSearchParams()
  const invoiceId = searchParams.get('id')
  const ref = searchParams.get('ref')

  const [invoice, setInvoice] = useState<InvoiceVerificationData | null>(null)
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const verify = async () => {
      try {
        if (!invoiceId || !ref) {
          setError('معرّف الفاتورة ورمز التحقق مطلوبان')
          setLoading(false)
          return
        }

        const apiUrl = process.env.REACT_APP_API_URL || process.env.VITE_API_URL || 'http://localhost:5000'
        const response = await fetch(`${apiUrl}/api/invoices/${invoiceId}/verify?ref=${ref}`)

        if (response.ok) {
          const data = await response.json()
          setInvoice(data)
          setVerified(data.verified)
          setError('')
        } else {
          const errorData = await response.json()
          setError(errorData.message || 'فشل التحقق من الفاتورة')
          setVerified(false)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'حدث خطأ في الاتصال بالخادم')
        setVerified(false)
      } finally {
        setLoading(false)
      }
    }

    verify()
  }, [invoiceId, ref])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">جاري التحقق من الفاتورة...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* رسالة التحقق */}
        {verified && invoice ? (
          <div className="mb-6 animate-fade-in">
            <div className="bg-green-50 border-4 border-green-500 rounded-lg p-8 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="text-5xl">✅</div>
                <div>
                  <h2 className="text-3xl font-bold text-green-700 mb-2">الفاتورة أصلية</h2>
                  <p className="text-green-600">تم التحقق من صحة هذه الفاتورة بنجاح</p>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="mb-6 animate-fade-in">
            <div className="bg-red-50 border-4 border-red-500 rounded-lg p-8 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="text-5xl">❌</div>
                <div>
                  <h2 className="text-3xl font-bold text-red-700 mb-2">فاتورة غير صحيحة</h2>
                  <p className="text-red-600">{error}</p>
                  <p className="text-red-500 text-sm mt-2">قد تكون الفاتورة مزيفة أو تالفة أو قديمة جداً</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* تفاصيل الفاتورة */}
        {invoice && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* رأس البطاقة */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <h3 className="text-2xl font-bold">تفاصيل الفاتورة</h3>
              <p className="text-blue-100 mt-1">رقم الفاتورة: {invoice.invoiceNumber}</p>
            </div>

            {/* محتوى البطاقة */}
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* العميل */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="text-gray-600 text-sm font-semibold mb-1">العميل</p>
                  <p className="text-xl font-bold text-gray-900">{invoice.customerName}</p>
                </div>

                {/* التاريخ */}
                <div className="border-l-4 border-green-500 pl-4">
                  <p className="text-gray-600 text-sm font-semibold mb-1">تاريخ الفاتورة</p>
                  <p className="text-xl font-bold text-gray-900">
                    {new Date(invoice.createdDate).toLocaleDateString('ar-SA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                {/* المبلغ */}
                <div className="border-l-4 border-purple-500 pl-4">
                  <p className="text-gray-600 text-sm font-semibold mb-1">المبلغ الأساسي</p>
                  <p className="text-xl font-bold text-gray-900">${invoice.amount.toFixed(2)}</p>
                </div>

                {/* الضريبة */}
                <div className="border-l-4 border-orange-500 pl-4">
                  <p className="text-gray-600 text-sm font-semibold mb-1">الضريبة</p>
                  <p className="text-xl font-bold text-gray-900">${invoice.taxAmount.toFixed(2)}</p>
                </div>

                {/* الإجمالي */}
                <div className="border-l-4 border-red-500 pl-4 md:col-span-2 bg-gray-50 p-4 rounded">
                  <p className="text-gray-600 text-sm font-semibold mb-1">المبلغ الإجمالي</p>
                  <p className="text-2xl font-bold text-red-600">${invoice.finalAmount.toFixed(2)}</p>
                </div>
              </div>

              {/* حالة الدفع */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm">المدفوع</p>
                    <p className="text-lg font-bold text-green-600">
                      ${invoice.paidAmount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">المتبقي</p>
                    <p
                      className={`text-lg font-bold ${
                        invoice.finalAmount - invoice.paidAmount > 0
                          ? 'text-orange-600'
                          : 'text-green-600'
                      }`}
                    >
                      ${Math.max(0, invoice.finalAmount - invoice.paidAmount).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* حالة الفاتورة */}
              <div className="flex items-center gap-2 mb-6">
                <p className="text-gray-600 text-sm font-semibold">حالة الفاتورة:</p>
                <span
                  className={`inline-block px-4 py-2 rounded-full font-semibold text-sm ${
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

              {/* الملاحظات */}
              {invoice.notes && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-gray-600 text-sm font-semibold mb-2">ملاحظات:</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
            </div>

            {/* التذييل */}
            <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 text-center">
              <p className="text-gray-600 text-sm">
                تم التحقق من هذه الفاتورة بواسطة نظام SmartAccountant
              </p>
              <p className="text-gray-500 text-xs mt-1">
                {new Date().toLocaleString('ar-SA')}
              </p>
            </div>
          </div>
        )}

        {/* رسالة الخطأ الشاملة */}
        {!invoice && !loading && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">لا توجد بيانات</h3>
            <p className="text-gray-600 mb-4">لم تتمكن من العثور على الفاتورة المطلوبة</p>
            <p className="text-gray-500 text-sm">
              تأكد من استخدام رابط QR الصحيح أو حاول مسح الرمز مرة أخرى
            </p>
          </div>
        )}

        {/* زر العودة */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            العودة للصفحة الرئيسية
          </a>
        </div>
      </div>

      {/* أنماط الرسوميات */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
      `}</style>
    </div>
  )
}
