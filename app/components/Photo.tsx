import { images } from "~/content";
import { useI18n } from "~/i18n";

type Props = {
  slug: string;
  /** e.g. "(min-width: 1024px) 50vw, 100vw" */
  sizes: string;
  className?: string;
  imgClassName?: string;
  /** above-the-fold hero: load eagerly with high priority */
  priority?: boolean;
  /** decorative images get an empty alt */
  decorative?: boolean;
};

/** Responsive AVIF/WebP/JPEG photo with a blurred placeholder. */
export function Photo({ slug, sizes, className = "", imgClassName = "", priority = false, decorative = false }: Props) {
  const { locale } = useI18n();
  const img = images[slug];
  if (!img) return null;
  const srcset = (ext: string) => img.widths.map((w) => `/images/${slug}-${w}.${ext} ${w}w`).join(", ");
  const fallbackW = img.widths.includes(960) ? 960 : img.widths[img.widths.length - 1];
  return (
    <picture className={className}>
      <source type="image/avif" srcSet={srcset("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcset("webp")} sizes={sizes} />
      <img
        src={`/images/${slug}-${fallbackW}.jpg`}
        srcSet={srcset("jpg")}
        sizes={sizes}
        width={img.width}
        height={img.height}
        alt={decorative ? "" : img.alt[locale]}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        className={imgClassName}
        style={{
          backgroundImage: `url(${img.blur})`,
          backgroundSize: "cover",
          backgroundPosition: img.position ?? "center",
          objectPosition: img.position ?? "center",
        }}
      />
    </picture>
  );
}
