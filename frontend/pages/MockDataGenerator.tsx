import React, { useState } from 'react';
import { Sparkles, Package, Users, Play, AlertTriangle } from 'lucide-react';
import { generateMockData } from '../services/storageService';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const MockDataGenerator: React.FC = () => {
  const { notify } = useNotification();
  const navigate = useNavigate();
  
  const [productCount, setProductCount] = useState<number>(10);
  const [customerCount, setCustomerCount] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    if (productCount < 1 || customerCount < 1) {
        notify('يجب أن يكون العدد 1 على الأقل', 'warning');
        return;
    }

    if (!window.confirm(`هل أنت متأكد من إضافة ${productCount} منتج و ${customerCount} عميل إلى قاعدة البيانات؟`)) {
        return;
    }

    setIsGenerating(true);
    
    // Simulate slight delay for UI feedback
    setTimeout(() => {
        const success = generateMockData(productCount, customerCount);
        setIsGenerating(false);

        if (success) {
            notify(`تم توليد البيانات بنجاح: ${productCount} منتج و ${customerCount} عميل مع فواتير عشوائية.`, 'success');
            navigate('/');
        } else {
            notify('حدث خطأ أثناء توليد البيانات', 'error');
        }
    }, 800);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="bg-indigo-900 text-white p-8 rounded-2xl shadow-xl overflow-hidden relative">
          <div className="relative z-10">
              <h2 className="text-3xl font-bold flex items-center gap-3 mb-2">
                 <Sparkles className="text-yellow-400" size={32} />
                 مولد البيانات التجريبية
              </h2>
              <p className="text-indigo-200">
                  أداة للمطورين والاختبار. قم بإضافة منتجات وعملاء وهميين لتجربة أداء النظام والتقارير.
              </p>
          </div>
          {/* Decorative Circle */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-indigo-800 rounded-full opacity-50 z-0"></div>
       </div>

       <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100">
           <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 flex items-start gap-3">
               <AlertTriangle className="text-amber-600 shrink-0 mt-1" size={20}/>
               <p className="text-sm text-amber-800">
                   <strong>ملاحظة:</strong> سيتم إضافة هذه البيانات إلى قاعدة البيانات الحالية. لن يتم حذف البيانات القديمة، بل ستتم الإضافة عليها.
               </p>
           </div>

           <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Product Count Input */}
                   <div>
                       <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                           <Package size={18} className="text-blue-500"/> عدد المنتجات
                       </label>
                       <input 
                         type="number" 
                         min="1"
                         max="1000"
                         className="w-full border-2 border-slate-200 rounded-xl p-4 text-xl font-bold text-center text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                         value={productCount}
                         onChange={e => setProductCount(Number(e.target.value))}
                       />
                       <p className="text-xs text-slate-400 mt-2 text-center">أقصى حد 1000 منتج في المرة الواحدة</p>
                   </div>

                   {/* Customer Count Input */}
                   <div>
                       <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                           <Users size={18} className="text-emerald-500"/> عدد العملاء
                       </label>
                       <input 
                         type="number" 
                         min="1"
                         max="500"
                         className="w-full border-2 border-slate-200 rounded-xl p-4 text-xl font-bold text-center text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                         value={customerCount}
                         onChange={e => setCustomerCount(Number(e.target.value))}
                       />
                       <p className="text-xs text-slate-400 mt-2 text-center">سيتم إنشاء فواتير عشوائية لهم</p>
                   </div>
               </div>

               <div className="pt-6 border-t border-slate-100">
                   <button 
                     onClick={handleGenerate}
                     disabled={isGenerating}
                     className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all flex items-center justify-center gap-3 ${isGenerating ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.01] hover:shadow-indigo-200'}`}
                   >
                       {isGenerating ? (
                           <>جاري التوليد...</>
                       ) : (
                           <>
                               <Play size={24} fill="currentColor" />
                               بدء التوليد
                           </>
                       )}
                   </button>
               </div>
           </div>
       </div>
    </div>
  );
};

export default MockDataGenerator;