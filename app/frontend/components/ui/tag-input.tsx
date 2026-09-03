// bm-design-system: tag input primitive
import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TagInputProps {
  /** Selected tag names, lowercase. */
  value: string[];
  onChange: (value: string[]) => void;
  /** Existing tag names offered as suggestions. */
  suggestions?: string[];
  id?: string;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
  /**
   * Fires when the suggestion listbox opens or closes. An enclosing Radix
   * Dialog listens for Escape in the capture phase on `document`, so React
   * handlers here cannot stop it — the parent has to use this to guard
   * `DialogContent`'s `onEscapeKeyDown`. See TagInputSection for the pattern.
   */
  onListboxOpenChange?: (open: boolean) => void;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  className?: string;
}

const normalize = (raw: string) => raw.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Multi-value tag field with autocomplete. Selected values render as removable
 * pills inside the control; typing filters existing tags and Enter either picks
 * the highlighted suggestion or creates a new tag from what was typed.
 *
 * Built on a plain relatively-positioned listbox rather than a popover library:
 * the app has no combobox primitive and pulling in a new Radix package for one
 * field isn't worth it.
 */
export function TagInput({
  value,
  onChange,
  suggestions = [],
  id,
  placeholder = "Add a tag…",
  maxTags = 20,
  disabled,
  onListboxOpenChange,
  className,
  ...aria
}: TagInputProps) {
  const [draft, setDraft] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listboxId = `${id ?? "tag-input"}-listbox`;
  const atLimit = value.length >= maxTags;

  const selected = React.useMemo(() => new Set(value.map(normalize)), [value]);
  const query = normalize(draft);

  const matches = React.useMemo(() => {
    return suggestions
      .map(normalize)
      .filter((name) => name && !selected.has(name) && (!query || name.includes(query)))
      .slice(0, 8);
  }, [suggestions, selected, query]);

  // An exact match is offered as a suggestion, so only show "create" for
  // genuinely new text.
  const canCreate = query.length > 0 && !selected.has(query) && !matches.includes(query);
  const options: { name: string; isNew: boolean }[] = [
    ...(canCreate ? [{ name: query, isNew: true }] : []),
    ...matches.map((name) => ({ name, isNew: false })),
  ];

  React.useEffect(() => setHighlight(0), [query, open]);

  const listboxOpen = open && options.length > 0;
  React.useEffect(() => {
    onListboxOpenChange?.(listboxOpen);
  }, [listboxOpen, onListboxOpenChange]);

  const add = (raw: string) => {
    const name = normalize(raw);
    // Commas delimit tags in the URL, so treat one as a separator, not content.
    if (!name || name.includes(",") || selected.has(name) || atLimit) return;
    onChange([...value, name]);
    setDraft("");
    setOpen(false);
  };

  const remove = (name: string) => onChange(value.filter((tag) => tag !== name));

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        if (options.length) {
          event.preventDefault();
          setOpen(true);
          setHighlight((current) => (current + 1) % options.length);
        }
        break;
      case "ArrowUp":
        if (options.length) {
          event.preventDefault();
          setOpen(true);
          setHighlight((current) => (current - 1 + options.length) % options.length);
        }
        break;
      case "Enter":
      case ",":
        event.preventDefault();
        add(open && options[highlight] ? options[highlight].name : draft);
        break;
      case "Escape":
        // Closing the listbox is all this can do — a Dialog's own Escape
        // handling has to be suppressed by the parent via onListboxOpenChange.
        if (listboxOpen) setOpen(false);
        break;
      case "Backspace":
        if (!draft && value.length) {
          event.preventDefault();
          remove(value[value.length - 1]);
        }
        break;
    }
  };

  return (
    <div className={className}>
      <div
        role="combobox"
        aria-expanded={listboxOpen}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "form-control h-auto min-h-10 flex-wrap items-center gap-1.5 py-1.5",
          "focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-page focus-within:border-accent",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {value.map((name) => (
          <span key={name} className="badge badge-neutral gap-1.5">
            {name}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                remove(name);
              }}
              disabled={disabled}
              aria-label={`Remove ${name}`}
              className="cursor-pointer rounded-full text-ink-muted hover:text-ink-display focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={draft}
          disabled={disabled || atLimit}
          placeholder={value.length === 0 ? placeholder : ""}
          autoComplete="off"
          aria-autocomplete="list"
          aria-activedescendant={
            listboxOpen && options[highlight] ? `${listboxId}-${highlight}` : undefined
          }
          {...aria}
          onChange={(event) => {
            setDraft(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className="min-w-24 flex-1 border-0 bg-transparent p-0 text-sm text-ink-body outline-none placeholder:text-ink-muted"
        />
      </div>

      {listboxOpen && (
        <ul
          id={listboxId}
          role="listbox"
          // In-flow, not absolutely positioned: `.modal` is a scroll container
          // (overflow-y-auto), so an absolute overlay gets clipped at the
          // dialog's edge. Letting the list take up space makes the dialog grow
          // and, past the viewport, scroll to it.
          className="mt-1 max-h-48 overflow-y-auto rounded-md border border-hairline bg-page py-1 shadow-lg"
        >
          {options.map((option, index) => (
            <li
              key={`${option.isNew ? "new" : "tag"}-${option.name}`}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={index === highlight}
              onMouseDown={(event) => {
                event.preventDefault();
                add(option.name);
              }}
              onMouseEnter={() => setHighlight(index)}
              className={cn(
                "cursor-pointer px-3 py-1.5 text-sm",
                index === highlight ? "bg-accent-faded text-accent-display" : "text-ink-body",
              )}
            >
              {option.isNew ? (
                <>
                  Create <span className="font-medium">{option.name}</span>
                </>
              ) : (
                option.name
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
