import * as React from "react";
import { SectionShell } from "@/components/design-system/SectionShell";
import { TagInput } from "@/components/ui/tag-input";

const code = `import { TagInput } from "@/components/ui/tag-input";

const [tags, setTags] = React.useState<string[]>(["design"]);

<label htmlFor="tags">Tags</label>
<TagInput
  id="tags"
  value={tags}
  onChange={setTags}
  suggestions={["design", "research", "react", "rails"]}
/>`;

export function TagInputSection() {
  const [tags, setTags] = React.useState<string[]>(["design", "react"]);

  return (
    <SectionShell
      id="tag-input"
      title="Tag input"
      description={
        <>
          Multi-value field with autocomplete. Selected values sit inside the
          control as removable pills; typing filters the existing set and{" "}
          <kbd>Enter</kbd> either picks the highlighted suggestion or creates a
          new value from what was typed. Fully keyboard operable and announced
          as a combobox.
        </>
      }
      whenToUse={
        <ul>
          <li>Assigning several existing-or-new labels to a record in one field.</li>
          <li>Any free-text set where creating a value inline beats a separate management step.</li>
        </ul>
      }
      whenNotToUse={
        <ul>
          <li>
            A fixed list of options — use <code>&lt;Select&gt;</code> or a group of{" "}
            <code>&lt;Checkbox&gt;</code>es.
          </li>
          <li>A single value — use <code>&lt;Input&gt;</code>.</li>
        </ul>
      }
      preview={
        <div className="max-w-md space-y-2">
          <label htmlFor="ds-tag-input">Tags</label>
          <TagInput
            id="ds-tag-input"
            value={tags}
            onChange={setTags}
            suggestions={["design", "research", "react", "rails", "reading", "ai"]}
          />
          <p className="text-xs text-ink-muted">
            Try typing, then <kbd>↑</kbd>/<kbd>↓</kbd>, <kbd>Enter</kbd>, <kbd>Esc</kbd>, and{" "}
            <kbd>Backspace</kbd> on an empty field.
          </p>
        </div>
      }
      code={code}
      options={
        <ul className="list-disc pl-5">
          <li>
            <code>value</code> / <code>onChange</code>: controlled array of lowercase names.
          </li>
          <li>
            <code>suggestions</code>: existing names to autocomplete against. Already-selected
            values are filtered out.
          </li>
          <li>
            <code>maxTags</code> (default <code>20</code>), <code>placeholder</code>,{" "}
            <code>disabled</code>, <code>aria-invalid</code>, <code>aria-describedby</code>.
          </li>
          <li>
            Values are normalised (trimmed, whitespace collapsed, lowercased) and de-duplicated.
            Commas act as a separator rather than content.
          </li>
        </ul>
      }
    />
  );
}
