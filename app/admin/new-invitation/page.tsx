import { headers } from "next/headers";
import { AdminInvitationBuilder } from "@/components/AdminInvitationBuilder";
import { getTemplatesWithSettings } from "@/lib/template-settings";
import { listUploadedMusicFiles } from "@/lib/audio-files";
import { getPublicSiteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewInvitationPage() {
  const [templates, musicFiles, requestHeaders] = await Promise.all([getTemplatesWithSettings(), listUploadedMusicFiles(), headers()]);
  const siteUrl = getPublicSiteUrl(requestHeaders);
  const templateOptions = templates.map(({ slug, name, arabicName, opening, concept, layout, typography }) => ({
    slug,
    name,
    arabicName,
    opening,
    concept,
    layout,
    typography,
  }));

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Visual Builder</span>
          <h1>دعوة جديدة</h1>
          <p>أداة إنشاء دعوات العملاء بمعاينة هاتف حية ونظام موحد للصور والمصور والموسيقى لكل القوالب الحالية والقادمة.</p>
        </div>
      </div>
      <AdminInvitationBuilder templates={templateOptions} musicFiles={musicFiles} siteUrl={siteUrl} />
    </>
  );
}
