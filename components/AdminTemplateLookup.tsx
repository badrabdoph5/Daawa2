"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Edit3, Eye, Link2, Search, X } from "lucide-react";
import type { Invitation, TemplateDefinition } from "@/lib/types";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function AdminTemplateLookup({
  templates,
  initialQuery,
  searchedInvitation,
}: {
  templates: TemplateDefinition[];
  initialQuery: string;
  searchedInvitation?: Invitation;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  const templateMatches = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return [];
    return templates
      .filter((template) =>
        normalize([template.slug, template.name, template.arabicName, template.category, template.concept, template.style].join(" ")).includes(normalizedQuery),
      )
      .slice(0, 6);
  }, [query, templates]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("invitation", query.trim());
    startTransition(() => {
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}#template-lookup`, { scroll: false });
    });
  }

  return (
    <section className="panel template-lookup-panel" id="template-lookup">
      <div className="template-lookup-head">
        <div>
          <span className="eyebrow">Find & Edit</span>
          <h2>الوصول للقالب أو الدعوة</h2>
          <p>ابحث باسم قالب، كود دعوة، أو رابط دعوة كامل. النتائج تفضل في نفس مكانك بدون رجوع لأول الصفحة.</p>
        </div>
        <Search size={26} />
      </div>

      <form className="template-link-search" onSubmit={submitSearch}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} name="invitation" placeholder="مثال: magazine-theme أو badr-sarah-1 أو رابط الدعوة" />
        {query ? (
          <button className="btn btn-soft btn-icon" type="button" aria-label="مسح البحث" onClick={() => setQuery("")}>
            <X size={17} />
          </button>
        ) : null}
        <button className="btn btn-gold" type="submit">
          {isPending ? "جاري البحث..." : "بحث"}
        </button>
      </form>

      <div className="template-lookup-results">
        {searchedInvitation ? (
          <article className="template-found-card invitation-found-card">
            <div>
              <span className="eyebrow">دعوة مرتبطة</span>
              <h3>
                {searchedInvitation.groomName} و {searchedInvitation.brideName}
              </h3>
              <p>
                القالب المستخدم: <strong>{searchedInvitation.templateSlug}</strong>
              </p>
              <small>/{searchedInvitation.code}</small>
            </div>
            <div className="button-row">
              <Link className="btn btn-soft" href={`/${searchedInvitation.code}`}>
                <Eye size={17} />
                معاينة
              </Link>
              <Link className="btn btn-gold" href={`/admin/templates#template-${searchedInvitation.templateSlug}`}>
                <Edit3 size={17} />
                تعديل القالب
              </Link>
            </div>
          </article>
        ) : initialQuery ? (
          <div className="notice danger">
            <Link2 size={18} />
            لو البحث كان رابط دعوة، مفيش دعوة بالكود ده. لو كان اسم قالب، شوف النتائج المطابقة بالأسفل.
          </div>
        ) : null}

        {templateMatches.length ? (
          <div className="template-match-grid">
            {templateMatches.map((template) => (
              <article className="template-found-card" key={template.slug}>
                <img src={template.previewImage} alt="" loading="lazy" />
                <div>
                  <span>{template.category}</span>
                  <h3>{template.arabicName}</h3>
                  <p>{template.concept}</p>
                  <small>{template.slug}</small>
                </div>
                <div className="button-row">
                  <Link className="btn btn-soft" href={`/templates/${template.slug}/preview`}>
                    <Eye size={17} />
                    معاينة
                  </Link>
                  <Link className="btn btn-gold" href={`/admin/templates#template-${template.slug}`}>
                    <Edit3 size={17} />
                    تعديل
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : query.trim() ? (
          <div className="template-empty-soft">مفيش قالب مطابق بالاسم ده حتى الآن.</div>
        ) : null}
      </div>
    </section>
  );
}
