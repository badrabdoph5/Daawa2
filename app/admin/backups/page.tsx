import { Archive, CloudDownload, DatabaseBackup, FileJson, RotateCcw, ShieldCheck } from "lucide-react";
import { listBackupSnapshots } from "@/lib/backups";

export const dynamic = "force-dynamic";

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatBackupDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function BackupsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; restored?: string; before?: string; error?: string }>;
}) {
  const [params, backups] = await Promise.all([searchParams, listBackupSnapshots()]);
  const latest = backups[0];
  const totalSize = backups.reduce((sum, backup) => sum + backup.sizeBytes, 0);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Backups</span>
          <h1>النسخ الاحتياطي</h1>
          <p>نسخ فعلية من بيانات المشروع وملفات الرفع، محفوظة محليًا داخل `data/backups` وقابلة للتحميل.</p>
        </div>
        <form action="/api/admin/backups" method="post">
          <button className="btn btn-gold btn-glow" type="submit">
            <DatabaseBackup size={18} />
            إنشاء نسخة يدوية
          </button>
        </form>
      </div>

      {params.created ? (
        <div className="notice success">
          <ShieldCheck size={18} />
          تم إنشاء النسخة: <strong>{params.created}</strong>
        </div>
      ) : null}
      {params.restored ? (
        <div className="notice success">
          <RotateCcw size={18} />
          تم استعادة النسخة: <strong>{params.restored}</strong>
          {params.before ? <span> وتم إنشاء نسخة أمان قبل الاستعادة: <strong>{params.before}</strong></span> : null}
        </div>
      ) : null}
      {params.error === "confirm" ? (
        <div className="notice danger">اكتب اسم ملف النسخة كما هو قبل الاستعادة.</div>
      ) : params.error === "missing" ? (
        <div className="notice danger">تعذر العثور على ملف النسخة أو قراءته.</div>
      ) : null}

      <div className="backup-status-grid">
        <article className="panel backup-status-card">
          <Archive size={24} />
          <span>عدد النسخ</span>
          <strong>{backups.length}</strong>
        </article>
        <article className="panel backup-status-card">
          <FileJson size={24} />
          <span>إجمالي الحجم</span>
          <strong>{formatBytes(totalSize)}</strong>
        </article>
        <article className="panel backup-status-card">
          <DatabaseBackup size={24} />
          <span>آخر نسخة</span>
          <strong>{latest ? formatBackupDate(latest.createdAt) : "لا توجد"}</strong>
        </article>
      </div>

      <div className="backup-sync-note">
        <ShieldCheck size={18} />
        <span>النسخة تحتوي على ملفات إعدادات `data/*.json`، وملفات الرفع من `public/uploads`، وتصدير قاعدة البيانات عند توفر `DATABASE_URL`.</span>
      </div>

      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>الملف</th>
              <th>المصدر</th>
              <th>العناصر</th>
              <th>الحالة</th>
              <th>الحجم</th>
              <th>تاريخ الإنشاء</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {backups.length ? (
              backups.map((backup) => (
                <tr key={backup.fileName}>
                  <td>
                    <span className="backup-file-name">{backup.fileName}</span>
                  </td>
                  <td>{backup.source === "database" ? "قاعدة البيانات + الملفات" : "ملفات التشغيل"}</td>
                  <td>{backup.items}</td>
                  <td>
                    <span className="status success">{backup.status}</span>
                  </td>
                  <td>{formatBytes(backup.sizeBytes)}</td>
                  <td>{formatBackupDate(backup.createdAt)}</td>
                  <td>
                    <div className="button-row">
                      <a className="btn btn-soft btn-icon" href={`/api/admin/backups/${backup.fileName}`} title="تحميل">
                        <CloudDownload size={17} />
                      </a>
                      <form className="backup-restore-form" action="/api/admin/recent-edits/restore" method="post">
                        <input name="fileName" type="hidden" value={backup.fileName} />
                        <input name="returnTo" type="hidden" value="/admin/backups" />
                        <input aria-label="تأكيد اسم ملف النسخة" name="confirmFileName" placeholder={backup.fileName} required />
                        <button className="btn btn-soft btn-icon" type="submit" title="استعادة">
                          <RotateCcw size={17} />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>
                  <div className="admin-empty-state">
                    <strong>لا توجد نسخ احتياطية حتى الآن</strong>
                    <p>اضغط “إنشاء نسخة يدوية” وسيظهر الملف هنا مباشرة.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
