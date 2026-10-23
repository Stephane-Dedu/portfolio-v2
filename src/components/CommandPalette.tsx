import { Command } from 'cmdk';
import { useEffect, useState } from 'react';

type Item = {
  group: string;
  label: string;
  hint?: string;
  href?: string;
  action?: 'theme';
};

type Strings = { label: string; placeholder: string; empty: string; footer: string };

export default function CommandPalette({ items, strings }: { items: Item[]; strings: Strings }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('palette:open', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('palette:open', onOpen);
    };
  }, []);

  const run = (item: Item) => {
    setOpen(false);
    if (item.action === 'theme') {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      window.__setTheme?.(next);
    } else if (item.href?.startsWith('http')) {
      window.open(item.href, '_blank', 'noopener');
    } else if (item.href) {
      window.location.href = item.href;
    }
  };

  const groups = [...new Set(items.map((item) => item.group))];

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label={strings.label}
      overlayClassName="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px]"
      contentClassName="fixed left-1/2 top-[16vh] z-50 font-mono w-[min(560px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-surface text-fg shadow-2xl shadow-black/20"
    >
      <Command.Input
        placeholder={strings.placeholder}
        className="w-full border-b border-line bg-transparent px-4 py-3.5 text-[15px] outline-none placeholder:text-faint"
      />
      <Command.List className="max-h-[52vh] overflow-y-auto overscroll-contain p-2">
        <Command.Empty className="label px-3 py-8 text-center">{strings.empty}</Command.Empty>
        {groups.map((group) => (
          <Command.Group
            key={group}
            heading={group}
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:text-faint"
          >
            {items
              .filter((item) => item.group === group)
              .map((item) => (
                <Command.Item
                  key={item.label}
                  value={`${item.label} ${item.hint ?? ''}`}
                  onSelect={() => run(item)}
                  className="flex cursor-pointer items-center justify-between gap-4 rounded-md px-2.5 py-2 text-sm data-[selected=true]:bg-fg/[0.06]"
                >
                  <span className="truncate">{item.label}</span>
                  {item.hint && <span className="label shrink-0">{item.hint}</span>}
                </Command.Item>
              ))}
          </Command.Group>
        ))}
      </Command.List>
      <div className="label flex justify-between border-t border-line px-3 py-2">
        <span>{strings.footer}</span>
        <span>esc</span>
      </div>
    </Command.Dialog>
  );
}
