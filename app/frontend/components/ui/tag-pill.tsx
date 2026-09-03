// bm-design-system: tag pill primitive
import * as React from "react";
import { cn } from "@/lib/utils";

/** One of the eight --color-tag-* slots. Mirrors Tag::COLORS in Ruby. */
export type TagColor =
  | "tag-1"
  | "tag-2"
  | "tag-3"
  | "tag-4"
  | "tag-5"
  | "tag-6"
  | "tag-7"
  | "tag-8";

export const TAG_COLORS: TagColor[] = [
  "tag-1",
  "tag-2",
  "tag-3",
  "tag-4",
  "tag-5",
  "tag-6",
  "tag-7",
  "tag-8",
];

export function TagDot({
  color,
  className,
}: {
  color?: TagColor | string | null;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("tag-dot", color ? `tag-dot-${color}` : undefined, className)}
    />
  );
}

export interface TagPillProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  color?: TagColor | string | null;
}

/**
 * A neutral badge carrying a coloured dot. The dot does the identifying, so
 * pill contrast stays governed by the existing badge tones in every theme.
 */
const TagPill = React.forwardRef<HTMLSpanElement, TagPillProps>(
  ({ className, color, children, ...props }, ref) => {
    return (
      <span ref={ref} className={cn("badge badge-neutral", className)} {...props}>
        <TagDot color={color} />
        {children}
      </span>
    );
  },
);
TagPill.displayName = "TagPill";

export { TagPill };
