import { notFound } from "next/navigation";
import { BsClockHistory, BsJournalCode } from "react-icons/bs";

import PostCard from "@/components/PostCard";
import PublicNav from "@/components/PublicNav";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { posts } from "@/lib/posts";

const container = "mx-auto w-full max-w-6xl px-4";

export default async function PublicLogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const t = getDictionary(locale);

  return (
    <>
      <PublicNav locale={locale} t={t} />

      <header className="bg-linear-135 from-hero-1 from-0% via-hero-2 via-55% to-hero-3 py-16 text-white">
        <div className={container}>
          <div className="max-w-3xl">
            <span className="mb-4 inline-block rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm">
              {t["hero.badge"]}
            </span>
            <h1 className="mb-3 text-4xl font-bold md:text-5xl">
              {t["hero.title.pre"]}{" "}
              <span className="bg-linear-90 from-accent-1 to-accent-2 bg-clip-text text-transparent">
                {t["hero.title.mid"]}
              </span>{" "}
              {t["hero.title.post"]}
            </h1>
            <p className="text-lg text-white/50">{t["hero.subtitle"]}</p>
          </div>
        </div>
      </header>

      <main id="entradas" className="py-12">
        <div className={container}>
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">{t["entries.heading"]}</h2>
            <span className="flex items-center gap-1 text-sm text-slate-500">
              <BsClockHistory aria-hidden />
              {t["entries.updated"]}
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} locale={locale} t={t} />
            ))}
          </div>
        </div>
      </main>

      <section id="acerca" className="border-t border-slate-200 bg-white py-12">
        <div className={container}>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-3 text-2xl font-bold">{t["about.heading"]}</h2>
            <p className="text-slate-500">{t["about.body"]}</p>
          </div>
        </div>
      </section>

      <footer className="mt-auto bg-slate-900 py-4 text-white/50">
        <div
          className={`${container} flex flex-wrap items-center justify-between gap-2`}
        >
          <span className="flex items-center gap-2">
            <BsJournalCode aria-hidden className="text-white" />
            {t["footer.brand"]}
          </span>
          <span>© 2026</span>
        </div>
      </footer>
    </>
  );
}
