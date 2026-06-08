"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";

type RsvpState = {
  name: string;
  phone: string;
  attendees: number;
  status: "confirmed" | "declined";
  note: string;
};

export function RsvpForm({ code }: { code: string }) {
  const [form, setForm] = useState<RsvpState>({ name: "", phone: "", attendees: 1, status: "confirmed", note: "" });
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("");

    try {
      const response = await fetch(`/api/invitations/${code}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        setState("success");
        setMessage("تم تسجيل ردك بنجاح. وجودك يفرحنا.");
        setForm({ name: "", phone: "", attendees: 1, status: "confirmed", note: "" });
        return;
      }

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setState("error");
      setMessage(data?.error || "حصلت مشكلة أثناء التسجيل. حاول مرة تانية.");
    } catch {
      setState("error");
      setMessage("تعذر الاتصال بالخادم. تأكد من الإنترنت وحاول مرة أخرى.");
    }
  }

  return (
    <form className="rsvp-card" onSubmit={submit}>
      <div className="input-grid">
        <div className="field">
          <label htmlFor="guest-name">الاسم</label>
          <input id="guest-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="guest-phone">رقم الهاتف</label>
          <input id="guest-phone" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="guest-count">عدد الأفراد</label>
          <input
            id="guest-count"
            type="number"
            min={1}
            max={20}
            value={form.attendees}
            onChange={(event) => setForm({ ...form, attendees: Number(event.target.value) })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="guest-status">حالة الحضور</label>
          <select id="guest-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as RsvpState["status"] })}>
            <option value="confirmed">سأحضر</option>
            <option value="declined">أعتذر عن الحضور</option>
          </select>
        </div>
        <div className="field full">
          <label htmlFor="guest-note">ملاحظة اختيارية</label>
          <textarea id="guest-note" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
        </div>
      </div>
      <button className="btn btn-gold" type="submit" disabled={state === "loading"}>
        {state === "loading" ? <Loader2 size={18} className="animate-float" /> : form.status === "confirmed" ? <Check size={18} /> : <X size={18} />}
        تأكيد الرد
      </button>
      {message ? <p className={state === "error" ? "status danger" : "status success"}>{message}</p> : null}
    </form>
  );
}
