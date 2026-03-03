# إعداد Supabase للمزامنة السحابية

## الخطوة 1: إنشاء مشروع Supabase

1. اذهب إلى [https://supabase.com](https://supabase.com)
2. سجل دخولك أو أنشئ حساب جديد
3. انقر على "New Project"
4. أدخل اسم المشروع وكلمة المرور
5. اختر المنطقة الأقرب لك (مثل Frankfurt للشرق الأوسط)
6. انقر على "Create new project"

## الخطوة 2: إنشاء الجداول

1. في لوحة تحكم Supabase، اذهب إلى **SQL Editor**
2. انقر على **New query**
3. انسخ والصق محتوى ملف `schema.sql`
4. انقر على **Run**

## الخطوة 3: الحصول على مفاتيح API

1. اذهب إلى **Project Settings** (أيقونة الترس)
2. اختر **API** من القائمة
3. انسخ القيم التالية:
   - **Project URL** (مثل: `https://xxxxxxxxxxxx.supabase.co`)
   - **anon public** API Key

## الخطوة 4: إعداد التطبيق

### الخيار أ: متغيرات البيئة (للتطوير)

أنشئ ملف `.env` في مجلد المشروع:

```env
VITE_SUPABASE_URL=https://your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### الخيار ب: إعداد مباشر (للإنتاج)

عدل ملف `src/lib/supabase.ts`:

```typescript
const supabaseUrl = 'https://your-project-url.supabase.co';
const supabaseAnonKey = 'your-anon-key';
```

## الخطوة 5: تفعيل المصادقة

1. في لوحة تحكم Supabase، اذهب إلى **Authentication**
2. اختر **Providers**
3. تأكد من تفعيل **Email** provider
4. (اختياري) قم بتفعيل **Confirm email** إذا أردت التحقق من البريد

## الخطوة 6: اختبار المزامنة

1. شغّل التطبيق
2. انقر على أيقونة السحابة في الأعلى
3. أنشئ حساب جديد أو سجل الدخول
4. أضف بعض العناصر إلى المفضلات
5. انقر على "مزامنة الآن"
6. جرب فتح التطبيق من جهاز آخر وستجد البيانات متزامنة!

## ⚠️ ملاحظات مهمة

### الأمان
- لا تشارك `service_role` key مع أحد
- استخدم فقط `anon` key في التطبيق
- RLS (Row Level Security) مفعلة افتراضياً

### الحدود المجانية (Free Tier)
- 500MB قاعدة بيانات
- 2GB تخزين
- 100,000 مستخدم
- مزامنة real-time مجانية

### الدعم
- [وثائق Supabase](https://supabase.com/docs)
- [دليل JavaScript](https://supabase.com/docs/reference/javascript)
