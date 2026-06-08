import Link from "next/link";
import { cookies, headers } from "next/headers";
import { Download, ExternalLink, LogOut, QrCode } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ClientInvitationEditor } from "@/components/ClientInvitationEditor";
import { CopyButton } from "@/components/CopyButton";
import { GuestTable } from "@/components/GuestTable";
import { QrCodeBlock } from "@/components/QrCodeBlock";
import { StatsGrid } from "@/components/StatsGrid";
import { listUploadedMusicFiles } from "@/lib/audio-files";
import { CLIENT_SESSION_COOKIE, verifyClientSessionCookie } from "@/lib/client-session";
import { getGuestsByInvitation, getInvitationByCode } from "@/lib/invitation-data";
import { getTemplateWithSettings } from "@/lib/template-settings";
import { calculateAttendance, getPublicSiteUrl } from "@/lib/utils";

export default async function CustomerAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { code } = await params;
  const [query, requestHeaders, cookieStore] = await Promise.all([searchParams, headers(), cookies()]);
  const invitation = await getInvitationByCode(code);
  if (!invitation) {
    notFound();
  }

  const session = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;
  if (!(await verifyClientSessionCookie(session, invitation.code))) {
    redirect(`/${invitation.code}/ad_3399/login`);
  }

  const [guests, template, musicFiles] = await Promise.all([
    getGuestsByInvitation(invitation.code),
    getTemplateWithSettings(invitation.templateSlug),
    listUploadedMusicFiles(),
  ]);
  if (!template) {
    notFound();
  }
  const summary = calculateAttendance(guests);
  const url = `${getPublicSiteUrl(requestHeaders).replace(/\/$/, "")}/${invitation.code}`;

  return (
    <main className="customer-admin">
      <section className="customer-topbar">
        <div>
          <span className="eyebrow">Customer Admin</span>
          <h1>
            {invitation.groomName} &amp; {invitation.brideName}
          </h1>
          <p>{url}</p>
        </div>
        <div className="button-row">
          <Link className="btn btn-soft" href={`/${invitation.code}`}>
            <ExternalLink size={18} />
            فتح الدعوة
          </Link>
          <CopyButton className="btn btn-gold" value={url} label="نسخ الرابط" title="نسخ رابط الدعوة" />
          <form action="/api/auth/client/logout" method="post">
            <input name="code" type="hidden" value={invitation.code} />
            <button className="btn btn-soft btn-icon" type="submit" title="تسجيل خروج">
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </section>

      <StatsGrid
        stats={[
          { label: "إجمالي الردود", value: summary.totalResponses },
          { label: "حضور مؤكد", value: summary.confirmedGuests },
          { label: "معتذرون", value: summary.declinedGuests },
          { label: "مشاهدات الدعوة", value: invitation.views },
        ]}
      />

      {query.saved === "music-error" ? (
        <div className="notice danger customer-notice">الصوت لم يتم حفظه. استخدم ملف صوت صالح أو رابط مباشر مثل MP3/WAV.</div>
      ) : query.saved === "images-error" ? (
        <div className="notice danger customer-notice">الصور لم يتم حفظها. ارفع صور JPG/PNG/WebP أو انتظر انتهاء الضغط قبل الحفظ.</div>
      ) : query.saved ? (
        <div className="notice success customer-notice">تم حفظ التعديلات المتاحة لهذه الدعوة.</div>
      ) : null}

      <section className="customer-control-grid customer-admin-tools">
        <article className="panel">
          <QrCode size={24} />
          <h2>الرابط والـ QR</h2>
          <p>أي تعديل على رابط الدعوة يتزامن تلقائيًا مع QR لأنه مبني من نفس الكود.</p>
          <QrCodeBlock value={url} />
        </article>

        <article className="panel">
          <Download size={24} />
          <h2>تصدير الحضور</h2>
          <p>حمل قائمة الحضور Excel أو PDF.</p>
          <div className="button-row">
            <a className="btn btn-soft" href={`/api/invitations/${invitation.code}/export/excel`}>
              Excel
            </a>
            <a className="btn btn-soft" href={`/api/invitations/${invitation.code}/export/pdf`}>
              PDF
            </a>
          </div>
        </article>
      </section>

      <ClientInvitationEditor invitation={invitation} template={template} musicFiles={musicFiles} publicUrl={url} />

      <section className="section compact">
        <div className="dashboard-head">
          <div>
            <span className="eyebrow">Guest List</span>
            <h2>قائمة الحضور</h2>
          </div>
        </div>
        <GuestTable guests={guests} />
      </section>
    </main>
  );
}
