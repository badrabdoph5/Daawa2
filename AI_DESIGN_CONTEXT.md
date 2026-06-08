# BadrDaawa Design Context

هذا الملف مخصص لأي ذكاء اصطناعي أو مطور يريد فهم شكل الموقع وتعديله بدون قراءة المشروع بالكامل من الصفر.

## أهم ملف لتعديل الشكل العام

- `app/globals.css`

هذا هو ملف التصميم الرئيسي للموقع بالكامل. يحتوي على:
- ألوان الموقع العامة.
- تصميم الهيدر والفوتر.
- الصفحة الرئيسية.
- صفحة القوالب.
- صفحة الطلب.
- الدعوات والقوالب.
- لوحة الإدارة.
- تجاوب الهاتف.

ابدأ منه دائمًا عند تعديل الشكل العام.

## ملفات الصفحات الأساسية

- `app/page.tsx`
  الصفحة الرئيسية.

- `app/templates/page.tsx`
  صفحة عرض القوالب الجاهزة.

- `app/order/page.tsx`
  صفحة طلب الدعوة.

- `app/templates/[slug]/preview/page.tsx`
  صفحة معاينة قالب جاهز.

- `app/[code]/page.tsx`
  صفحة الدعوة النهائية للعميل.

- `app/admin/page.tsx`
  الصفحة الرئيسية للوحة الإدارة.

## أهم المكونات البصرية

- `components/SiteHeader.tsx`
  الهيدر العلوي وزر واتساب وزر الطلب.

- `components/SiteFooter.tsx`
  الفوتر.

- `components/TemplateBrowser.tsx`
  البحث والفلاتر داخل صفحة القوالب.

- `components/TemplateCard.tsx`
  شكل كارت القالب في صفحة القوالب.

- `components/OrderForm.tsx`
  نموذج طلب الدعوة، اختيار القالب، رفع الصور، والمعاينة.

- `components/InvitationExperience.tsx`
  أهم ملف لتصميم الدعوات والقوالب نفسها. يحتوي على معظم قوالب الدعوة.

- `components/InviteMusic.tsx`
  زر وتشغيل موسيقى الدعوة والقوالب الجاهزة.

- `components/InviteMap.tsx`
  الخريطة داخل الدعوة.

- `components/InvitePoll.tsx`
  استفتاء الحضور داخل الدعوة.

- `components/ImageCropUploader.tsx`
  رفع وقص وضغط الصور.

## بيانات القوالب

- `lib/templates.ts`

هذا الملف يحتوي على تعريف القوالب:
- slug
- الاسم العربي
- الاسم الإنجليزي
- التصنيف
- الألوان
- صورة المعاينة
- الموسيقى الافتراضية

عند إضافة قالب ثابت جديد أو تعديل بيانات قالب، ابدأ من هذا الملف.

## أنواع البيانات

- `lib/types.ts`

يحتوي على أنواع TypeScript الأساسية مثل:
- `TemplateDefinition`
- `Invitation`
- `OrderRequest`

## ملفات الإدارة المهمة

- `app/admin/templates/page.tsx`
  إدارة القوالب، الموسيقى، البحث عن دعوة بالرابط، واستيراد قالب HTML.

- `app/admin/client-invitations/page.tsx`
  إنشاء وإدارة دعوات العملاء.

- `components/AdminCreateInvitationForm.tsx`
  فورم إنشاء دعوة من الأدمن.

- `app/[code]/ad_3399/page.tsx`
  لوحة تحكم العميل في دعوته.

## مناطق CSS المهمة داخل `app/globals.css`

ابحث داخل الملف بهذه الكلمات:

- `:root`
  ألوان وقيم عامة للموقع.

- `.site-header`, `.nav`, `.brand`, `.nav-whatsapp`
  الهيدر وزر واتساب.

- `.hero`, `.clean-hero`, `.home-feature`
  الصفحة الرئيسية ومميزات الموقع.

- `.template-browser`, `.template-grid`, `.template-card`, `.template-preview`
  صفحة القوالب وكروت القوالب.

- `.order-flow`, `.order-template-card`, `.details-form`, `.order-image-slot`
  صفحة الطلب واختيار القالب وخانات الصور.

- `.template-preview-floating-actions`
  الأزرار العائمة داخل معاينة القوالب الجاهزة فقط.

- `.music-control`, `.music-button`
  زر الصوت.

- `.creative-invite`, `.invite-card`, `.luxury-gallery`
  قالب Royal Envelope الأساسي.

- `.noir-`
  قالب Luxe Noir.

- `.ivory-`
  قالب Ivory Arches.

- `.mobile-gold-`
  قوالب Mobile Gold و Soft Gold.

- `.boho-`
  قالب Boho Chic.

- `.garden-`
  قالب Garden Elegance.

- `.cinematic-`
  قالب Cinematic Story.

- `.admin-dark-shell`
  تصميم لوحة الإدارة الداكنة.

- `@media (max-width: 720px)`
  أهم منطقة لتعديل تجربة الهاتف.

## قواعد مهمة قبل أي تعديل

- الموقع عربي و RTL، فحافظ على `dir="rtl"` وتجربة الهاتف أولًا.
- لا تجعل الصفحة الرئيسية مليئة بالكلام؛ المستخدم طلب تقليل الحشو.
- القوالب الجاهزة يمكن أن يظهر بها أزرار الموقع العائمة.
- الدعوات النهائية للعملاء لا يظهر بها أي أزرار تخص الموقع.
- الموسيقى تعمل داخل الدعوة ومعاينة القالب فقط، ولا تعمل في صفحة الطلب أو الرئيسية.
- صفحة القوالب على الهاتف يجب أن تظهر صفين جنب بعض.
- صفحة الطلب يجب أن تسمح بتأكيد الطلب عند وجود: اسم العريس، اسم العروسة، تاريخ الفرح فقط.
- رفع الصور في الطلب عبارة عن 3 خانات منفصلة.

## أوامر التحقق

استخدم هذه الأوامر بعد أي تعديل:

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/prisma generate
NEXT_TEST_WASM_DIR=node_modules/@next/swc-wasm-nodejs ./node_modules/.bin/next build
```

لتشغيل نسخة إنتاج محلية:

```bash
NEXT_TEST_WASM_DIR=node_modules/@next/swc-wasm-nodejs ./node_modules/.bin/next start -H 127.0.0.1 -p 3001
```

## ملخص سريع لأي AI

هذا مشروع Next.js لتصميم وطلب دعوات زفاف رقمية. التركيز الأكبر على الهاتف. أهم أجزاء التعديل البصري هي:

1. `app/globals.css`
2. `app/page.tsx`
3. `components/TemplateBrowser.tsx`
4. `components/TemplateCard.tsx`
5. `components/OrderForm.tsx`
6. `components/InvitationExperience.tsx`
7. `lib/templates.ts`

إذا أردت تعديل الشكل العام، ابدأ بـ `app/globals.css`.
إذا أردت تعديل قوالب الدعوات، ابدأ بـ `components/InvitationExperience.tsx`.
إذا أردت تعديل بيانات القوالب وألوانها وصور المعاينة، ابدأ بـ `lib/templates.ts`.
