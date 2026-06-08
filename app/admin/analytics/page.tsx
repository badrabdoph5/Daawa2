import { BarChart3, MousePointerClick, TrendingUp, UsersRound } from "lucide-react";
import { StatsGrid } from "@/components/StatsGrid";
import { getAdminGuests, getAdminInvitations } from "@/lib/admin-data";
import { getTemplatesWithSettings } from "@/lib/template-settings";

export default async function AnalyticsPage() {
  const [guests, invitations, templates] = await Promise.all([getAdminGuests(), getAdminInvitations(), getTemplatesWithSettings()]);
  const confirmed = guests.filter((guest) => guest.status === "confirmed").length;
  const declined = guests.filter((guest) => guest.status === "declined").length;
  const totalViews = invitations.reduce((sum, item) => sum + item.views, 0);
  const conversion = guests.length ? Math.round((confirmed / guests.length) * 100) : 0;
  const averageGuests = guests.length ? (guests.reduce((sum, guest) => sum + guest.attendees, 0) / guests.length).toFixed(1) : "0";
  const templateUsage = templates
    .map((template) => ({
      template,
      invitations: invitations.filter((invitation) => invitation.templateSlug === template.slug),
    }))
    .filter((item) => item.invitations.length)
    .map((item) => ({
      name: item.template.arabicName,
      count: item.invitations.length,
      views: item.invitations.reduce((sum, invitation) => sum + invitation.views, 0),
    }))
    .sort((a, b) => b.views - a.views || b.count - a.count)
    .slice(0, 5);
  const topInvitations = [...invitations].sort((a, b) => b.views - a.views).slice(0, 5);
  const recentGuests = guests.slice(0, 6);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Analytics</span>
          <h1>تحليلات المنصة</h1>
        </div>
      </div>
      <StatsGrid
        stats={[
          { label: "إجمالي المشاهدات", value: totalViews },
          { label: "RSVP Conversion", value: `${conversion}%` },
          { label: "القوالب المتاحة", value: templates.length },
          { label: "متوسط الضيوف", value: averageGuests },
          { label: "حضور مؤكد", value: confirmed },
          { label: "اعتذارات", value: declined },
        ]}
      />
      <section className="analytics-grid">
        <article className="panel analytics-panel">
          <div className="admin-card-head">
            <BarChart3 size={24} />
            <div>
              <span className="eyebrow">Views</span>
              <h2>أكثر الدعوات مشاهدة</h2>
            </div>
          </div>
          <div className="analytics-list">
            {topInvitations.length ? (
              topInvitations.map((invitation) => (
                <div className="analytics-row" key={invitation.code}>
                  <span>
                    {invitation.groomName} &amp; {invitation.brideName}
                    <small>{invitation.code}</small>
                  </span>
                  <strong>{invitation.views}</strong>
                </div>
              ))
            ) : (
              <p>لسه مفيش مشاهدات مسجلة.</p>
            )}
          </div>
        </article>

        <article className="panel analytics-panel">
          <div className="admin-card-head">
            <TrendingUp size={24} />
            <div>
              <span className="eyebrow">Templates</span>
              <h2>أداء القوالب</h2>
            </div>
          </div>
          <div className="analytics-list">
            {templateUsage.length ? (
              templateUsage.map((item) => (
                <div className="analytics-row" key={item.name}>
                  <span>
                    {item.name}
                    <small>{item.count} دعوة</small>
                  </span>
                  <strong>{item.views}</strong>
                </div>
              ))
            ) : (
              <p>لسه مفيش دعوات مرتبطة بقوالب.</p>
            )}
          </div>
        </article>

        <article className="panel analytics-panel">
          <div className="admin-card-head">
            <UsersRound size={24} />
            <div>
              <span className="eyebrow">Guests</span>
              <h2>آخر ردود الحضور</h2>
            </div>
          </div>
          <div className="analytics-list">
            {recentGuests.length ? (
              recentGuests.map((guest) => (
                <div className="analytics-row" key={guest.id}>
                  <span>
                    {guest.name}
                    <small>{guest.invitationCode} - {guest.attendees} فرد</small>
                  </span>
                  <em className={guest.status === "confirmed" ? "status success" : "status danger"}>{guest.status === "confirmed" ? "حاضر" : "معتذر"}</em>
                </div>
              ))
            ) : (
              <p>أول RSVP هيتسجل هنا مباشرة.</p>
            )}
          </div>
        </article>

        <article className="panel analytics-panel">
          <div className="admin-card-head">
            <MousePointerClick size={24} />
            <div>
              <span className="eyebrow">Sync</span>
              <h2>مصدر البيانات</h2>
            </div>
          </div>
          <div className="analytics-sync-copy">
            <p>الأرقام هنا محسوبة من نفس بيانات دعوات العملاء وردود RSVP والمشاهدات، لذلك أي تسجيل حضور أو فتح دعوة يظهر في التحليلات بعد تحديث الصفحة.</p>
            <strong>متزامن مع الدعوات والعملاء</strong>
          </div>
          </article>
      </section>
    </>
  );
}
