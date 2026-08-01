import type { IconType } from "react-icons";
import {
  BsArrowRight,
  BsCalendar3,
  BsHourglassSplit,
  BsShieldLock,
  BsTranslate,
} from "react-icons/bs";

import { formatDate, type Dictionary, type Locale } from "@/lib/i18n";
import type { Post } from "@/lib/posts";

type Props = {
  post: Post;
  locale: Locale;
  t: Dictionary;
};

const icons: Record<Post["icon"], IconType> = {
  translate: BsTranslate,
  "shield-lock": BsShieldLock,
  "hourglass-split": BsHourglassSplit,
};

const banners: Record<Post["banner"], string> = {
  i18n: "bg-linear-120 from-brand to-brand-2",
  guards: "bg-linear-120 from-guards-1 to-guards-2",
  next: "bg-linear-120 from-next-1 to-next-2",
};

const badges: Record<Post["banner"], string> = {
  i18n: "bg-brand text-white",
  guards: "bg-guards-2 text-white",
  next: "bg-slate-500 text-white",
};

export default function PostCard({ post, locale, t }: Props) {
  const Icon = icons[post.icon];

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white transition duration-250 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(79,70,229,0.12)]">
      <div
        className={`grid h-30 place-items-center rounded-t-2xl text-[2.6rem] text-white ${banners[post.banner]}`}
      >
        <Icon aria-hidden />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span
            className={`rounded-full px-2 py-1 text-xs tracking-wide uppercase ${badges[post.banner]}`}
          >
            {t["card.week"]} {post.week}
          </span>
          <small className="flex items-center gap-1 text-slate-500">
            <BsCalendar3 aria-hidden />
            {post.date ? formatDate(post.date, locale) : t["card.soon"]}
          </small>
        </div>

        <h3
          className={`mb-2 font-semibold ${post.published ? "" : "text-slate-500"}`}
        >
          {t[post.titleKey]}
        </h3>
        <p className="mb-4 flex-1 text-sm text-slate-500">
          {t[post.summaryKey]}
        </p>

        {post.published ? (
          <a
            href="#"
            className="bg-linear-90 from-brand to-brand-2 flex items-center gap-1 self-start rounded-md px-3 py-1.5 text-sm text-white transition hover:brightness-110"
          >
            {t["card.read"]}
            <BsArrowRight aria-hidden />
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="self-start rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-500"
          >
            {t["card.preparing"]}
          </button>
        )}
      </div>
    </article>
  );
}
