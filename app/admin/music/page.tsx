import { AlertTriangle, CheckCircle2, FileAudio, Music2, Pause, Play, Plus, Save, Trash2, UploadCloud } from "lucide-react";
import { getActiveMusicSlot, getMusicLibrary } from "@/lib/music-library";
import { getTemplatesWithSettings } from "@/lib/template-settings";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  if (!value) return "لم يتم الحفظ بعد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function saveMessage(saved?: string, count?: string) {
  const templateCount = Number(count || 0);
  if (saved === "enabled") return `تم تشغيل المقطع على ${templateCount} قالب.`;
  if (saved === "disabled") return "تم إيقاف المقطع. باقي الملفات محفوظة.";
  if (saved === "cleared") return "تم حذف المقطع من المكتبة.";
  if (saved) return `تم حفظ المقطع وتطبيقه على ${templateCount} قالب.`;
  return "";
}

export default async function AdminMusicPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; count?: string }> }) {
  const [params, library, templates] = await Promise.all([searchParams, getMusicLibrary(), getTemplatesWithSettings()]);
  const enabledTemplates = templates.filter((template) => template.enabled);
  const tracks = library.slots.filter((slot) => slot.url);
  const activeSlot = getActiveMusicSlot(library);
  const message = saveMessage(params.saved, params.count);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Music Library</span>
          <h1>مكتبة الموسيقى</h1>
          <p>احفظ أكتر من مقطع، وشغل مقطع واحد فقط على كل القوالب. الاسم المختلف يضيف مقطع جديد ولا يستبدل القديم.</p>
        </div>
      </div>

      {message ? (
        <div className="notice success">
          <CheckCircle2 size={18} />
          {message}
        </div>
      ) : null}

      {params.error ? (
        <div className="notice danger">
          <AlertTriangle size={18} />
          {params.error === "youtube"
            ? "YouTube لا يعمل كصوت مباشر. استخدم ملف صوت أو رابط MP3/WAV/OGG مباشر."
            : params.error === "name"
              ? "اكتب اسم واضح للمقطع قبل الحفظ."
            : params.error === "audio"
              ? "لا يوجد ملف صوت صالح أو الصيغة غير قابلة للتشغيل. ارفع MP3 أو M4A أو WAV أو OGG أو WEBM أو FLAC، أو استخدم رابط مباشر لملف صوت."
              : "تعذر تنفيذ أمر الموسيقى."}
        </div>
      ) : null}

      <section className="music-control-panel panel">
        <div className="music-control-status">
          <span className={activeSlot ? "music-status-icon active" : "music-status-icon"}>
            <Music2 size={24} />
          </span>
          <div>
            <span className="eyebrow">Active Track</span>
            <h2>{activeSlot?.name || "لا يوجد مقطع نشط"}</h2>
            <p>{activeSlot ? `شغال على ${enabledTemplates.length} قالب` : "القوالب حاليا بدون موسيقى عامة."}</p>
          </div>
          <strong className={activeSlot ? "music-live-badge active" : "music-live-badge"}>{activeSlot ? "ON" : "OFF"}</strong>
        </div>
      </section>

      <section className="music-library-panel panel">
        <div className="admin-card-head">
          <FileAudio size={22} />
          <div>
            <span className="eyebrow">Saved Tracks</span>
            <h2>المقاطع المحفوظة</h2>
            <p>المعاينة هنا من نفس رابط الملف الذي سيعمل داخل القوالب.</p>
          </div>
        </div>

        {tracks.length ? (
          <div className="music-track-list">
            {tracks.map((track) => {
              const isActive = activeSlot?.id === track.id;
              return (
                <article className={isActive ? "music-track-card active" : "music-track-card"} key={track.id}>
                  <div className="music-track-head">
                    <span className={isActive ? "music-status-icon active" : "music-status-icon"}>
                      <Music2 size={20} />
                    </span>
                    <div>
                      <h3>{track.name}</h3>
                      <p>{isActive ? "المقطع النشط على القوالب" : "محفوظ وغير مشغل حاليا"}</p>
                    </div>
                    <strong className={isActive ? "music-live-badge active" : "music-live-badge"}>{isActive ? "ON" : "OFF"}</strong>
                  </div>

                  <div className="music-now-playing">
                    <div>
                      <FileAudio size={18} />
                      <span>{track.url}</span>
                    </div>
                    <audio controls preload="metadata" src={track.url} />
                  </div>

                  <div className="music-action-row">
                    <form action="/api/admin/music" method="post">
                      <input type="hidden" name="slotId" value={track.id} />
                      <button className="btn btn-gold" name="action" value="enable" type="submit" disabled={isActive}>
                        <Play size={17} />
                        تشغيل
                      </button>
                    </form>
                    <form action="/api/admin/music" method="post">
                      <input type="hidden" name="slotId" value={track.id} />
                      <button className="btn btn-soft" name="action" value="disable" type="submit" disabled={!isActive}>
                        <Pause size={17} />
                        إيقاف
                      </button>
                    </form>
                    <form action="/api/admin/music" method="post">
                      <input type="hidden" name="slotId" value={track.id} />
                      <button className="btn btn-soft danger-button" name="action" value="delete" type="submit">
                        <Trash2 size={17} />
                        حذف
                      </button>
                    </form>
                  </div>

                  <div className="music-meta-line">
                    <span>آخر حفظ</span>
                    <strong>{formatDate(track.updatedAt)}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="music-empty-box">لسه مفيش مقاطع محفوظة. أضف أول مقطع من النموذج بالأسفل.</div>
        )}
      </section>

      <section className="music-replace-panel panel">
        <div className="admin-card-head">
          <UploadCloud size={22} />
          <div>
            <span className="eyebrow">Add Or Update</span>
            <h2>إضافة مقطع أو تحديث مقطع بنفس الاسم</h2>
            <p>لو الاسم جديد هيتحفظ كمقطع جديد. لو الاسم موجود، هيتم تحديث نفس المقطع فقط.</p>
          </div>
        </div>

        <form className="music-simple-form" action="/api/admin/music" method="post" encType="multipart/form-data">
          <input type="hidden" name="action" value="save" />

          <label className="field">
            <span>اسم المقطع</span>
            <input name="trackName" placeholder="مثال: دخول العروسة" required />
          </label>

          <label className="field">
            <span>رفع ملف صوت من الجهاز</span>
            <input name="audioFile" type="file" accept="audio/*,.mp3,.wav,.ogg,.webm,.m4a,.aac,.mp4,.flac" />
            <small>لو الاسم جديد، الملف يضاف كمقطع جديد. لو الاسم موجود، يستبدل نفس المقطع.</small>
          </label>

          <label className="field">
            <span>أو رابط صوت مباشر</span>
            <input name="audioUrl" placeholder="https://example.com/song.mp3" />
            <small>لازم الرابط يكون ملف صوت مباشر، وليس صفحة YouTube.</small>
          </label>

          <label className="music-checkline">
            <input name="trackEnabled" type="checkbox" defaultChecked />
            <span>تشغيل المقطع بعد الحفظ</span>
          </label>

          <button className="btn btn-gold btn-glow music-save-button" type="submit">
            <Plus size={18} />
            إضافة / حفظ
          </button>
        </form>
      </section>
    </>
  );
}
