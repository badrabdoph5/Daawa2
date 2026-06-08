import { CloudDownload, FileClock, History, RotateCcw, ShieldAlert, ShieldCheck, Undo2 } from "lucide-react";
import { listBackupSnapshots, type BackupSummary } from "@/lib/backups";

export const dynamic = "force-dynamic";

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatEditDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getEditTypeLabel(type: string) {
  const labels: Record<string, string> = {
    admin: "تعديل تلقائي",
    manual: "نسخة يدوية",
    restore: "قبل استرجاع",
  };
  return labels[type] || type;
}

function getUsefulBackups(backups: BackupSummary[]) {
  return backups.filter((backup) => backup.type === "admin" || backup.type === "manual" || backup.type === "restore").slice(0, 18);
}

export default async function RecentEditsPage({
  searchParams,
}: {
  searchParams: Promise<{ restored?: string; before?: string; error?: string; files?: string; uploads?: string; db?: string }>;
}) {
  const [params, backups] = await Promise.all([searchParams, listBackupSnapshots()]);
  const recentBackups = getUsefulBackups(backups);
  const latestAuto = recentBackups.find((backup) => backup.type === "admin");
  const latestBackup = recentBackups[0];

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Recent Edits</span>
          <h1>التعديلات الأخيرة</h1>
          <p>آخر نقاط حفظ تلقائية من تعديلات الأدمن. تقدر ترجع لنسخة سابقة، وقبل الرجوع النظام بيحفظ نسخة حماية للحالة الحالية.</p>
        </div>
      </div>

      {params.restored ? (
        <div className="notice success">
          <ShieldCheck size={18} />
          تم الرجوع إلى <strong>{params.restored}</strong>. تم حفظ نسخة حماية قبل الرجوع: <strong>{params.before}</strong>
        </div>
      ) : null}

      {params.error ? (
        <div className="notice danger">
          <ShieldAlert size={18} />
          {params.error === "confirm" ? "اكتب اسم ملف النسخة بالضبط قبل الاسترجاع." : "تعذر العثور على النسخة المطلوبة."}
        </div>
      ) : null}

      <div className="backup-status-grid recent-edit-status-grid">
        <article className="panel backup-status-card">
          <History size={24} />
          <span>نقاط الرجوع</span>
          <strong>{recentBackups.length}</strong>
        </article>
        <article className="panel backup-status-card">
          <FileClock size={24} />
          <span>آخر تعديل تلقائي</span>
          <strong>{latestAuto ? formatEditDate(latestAuto.createdAt) : "لا يوجد"}</strong>
        </article>
        <article className="panel backup-status-card">
          <RotateCcw size={24} />
          <span>أحدث نقطة حفظ</span>
          <strong>{latestBackup ? getEditTypeLabel(latestBackup.type) : "لا يوجد"}</strong>
        </article>
      </div>

      <div className="recent-edit-warning">
        <ShieldAlert size={18} />
        <span>الاسترجاع يعيد ملفات `data/*.json` وملفات `public/uploads` من النسخة المختارة. تعديلات قاعدة البيانات تظهر داخل النسخة كمرجع، لكن الاسترجاع المباشر الآمن هنا مخصص لملفات المشروع والرفع.</span>
      </div>

      <div className="recent-edit-list">
        {recentBackups.length ? (
          recentBackups.map((backup, index) => (
            <article className="panel recent-edit-card" key={backup.fileName}>
              <div className="recent-edit-card-main">
                <div className="recent-edit-icon">
                  <Undo2 size={20} />
                </div>
                <div>
                  <span className="eyebrow">{index === 0 ? "Latest Snapshot" : getEditTypeLabel(backup.type)}</span>
                  <h2>{formatEditDate(backup.createdAt)}</h2>
                  <p className="backup-file-name">{backup.fileName}</p>
                </div>
              </div>

              <div className="recent-edit-meta">
                <span>{backup.source === "database" ? "قاعدة البيانات + الملفات" : "ملفات المشروع"}</span>
                <span>{backup.items} عنصر</span>
                <span>{formatBytes(backup.sizeBytes)}</span>
              </div>

              <div className="recent-edit-actions">
                <a className="btn btn-soft" href={`/api/admin/backups/${backup.fileName}`}>
                  <CloudDownload size={17} />
                  تحميل
                </a>
                <details className="recent-restore-details">
                  <summary className="btn btn-gold btn-glow">
                    <RotateCcw size={17} />
                    رجوع لهذه النسخة
                  </summary>
                  <form action="/api/admin/recent-edits/restore" method="post">
                    <input type="hidden" name="fileName" value={backup.fileName} />
                    <label className="field">
                      <span>اكتب اسم الملف للتأكيد</span>
                      <input name="confirmFileName" placeholder={backup.fileName} autoComplete="off" />
                    </label>
                    <button className="btn btn-gold btn-glow" type="submit">
                      <RotateCcw size={17} />
                      تأكيد الرجوع
                    </button>
                  </form>
                </details>
              </div>
            </article>
          ))
        ) : (
          <div className="admin-empty-state">
            <strong>لا توجد تعديلات محفوظة بعد</strong>
            <p>بعد أي تعديل في الأدمن، النظام ينشئ نقطة حفظ تلقائية عند المزامنة.</p>
          </div>
        )}
      </div>
    </>
  );
}
