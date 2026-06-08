import Link from "next/link";
import { headers } from "next/headers";
import { Eye, Pause, Play, Settings2, Trash2 } from "lucide-react";
import { AdminCreateInvitationForm } from "@/components/AdminCreateInvitationForm";
import { CopyButton } from "@/components/CopyButton";
import { getAdminInvitations } from "@/lib/admin-data";
import { getTemplatesWithSettings } from "@/lib/template-settings";
import { getPublicSiteUrl } from "@/lib/utils";
import { getCustomerAdminPath } from "@/lib/slug";

export const dynamic = "force-dynamic";

export default async function ClientInvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string; demo?: string; status?: string }>;
}) {
  const [params, invitations, templates, requestHeaders] = await Promise.all([searchParams, getAdminInvitations(), getTemplatesWithSettings(), headers()]);
  const siteUrl = getPublicSiteUrl(requestHeaders).replace(/\/$/, "");
  const statusMessages: Record<string, string> = {
    pause: "تم إيقاف الدعوة.",
    resume: "تم تشغيل الدعوة.",
    delete: "تم حذف الدعوة.",
    missing: "لم يتم العثور على الدعوة المطلوبة.",
    invalid: "الإجراء غير صالح.",
  };

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Client Invitations</span>
          <h1>دعوات العملاء</h1>
          <p>كل دعوة يتم إنشاؤها من الأدمن تظهر هنا منفصلة عن القوالب الثابتة.</p>
        </div>
        <a className="btn btn-gold" href="#create-invitation">
          إنشاء دعوة عميل
        </a>
      </div>
      <div id="create-invitation">
        <AdminCreateInvitationForm created={params.created} error={params.error} demo={params.demo} templates={templates} siteUrl={siteUrl} />
      </div>
      {params.status ? <div className={params.status === "missing" || params.status === "invalid" ? "notice danger" : "notice success"}>{statusMessages[params.status] || "تم تنفيذ الإجراء."}</div> : null}
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>الكود</th>
              <th>الأسماء</th>
              <th>القالب المستخدم</th>
              <th>المشاهدات</th>
              <th>الحالة</th>
              <th>روابط العميل</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((invitation) => {
              const template = templates.find((item) => item.slug === invitation.templateSlug);
              const invitationUrl = `${siteUrl}/${invitation.code}`;
              const clientAdminUrl = `${siteUrl}${getCustomerAdminPath(invitation.code)}`;
              return (
                <tr key={invitation.id}>
                  <td>{invitation.code}</td>
                  <td>
                    {invitation.groomName} &amp; {invitation.brideName}
                  </td>
                  <td>{template?.arabicName || invitation.templateSlug}</td>
                  <td>{invitation.views}</td>
                  <td>
                    <span className={invitation.isActive ? "status success" : "status danger"}>{invitation.isActive ? "نشطة" : "متوقفة"}</span>
                  </td>
                  <td>
                    <div className="mini-links">
                      <span>{invitationUrl}</span>
                      <span>{clientAdminUrl}</span>
                    </div>
                  </td>
                  <td>
                    <div className="button-row">
                      <Link className="btn btn-soft btn-icon" href={`/${invitation.code}`} title="فتح الدعوة">
                        <Eye size={17} />
                      </Link>
                      <Link className="btn btn-soft btn-icon" href={getCustomerAdminPath(invitation.code)} title="تعديل الدعوة">
                        <Settings2 size={17} />
                      </Link>
                      <CopyButton className="btn btn-soft btn-icon" value={invitationUrl} title="نسخ رابط الدعوة" iconOnly />
                      <form action={`/api/admin/invitations/${invitation.code}`} method="post">
                        <button className="btn btn-soft btn-icon" name="action" value={invitation.isActive ? "pause" : "resume"} title={invitation.isActive ? "إيقاف الدعوة" : "تشغيل الدعوة"} type="submit">
                          {invitation.isActive ? <Pause size={17} /> : <Play size={17} />}
                        </button>
                      </form>
                      <form action={`/api/admin/invitations/${invitation.code}`} method="post">
                        <button className="btn btn-soft btn-icon danger-button" name="action" value="delete" title="حذف الدعوة" type="submit">
                          <Trash2 size={17} />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
