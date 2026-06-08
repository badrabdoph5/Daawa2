import { Image, Link2, MonitorPlay, Save, UploadCloud, Video } from "lucide-react";
import { acceptedImageFormats } from "@/lib/image-formats";
import { getHomePreviewSettings } from "@/lib/preview-settings";
import { getTemplatesWithSettings } from "@/lib/template-settings";

export const dynamic = "force-dynamic";

export default async function AdminPreviewPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const [params, settings, templates] = await Promise.all([searchParams, getHomePreviewSettings(), getTemplatesWithSettings()]);
  const selectedTemplate = templates.find((template) => template.slug === settings.templateSlug) || templates[0];

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Homepage Preview</span>
          <h1>إدارة معاينة الصفحة الرئيسية</h1>
          <p>اختار اللي يظهر داخل مربع المعاينة في الرئيسية: صورة، فيديو، أو قالب من القوالب.</p>
        </div>
      </div>

      {params.saved ? <div className="notice success">تم حفظ إعدادات المعاينة وتحديث الصفحة الرئيسية.</div> : null}

      <section className="preview-admin-grid">
        <article className="panel preview-admin-form-card">
          <div className="admin-card-head">
            <MonitorPlay size={24} />
            <div>
              <span className="eyebrow">Preview Source</span>
              <h2>محتوى المعاينة</h2>
            </div>
          </div>

          <form className="preview-admin-form" action="/api/admin/preview" method="post" encType="multipart/form-data">
            <label className="preview-option-card">
              <input name="mode" type="radio" value="template" defaultChecked={settings.mode === "template"} />
              <span>
                <MonitorPlay size={18} />
                قالب جاهز
              </span>
            </label>
            <label className="preview-option-card">
              <input name="mode" type="radio" value="image" defaultChecked={settings.mode === "image"} />
              <span>
                <Image size={18} />
                صورة
              </span>
            </label>
            <label className="preview-option-card">
              <input name="mode" type="radio" value="video" defaultChecked={settings.mode === "video"} />
              <span>
                <Video size={18} />
                فيديو
              </span>
            </label>

            <label className="field full">
              <span>اختيار قالب للمعاينة</span>
              <select name="templateSlug" defaultValue={selectedTemplate?.slug || "royal-envelope"}>
                {templates.map((template) => (
                  <option key={template.slug} value={template.slug}>
                    {template.arabicName}
                  </option>
                ))}
              </select>
            </label>

            <div className="preview-media-card full">
              <div className="preview-media-card-head">
                <span>
                  <UploadCloud size={20} />
                </span>
                <div>
                  <h3>ارفع صورة أو فيديو</h3>
                  <p>اختار ملف واحد للمعاينة. لو رفعت صورة أو فيديو هيظهر تلقائيًا في الرئيسية بدون ما تحتاج تغير النوع يدويًا.</p>
                </div>
              </div>
              <label className="preview-media-dropzone">
                <input name="previewMedia" type="file" accept={`${acceptedImageFormats},video/mp4,video/webm,video/quicktime`} />
                <UploadCloud size={24} />
                <strong>اختار ملف صورة أو فيديو</strong>
                <small>الصورة حتى 80MB، والفيديو حتى 35MB. الأفضل مقاس عمودي.</small>
              </label>
            </div>

            <label className="field full preview-unified-url">
              <span>
                <Link2 size={16} />
                رابط صورة أو فيديو
              </span>
              <input name="mediaUrl" defaultValue={settings.mode === "video" ? settings.videoUrl : settings.imageUrl} placeholder="/uploads/previews/file.jpg أو https://example.com/preview.mp4" />
              <small>لو الرابط ينتهي بـ mp4 أو webm أو mov هيتعامل كفيديو، وأي رابط صورة هيتعامل كصورة.</small>
            </label>

            <div className="preview-current-media full">
              <span>المستخدم حاليًا</span>
              <strong>{settings.mode === "template" ? selectedTemplate?.arabicName || "قالب جاهز" : settings.mode === "video" ? settings.videoUrl || "فيديو بدون رابط" : settings.imageUrl || "صورة بدون رابط"}</strong>
            </div>

            <button className="btn btn-gold btn-glow admin-submit" type="submit">
              <Save size={18} />
              حفظ المعاينة
            </button>
          </form>
        </article>

        <article className="panel preview-admin-live-card">
          <div className="admin-card-head">
            <MonitorPlay size={24} />
            <div>
              <span className="eyebrow">Live Result</span>
              <h2>شكلها في الرئيسية</h2>
            </div>
          </div>
          <div className="preview-admin-phone">
            {settings.mode === "image" && settings.imageUrl ? (
              <img src={settings.imageUrl} alt="معاينة الصورة الحالية" />
            ) : settings.mode === "video" && settings.videoUrl ? (
              <video src={settings.videoUrl} muted loop playsInline autoPlay controls />
            ) : (
              <iframe src={`/templates/${selectedTemplate?.slug || "royal-envelope"}/preview?silentPreview=1`} title="معاينة القالب الحالية" loading="lazy" allow="geolocation; notifications" />
            )}
          </div>
        </article>
      </section>
    </>
  );
}
