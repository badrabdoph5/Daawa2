import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { OrderInitialDraft } from "@/components/OrderForm";
import { OrderForm } from "@/components/OrderForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { getPublicTemplatesWithSettings } from "@/lib/template-settings";

export const metadata: Metadata = {
  title: "اطلب دعوتك",
};

type PageProps = {
  searchParams?: Promise<{
    template?: string;
    groomName?: string;
    brideName?: string;
    phone?: string;
    weddingDate?: string;
    mapUrl?: string;
    venue?: string;
    notes?: string;
    photographerEnabled?: string;
    photographerName?: string;
    photographerFacebookUrl?: string;
    photographerInstagramUrl?: string;
    musicEnabled?: string;
    musicChoice?: string;
    musicUrl?: string;
    gallery?: string;
  }>;
};

export default async function OrderPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const templates = await getPublicTemplatesWithSettings();
  const selected = (params.template ? templates.find((template) => template.slug === params.template) : undefined) || templates[0];
  if (!selected) redirect("/templates");
  const templateOptions = templates.map(({ slug, name, arabicName, previewImage }) => ({ slug, name, arabicName, previewImage }));
  const initialDraft: OrderInitialDraft = {
    groomName: params.groomName || "",
    brideName: params.brideName || "",
    phone: params.phone || "",
    weddingDate: params.weddingDate || "",
    mapUrl: params.mapUrl || "",
    venue: params.venue || "",
    notes: params.notes || "",
    photographerEnabled: params.photographerEnabled === "1",
    photographerName: params.photographerName || "",
    photographerFacebookUrl: params.photographerFacebookUrl || "",
    photographerInstagramUrl: params.photographerInstagramUrl || "",
    musicEnabled: params.musicEnabled === "1",
    musicChoice: params.musicChoice === "upload" || params.musicChoice === "url" ? params.musicChoice : "default",
    musicUrl: params.musicUrl || "",
    imageUrls: (params.gallery || "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 3),
  };

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section compact">
        <div className="container order-shell">
          <SectionIntro eyebrow="طلب دعوة" title="بيانات الدعوة" lead="اختار القالب، اكتب بيانات المناسبة، وارفع الصور. تقدر تعاين الدعوة قبل تأكيد الطلب." />
          <OrderForm initialTemplate={selected.slug} initialDraft={initialDraft} templates={templateOptions} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
