import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SectionIntro } from "@/components/SectionIntro";

export const metadata: Metadata = {
  title: "تواصل معنا",
};

export default function ContactPage() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section compact">
        <div className="container contact-focus">
          <SectionIntro eyebrow="تواصل" title="جاهز نبدأ؟" lead="املأ الطلب أو تواصل مباشرة على واتساب." />
          <aside className="form-panel">
            <Phone size={24} />
            <h2>01011511561</h2>
            <p>أرسل الأسماء، التاريخ، والمكان.</p>
            <Link className="btn btn-gold" href="/templates">
              <MessageCircle size={18} />
              افتح نموذج الطلب
            </Link>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
