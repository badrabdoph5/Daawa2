import { BroadcastStudio } from "@/components/BroadcastStudio";
import { buildBroadcastFields, getBroadcastPreviewValue } from "@/lib/broadcast-fields";
import { getHomeContent } from "@/lib/home-content";
import { getHomePreviewSettings } from "@/lib/preview-settings";
import { getTemplatesWithSettings } from "@/lib/template-settings";

export const dynamic = "force-dynamic";

export default async function AdminBroadcastPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [params, content, previewSettings, templates] = await Promise.all([searchParams, getHomeContent(), getHomePreviewSettings(), getTemplatesWithSettings()]);
  const fields = buildBroadcastFields(content, getBroadcastPreviewValue(previewSettings));

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Broadcast Studio</span>
          <h1>شاشة بث الموقع</h1>
          <p>الموقع الحقيقي داخل لوحة الأدمن. اختار شكل الهاتف أو الكمبيوتر، واضغط علامة القلم بجانب أي عنصر لتعديله مباشرة.</p>
        </div>
      </div>

      {params.saved ? <div className="notice success">تم حفظ التعديل وتحديث الموقع وإرساله للمزامنة التلقائية.</div> : null}
      {params.error ? <div className="notice danger">تعذر حفظ التعديل. اختر عنصرًا صالحًا وحاول مرة أخرى.</div> : null}

      <BroadcastStudio
        fields={fields}
        initialContent={content}
        initialPreviewSettings={previewSettings}
        previewTemplateSlug={previewSettings.templateSlug}
        templates={templates.filter((template) => template.enabled).map((template) => ({ slug: template.slug, arabicName: template.arabicName }))}
      />
    </>
  );
}
