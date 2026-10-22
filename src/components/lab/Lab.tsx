import { useState } from 'react';
import type { Lang } from '../../i18n/ui';
import Globe from './Globe';
import K9s from './K9s';

const TABS = [
  {
    id: 'k9s',
    hint: {
      en: 'Click in the terminal: ↑↓ to move, ctrl-k to kill a pod, ":" to switch views.',
      fr: 'Clique dans le terminal : ↑↓ pour naviguer, ctrl-k pour tuer un pod, « : » pour changer de vue.',
    },
  },
  { id: 'globe', hint: { en: 'Drag the globe, hover a region.', fr: 'Fais glisser le globe, survole une région.' } },
] as const;

type Tab = (typeof TABS)[number]['id'];

export default function Lab({ lang }: { lang: Lang }) {
  const [tab, setTab] = useState<Tab>('k9s');
  const current = TABS.find((t) => t.id === tab)!;

  return (
    <figure>
      {tab === 'k9s' ? (
        <K9s lang={lang} />
      ) : (
        <div className="relative h-[540px] overflow-hidden rounded-xl border border-line bg-surface sm:h-[520px]">
          <Globe lang={lang} />
        </div>
      )}
      <figcaption className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label={lang === 'fr' ? 'Choisir la démo' : 'Pick a demo'} className="inline-flex w-fit rounded-lg border border-line p-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === tab}
              onClick={() => setTab(t.id)}
              className={`label rounded-md px-3 py-1.5 transition-colors ${t.id === tab ? 'bg-fg text-bg' : 'hover:text-fg'}`}
            >
              {t.id}
            </button>
          ))}
        </div>
        <p className="label">{current.hint[lang]}</p>
      </figcaption>
    </figure>
  );
}
