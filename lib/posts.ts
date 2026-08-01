import type { MessageKey } from "@/lib/i18n";

/**
 * Entradas de la bitácora. Estáticas por ahora; cuando exista `GET /api/posts`
 * solo cambia de dónde sale el array — la forma del objeto ya es la del endpoint.
 */
export type Post = {
  slug: string;
  week: number;
  /** ISO date, o null si la entrada aún no está publicada. */
  date: string | null;
  titleKey: MessageKey;
  summaryKey: MessageKey;
  banner: "i18n" | "guards" | "next";
  icon: "translate" | "shield-lock" | "hourglass-split";
  published: boolean;
};

export const posts: Post[] = [
  {
    slug: "internacionalizacion",
    week: 2,
    date: "2026-07-18",
    titleKey: "post.i18n.title",
    summaryKey: "post.i18n.summary",
    banner: "i18n",
    icon: "translate",
    published: true,
  },
  {
    slug: "guards",
    week: 1,
    date: "2026-07-11",
    titleKey: "post.guards.title",
    summaryKey: "post.guards.summary",
    banner: "guards",
    icon: "shield-lock",
    published: true,
  },
  {
    slug: "proximo",
    week: 3,
    date: null,
    titleKey: "post.next.title",
    summaryKey: "post.next.summary",
    banner: "next",
    icon: "hourglass-split",
    published: false,
  },
];
