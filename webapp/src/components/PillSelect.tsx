export interface PillOption {
  value: string;
  label: string;
}

interface SingleProps {
  options: PillOption[];
  value: string;
  onChange: (value: string) => void;
  multi?: false;
  'aria-label'?: string;
}

interface MultiProps {
  options: PillOption[];
  value: string[];
  onChange: (value: string[]) => void;
  multi: true;
  'aria-label'?: string;
}

type PillSelectProps = SingleProps | MultiProps;

export function PillSelect(props: PillSelectProps) {
  const { options, multi, 'aria-label': ariaLabel } = props;

  const isSelected = (v: string) =>
    multi ? (props.value as string[]).includes(v) : props.value === v;

  const handleClick = (v: string) => {
    if (multi) {
      const current = props.value as string[];
      const next = current.includes(v)
        ? current.filter((x) => x !== v)
        : [...current, v];
      (props.onChange as (value: string[]) => void)(next);
    } else {
      (props.onChange as (value: string) => void)(v);
    }
  };

  return (
    <div
      role={multi ? 'group' : 'radiogroup'}
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2"
    >
      {options.map((opt) => {
        const selected = isSelected(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={selected}
            onClick={() => handleClick(opt.value)}
            className={`min-h-[36px] rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              selected
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-edge bg-page text-muted hover:border-body/30 hover:text-body'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
