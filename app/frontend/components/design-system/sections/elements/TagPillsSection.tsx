import { SectionShell } from "@/components/design-system/SectionShell";
import { TagPill, TAG_COLORS } from "@/components/ui/tag-pill";

const code = `import { TagPill, TagDot, TAG_COLORS } from "@/components/ui/tag-pill";

<TagPill color="tag-5">design</TagPill>

// Just the dot, e.g. in a filter row or a colour picker
<TagDot color="tag-3" />`;

export function TagPillsSection() {
  return (
    <SectionShell
      id="tag-pills"
      title="Tag pills"
      description={
        <>
          A neutral badge carrying a coloured dot, for user-created labels. The
          dot is the only thing that carries colour — the pill itself stays a
          neutral badge, so contrast is handled by the badge tones and each
          colour needs exactly one token. Eight hues cover a personal tag list
          without any two reading as the same colour.
        </>
      }
      whenToUse={
        <ul>
          <li>User-created tags, categories, or labels that need telling apart at a glance.</li>
          <li>Anywhere a set of arbitrary, unranked values is displayed.</li>
        </ul>
      }
      whenNotToUse={
        <ul>
          <li>
            Status or meaning-bearing labels — use <code>&lt;Badge&gt;</code> with{" "}
            <code>accent</code>, <code>signal</code>, or <code>danger</code>, which carry semantics.
          </li>
          <li>As the only signal for something important — colour alone is not accessible.</li>
        </ul>
      }
      preview={
        <div className="flex flex-wrap items-center gap-2">
          {TAG_COLORS.map((color, index) => (
            <TagPill key={color} color={color}>
              {["design", "research", "react", "rails", "reading", "ai", "tools", "inspo"][index]}
            </TagPill>
          ))}
        </div>
      }
      code={code}
      options={
        <ul className="list-disc pl-5">
          <li>
            <code>color</code>: <code>tag-1</code> … <code>tag-8</code>, backed by the{" "}
            <code>--color-tag-*</code> tokens (lifted in dark mode). Omitting it falls back to{" "}
            <code>ink-muted</code>.
          </li>
          <li>
            <code>TAG_COLORS</code> exports the slots in order — mirror of <code>Tag::COLORS</code>{" "}
            in Ruby, which assigns one per tag from a hash of its name.
          </li>
          <li>
            <code>TagDot</code> renders the dot on its own for filter rows and colour pickers.
          </li>
        </ul>
      }
    />
  );
}
