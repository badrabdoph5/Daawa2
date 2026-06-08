import Link from "next/link";
import { Camera, Code2, Eye, ImagePlus, Music2, Palette, Settings2, ToggleLeft, ToggleRight } from "lucide-react";
import { AdminTemplateLookup } from "@/components/AdminTemplateLookup";
import { AdminTextEditor } from "@/components/AdminTextEditor";
import { ImageCropUploader } from "@/components/ImageCropUploader";
import { getInvitationByCode } from "@/lib/invitation-data";
import { extractInvitationCodeFromInput } from "@/lib/site-settings";
import { getTemplatesWithSettings } from "@/lib/template-settings";

export default async function AdminTemplatesPage({ searchParams }: { searchParams: Promise<{ invitation?: string; saved?: string; imported?: string }> }) {
  const params = await searchParams;
  const searchedCode = extractInvitationCodeFromInput(params.invitation || "");
  const searchedInvitation = searchedCode ? await getInvitationByCode(searchedCode) : undefined;
  const templates = await getTemplatesWithSettings();

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Templates</span>
          <h1>إدارة القوالب</h1>
          <p>كل قالب يظهر بمعاينة مباشرة، ومن قسم التعديل تتحكم في الألوان والصور والموسيقى وطريقة العرض.</p>
        </div>
      </div>

      <section className="template-admin-tools">
        <details className="panel template-code-import-panel">
          <summary className="template-import-summary">
            <span>
              <Code2 size={22} />
              إنشاء قالب من كود
            </span>
            <strong>فتح الأداة</strong>
          </summary>
          <div className="template-import-body">
            <p>الصق كود HTML كامل أو جزء من صفحة، وسيتم تحويله لقالب يظهر في الموقع والمعاينات والطلبات.</p>
            <form className="template-code-import-form" action="/api/admin/templates/import" method="post">
              <div className="admin-form-grid compact-controls">
                <label className="field">
                  <span>اسم القالب</span>
                  <input name="name" placeholder="مثال: Ivory Motion" />
                </label>
                <label className="field">
                  <span>الرابط المختصر</span>
                  <input name="slug" placeholder="ivory-motion" pattern="[A-Za-z0-9 -]+" />
                </label>
                <label className="field">
                  <span>التصنيف</span>
                  <input name="category" placeholder="قالب مخصص" />
                </label>
                <label className="field">
                  <span>رابط الموسيقى</span>
                  <input name="musicUrl" placeholder="/assets/audio/badr-sara-wedding-3.mp3 أو رابط أغنية مباشر" />
                </label>
                <label className="field full">
                  <span>وصف قصير</span>
                  <input name="concept" placeholder="وصف يظهر في قائمة القوالب" />
                </label>
                <label className="field full">
                  <span>كود القالب</span>
                  <textarea
                    name="html"
                    rows={9}
                    placeholder={`الصق HTML هنا. يمكنك استخدام:
{{groomName}} {{brideName}} {{coupleNames}}
{{weddingDate}} {{weddingTime}} {{venue}} {{city}}
{{mapUrl}} {{invitationUrl}} {{musicUrl}}
{{gallery1}} {{gallery2}} {{gallery3}}`}
                    required
                  />
                </label>
              </div>
              <button className="btn btn-gold btn-glow" type="submit">
                <Code2 size={18} />
                تحويل الكود لقالب
              </button>
            </form>
          </div>
        </details>

        <AdminTemplateLookup templates={templates} initialQuery={params.invitation || ""} searchedInvitation={searchedInvitation} />
      </section>

      <section className="panel text-admin-panel">
        <div className="template-section-head">
          <div>
            <span className="eyebrow">Text Search</span>
            <h2>تعديل النصوص بالبحث</h2>
            <p>قسم مستقل للعثور على النصوص بسرعة وتعديلها بدون ما الاختيار يختفي أثناء الكتابة.</p>
          </div>
          <Settings2 size={24} />
        </div>
        <AdminTextEditor />
      </section>

      {params.saved ? (
        <div className={params.saved === "0" ? "notice danger" : "notice success"}>
          {params.saved === "0" ? "تعذر حفظ موسيقى القالب. راجع القالب المختار." : "تم حفظ موسيقى القالب وتحديث المعاينة."}
        </div>
      ) : null}

      {params.imported ? (
        <div className={params.imported === "0" ? "notice danger" : "notice success"}>
          {params.imported === "0" ? "تعذر إنشاء القالب. الصق كود HTML صالح وحاول مرة أخرى." : `تم إنشاء القالب الجديد: ${params.imported}`}
        </div>
      ) : null}

      <div className="admin-template-workspace">
        {templates.map((template) => (
          <article className="template-editor-card" id={`template-${template.slug}`} key={template.slug}>
            <div className="template-live-preview">
              <iframe src={`/templates/${template.slug}/preview?silentPreview=1`} title={`معاينة ${template.arabicName}`} loading="lazy" allow="geolocation; notifications" />
            </div>
            <div className="template-editor-body">
              <div className="template-editor-head">
                <div>
                  <span className="eyebrow">Live Template</span>
                  <h2>{template.arabicName}</h2>
                  <p>{template.concept}</p>
                </div>
                <span className="template-badge">{template.score}%</span>
              </div>
              <div className="button-row">
                <a className="btn btn-soft btn-icon" href={`/templates/${template.slug}/preview`} title="فتح المعاينة">
                  <Eye size={17} />
                </a>
                <button className="btn btn-soft" type="button">
                  {template.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {template.enabled ? "مفعل" : "متوقف"}
                </button>
              </div>
              <details className="template-edit-details">
                <summary>
                  <Settings2 size={18} />
                  تعديل القالب
                </summary>
                <form className="template-edit-panel" action="/api/admin/templates/music" method="post">
                  <input type="hidden" name="slug" value={template.slug} />
                  <div className="admin-form-grid compact-controls">
                    <label className="field">
                      <span>اسم القالب</span>
                      <input name="arabicName" defaultValue={template.arabicName} />
                    </label>
                    <label className="field">
                      <span>التصنيف</span>
                      <input name="category" defaultValue={template.category} />
                    </label>
                    <label className="field">
                      <span>حالة الظهور</span>
                      <select name="enabled" defaultValue={template.enabled ? "on" : "off"}>
                        <option value="on">ظاهر في الموقع</option>
                        <option value="off">مخفي مؤقتًا</option>
                      </select>
                    </label>
                    <label className="field full">
                      <span>فكرة القالب</span>
                      <textarea name="concept" defaultValue={template.concept} rows={3} />
                    </label>
                    <label className="field">
                      <span>طريقة الفتح</span>
                      <input name="opening" defaultValue={template.opening} />
                    </label>
                    <label className="field">
                      <span>نظام العرض</span>
                      <input name="layout" defaultValue={template.layout} />
                    </label>
                    <label className="field full">
                      <span>الخطوط</span>
                      <input name="typography" defaultValue={template.typography} />
                    </label>
                  </div>
                  <div className="template-edit-section">
                    <h3>
                      <Palette size={18} />
                      ألوان القالب
                    </h3>
                    <div className="color-control-grid">
                      {Object.entries(template.palette).map(([key, value]) => (
                        <label className="field color-field" key={key}>
                          <span>{key}</span>
                          <input type="color" name={`palette${key.charAt(0).toUpperCase()}${key.slice(1)}`} defaultValue={value} />
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="template-edit-section">
                    <h3>
                      <ImagePlus size={18} />
                      صور معاينة القالب
                    </h3>
                    <div className="admin-form-grid compact-controls">
                      <label className="field">
                        <span>رابط صورة المعاينة</span>
                        <input name="previewImage" defaultValue={template.previewImage} placeholder="/assets/templates/example.svg" />
                      </label>
                      <label className="field">
                        <span>رابط صورة داخلية/بديلة</span>
                        <input name="accentImage" defaultValue={template.accentImage} placeholder="/assets/templates/example.svg" />
                      </label>
                    </div>
                    <ImageCropUploader label="رفع صور بديلة" name="templateImage" maxFiles={2} defaultImages={[template.previewImage, template.accentImage].filter(Boolean)} />
                  </div>
                  <div className="template-edit-section">
                    <h3>
                      <Music2 size={18} />
                      موسيقى القالب
                    </h3>
                    <div className="admin-form-grid compact-controls">
                      <label className="field">
                        <span>رابط الأغنية أو ملف صوت</span>
                        <input name="musicUrl" defaultValue={template.musicUrl || ""} placeholder="/assets/audio/badr-sara-wedding-3.mp3 أو https://..." />
                      </label>
                      <label className="admin-toggle-row template-inline-toggle">
                        <input name="musicMuted" type="checkbox" />
                        <span>إسكات الموسيقى لهذا القالب</span>
                      </label>
                    </div>
                  </div>
                  <div className="template-edit-section">
                    <h3>
                      <Camera size={18} />
                      كارت المصور داخل القالب
                    </h3>
                    <div className="admin-form-grid compact-controls">
                      <label className="admin-toggle-row template-inline-toggle">
                        <input name="photographerEnabled" type="checkbox" defaultChecked={template.photographer?.enabled ?? true} />
                        <span>إظهار كارت المصور</span>
                      </label>
                      <label className="field">
                        <span>اسم المصور</span>
                        <input name="photographerName" defaultValue={template.photographer?.name || "badrabdoph"} placeholder="اسم المصور" />
                      </label>
                      <label className="field">
                        <span>لينك الانستجرام</span>
                        <input name="photographerInstagramUrl" defaultValue={template.photographer?.instagramUrl || ""} placeholder="https://www.instagram.com/..." />
                      </label>
                      <label className="field">
                        <span>لينك الفيسبوك</span>
                        <input name="photographerFacebookUrl" defaultValue={template.photographer?.facebookUrl || ""} placeholder="https://www.facebook.com/..." />
                      </label>
                    </div>
                  </div>
                  <button className="btn btn-gold btn-glow" type="submit">
                    حفظ تعديل القالب
                  </button>
                </form>
              </details>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
