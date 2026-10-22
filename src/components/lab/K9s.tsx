import { useEffect, useReducer, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import {
  APPS,
  CAPACITY,
  drainable,
  initialState,
  load,
  podName,
  reducer,
  type ClusterEvent,
  type ClusterNode,
  type Pod,
  type State,
} from './cluster';
import type { Lang } from '../../i18n/ui';

const COPY = {
  en: {
    aria: 'k9s simulation: arrow keys to move, ctrl-k to kill a pod, colon to switch views',
    idle: '○ click to play',
    cluster: 'sdedu-lab (simulated)',
    notFound: 'not found (deleted). <esc> to go back.',
    back: '<esc> to go back',
  },
  fr: {
    aria: 'Simulation de k9s : flèches pour naviguer, ctrl-k pour tuer un pod, deux-points pour changer de vue',
    idle: '○ clique pour jouer',
    cluster: 'sdedu-lab (simulé)',
    notFound: 'introuvable (supprimé). <esc> pour revenir.',
    back: '<esc> pour revenir',
  },
};

type View = { kind: 'pods'; node?: string } | { kind: 'nodes' } | { kind: 'events' } | { kind: 'describe'; id: string };
type Hint = { keys: string; label: string; run: () => void };
type Column<T> = { label: string; width: string; mobile?: string; cell: (row: T) => ReactNode };

// figlet "Graffiti", the font k9s uses for its own logo
const LOGO = String.raw`           .___         .___
  ______ __| _/____   __| _/_ __
 /  ___// __ |/ __ \ / __ |  |  \
 \___ \/ /_/ \  ___// /_/ |  |  /
/____  >____ |\___  >____ |____/
     \/     \/    \/     \/`;

const COMMANDS: Record<string, View['kind']> = {
  po: 'pods',
  pod: 'pods',
  pods: 'pods',
  no: 'nodes',
  node: 'nodes',
  nodes: 'nodes',
  ev: 'events',
  event: 'events',
  events: 'events',
};

const age = (now: number, since: number) => {
  if (!since) return '14d';
  const s = Math.max(0, Math.floor((now - since) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60}s`;
};

const statusColor: Record<Pod['status'], string> = {
  Running: 'text-(--t-aqua)',
  ContainerCreating: 'text-(--t-yellow)',
  Pending: 'text-(--t-yellow)',
  Terminating: 'text-(--t-red)',
};

const ipFor = (pod: Pod, nodes: ClusterNode[]) => {
  let hash = 0;
  for (const c of pod.id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const n = Math.max(0, nodes.findIndex((node) => node.name === pod.node));
  return `10.0.${n * 16 + 1}.${(hash % 240) + 10}`;
};

function Table<T>({
  columns,
  rows,
  selected,
  onSelect,
  onOpen,
  rowClass,
  rowKey,
}: {
  columns: Column<T>[];
  rows: T[];
  selected: number;
  onSelect: (i: number) => void;
  onOpen?: (i: number) => void;
  rowClass?: (row: T) => string;
  rowKey: (row: T) => string | number;
}) {
  const style = {
    '--cols': columns.map((c) => c.width).join(' '),
    // Hidden cells are not grid items, so the mobile template only lists mobile columns
    '--cols-sm': columns.flatMap((c) => (c.mobile ? [c.mobile] : [])).join(' '),
  } as CSSProperties;
  const gridClass = 'grid gap-x-3 [grid-template-columns:var(--cols-sm)] sm:[grid-template-columns:var(--cols)]';
  return (
    <div style={style} className="min-h-0 flex-1 overflow-hidden">
      <div className={`${gridClass} px-1 font-bold text-(--t-fg)`}>
        {columns.map((c) => (
          <span key={c.label} className={`truncate ${c.mobile ? '' : 'hidden sm:block'}`}>
            {c.label}
          </span>
        ))}
      </div>
      {rows.map((row, i) => (
        <div
          key={rowKey(row)}
          onClick={() => onSelect(i)}
          onDoubleClick={() => onOpen?.(i)}
          className={`${gridClass} cursor-default px-1 ${
            i === selected ? 'bg-(--t-aqua) text-(--t-bg)' : (rowClass?.(row) ?? 'text-(--t-aqua)')
          }`}
        >
          {columns.map((c) => (
            <span key={c.label} className={`truncate ${c.mobile ? '' : 'hidden sm:block'}`}>
              {c.cell(row)}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function K9s({ lang = 'en' }: { lang?: Lang }) {
  const copy = COPY[lang];
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [view, setView] = useState<View>({ kind: 'pods' });
  const [selected, setSelected] = useState(0);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Pod | null>(null);
  const [flash, setFlash] = useState<{ text: string; warn?: boolean } | null>(null);
  const [focused, setFocused] = useState(false);
  const [now, setNow] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const flashTimer = useRef<number>(undefined);

  useEffect(() => {
    const tick = window.setInterval(() => dispatch({ type: 'tick', now: Date.now() }), 120);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    setNow(Date.now());
    return () => {
      window.clearInterval(tick);
      window.clearInterval(clock);
      window.clearTimeout(flashTimer.current);
    };
  }, []);

  const notify = (text: string, warn = false) => {
    setFlash({ text, warn });
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 3500);
  };

  const go = (next: View) => {
    setView(next);
    setSelected(0);
  };

  // ----- rows for the current view -----
  const pods = [...state.pods]
    .filter((p) => view.kind !== 'pods' || !view.node || p.node === view.node)
    .sort((a, b) => a.id.localeCompare(b.id));
  const rowCount =
    view.kind === 'pods' ? pods.length : view.kind === 'nodes' ? state.nodes.length : view.kind === 'events' ? state.events.length : 0;
  const sel = Math.max(0, Math.min(selected, rowCount - 1));
  const selectedPod = view.kind === 'pods' ? pods[sel] : undefined;
  const selectedNode = view.kind === 'nodes' ? state.nodes[sel] : undefined;

  // ----- actions -----
  const kill = (pod: Pod | undefined) => {
    if (!pod || pod.status === 'Terminating' || pod.status === 'Pending') return;
    dispatch({ type: 'kill', id: pod.id, replacement: podName(pod.app), now: Date.now() });
    notify(`Delete resource pod ${pod.id}`);
  };
  const describe = () => selectedPod && go({ kind: 'describe', id: selectedPod.id });
  const cordon = () => {
    if (!selectedNode || selectedNode.cordoned) return;
    dispatch({ type: 'cordon', name: selectedNode.name, now: Date.now() });
    notify(`Cordon ${selectedNode.name}`);
  };
  const uncordon = () => {
    if (!selectedNode?.cordoned) return;
    dispatch({ type: 'uncordon', name: selectedNode.name, now: Date.now() });
    notify(`Uncordon ${selectedNode.name}`);
  };
  const drain = () => {
    if (!selectedNode) return;
    const replacements = drainable(state, selectedNode.name).map((p) => podName(p.app));
    dispatch({ type: 'drain', name: selectedNode.name, replacements, now: Date.now() });
    notify(`Draining ${selectedNode.name}`);
  };
  const enter = () => {
    if (view.kind === 'pods') describe();
    if (view.kind === 'nodes' && selectedNode) go({ kind: 'pods', node: selectedNode.name });
  };
  const back = () => {
    if (view.kind === 'describe') go({ kind: 'pods' });
    else if (view.kind === 'pods' && view.node) go({ kind: 'nodes' });
    else if (view.kind !== 'pods') go({ kind: 'pods' });
  };
  const runCommand = (raw: string) => {
    const kind = COMMANDS[raw.trim().replace(/^:/, '').toLowerCase()];
    if (kind && kind !== 'describe') go({ kind } as View);
    else if (raw.trim()) notify(`\`${raw.trim()}\` command not found`, true);
    setPrompt(null);
    rootRef.current?.focus();
  };

  const hints: Hint[] =
    view.kind === 'pods'
      ? [
          { keys: '<ctrl-d>', label: 'Delete', run: () => selectedPod && setConfirm(selectedPod) },
          { keys: '<ctrl-k>', label: 'Kill', run: () => kill(selectedPod) },
          { keys: '<d>', label: 'Describe', run: describe },
          { keys: '<:>', label: 'Command', run: () => setPrompt('') },
          ...(view.node ? [{ keys: '<esc>', label: 'Back', run: back }] : []),
        ]
      : view.kind === 'nodes'
        ? [
            { keys: '<c>', label: 'Cordon', run: cordon },
            { keys: '<u>', label: 'Uncordon', run: uncordon },
            { keys: '<r>', label: 'Drain', run: drain },
            { keys: '<enter>', label: 'Pods', run: enter },
            { keys: '<:>', label: 'Command', run: () => setPrompt('') },
          ]
        : [
            { keys: '<esc>', label: 'Back', run: back },
            { keys: '<:>', label: 'Command', run: () => setPrompt('') },
          ];

  const onKeyDown = (event: KeyboardEvent) => {
    if (prompt !== null) return;
    if (confirm) {
      if (event.key === 'Enter') {
        kill(confirm);
        setConfirm(null);
      } else if (event.key === 'Escape') {
        setConfirm(null);
      }
      event.preventDefault();
      return;
    }
    const key = event.key.toLowerCase();
    if (event.ctrlKey && (key === 'k' || key === 'd')) {
      // Keep ctrl-k away from the site-wide command palette
      event.preventDefault();
      event.stopPropagation();
      if (key === 'k') kill(selectedPod);
      else if (selectedPod) setConfirm(selectedPod);
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const actions: Record<string, () => void> = {
      arrowdown: () => setSelected(Math.min(sel + 1, rowCount - 1)),
      j: () => setSelected(Math.min(sel + 1, rowCount - 1)),
      arrowup: () => setSelected(Math.max(sel - 1, 0)),
      k: () => setSelected(Math.max(sel - 1, 0)),
      enter,
      escape: back,
      ':': () => setPrompt(''),
      ...(view.kind === 'pods' ? { d: describe } : {}),
      ...(view.kind === 'nodes' ? { c: cordon, u: uncordon, r: drain } : {}),
    };
    const action = actions[key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  // ----- header info -----
  const running = state.pods.filter((p) => p.status === 'Running').length;
  const info: [string, string][] = [
    ['Context', 'lab'],
    ['Cluster', copy.cluster],
    ['User', 'stephane'],
    ['K8s Rev', 'v1.34'],
    ['CPU', `${8 + running * 3}%`],
    ['MEM', `${20 + Math.round(running * 2.5)}%`],
  ];

  const title =
    view.kind === 'pods'
      ? ['Pods', view.node ?? 'default', pods.length]
      : view.kind === 'nodes'
        ? ['Nodes', 'all', state.nodes.length]
        : view.kind === 'events'
          ? ['Events', 'default', state.events.length]
          : ['Describe', `default/${view.id}`, null];

  const crumbs = view.kind === 'describe' ? ['pods', 'describe'] : view.kind === 'pods' && view.node ? ['nodes', view.node, 'pods'] : [view.kind];

  const hintButtons = (className: string) => (
    <div className={className}>
      {hints.map((hint) => (
        <button
          key={hint.keys}
          type="button"
          tabIndex={-1}
          onMouseDown={(event) => event.preventDefault()}
          onClick={hint.run}
          className="flex gap-2 text-left whitespace-nowrap hover:text-(--t-fg)"
        >
          <span className="text-(--t-blue)">{hint.keys}</span>
          <span className="text-(--t-dim)">{hint.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      role="application"
      aria-label={copy.aria}
      onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={(event) => !rootRef.current?.contains(event.relatedTarget as Node | null) && setFocused(false)}
      className="k9s relative flex h-[540px] flex-col overflow-hidden rounded-xl border border-line bg-(--t-bg) font-mono text-[11px] leading-[1.55] text-(--t-fg) outline-none focus-visible:ring-2 focus-visible:ring-accent sm:h-[520px] sm:text-[12.5px]"
    >
      {/* window chrome */}
      <div className="flex items-center gap-3 border-b border-white/10 px-3 py-2 text-(--t-dim)">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
        </span>
        <span className="flex-1 text-center">k9s · stephane@sdedu-lab</span>
        <span className={focused ? 'text-(--t-aqua)' : ''}>{focused ? '● focus' : copy.idle}</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3 sm:p-4">
        {/* header: info · hints · logo */}
        <div className="flex gap-6">
          <dl className="grid shrink-0 grid-cols-[auto_auto] gap-x-3">
            {info.map(([k, v], i) => (
              <div key={k} className={`contents ${i > 1 ? 'max-sm:hidden' : ''}`}>
                <dt className="text-(--t-orange)">{k}:</dt>
                <dd className="text-(--t-fg)">{v}</dd>
              </div>
            ))}
          </dl>
          {hintButtons('hidden flex-1 grid-cols-2 content-start gap-x-6 sm:grid lg:grid-cols-3')}
          <pre className="hidden text-[10px] leading-[1.3] text-(--t-orange) lg:block" aria-hidden="true">
            {LOGO}
          </pre>
        </div>

        {prompt !== null && (
          <div className="flex items-center gap-2 rounded border border-(--t-blue) px-2 py-0.5">
            <span className="text-(--t-orange)">:</span>
            <input
              autoFocus
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') runCommand(prompt);
                if (event.key === 'Escape') {
                  setPrompt(null);
                  rootRef.current?.focus();
                }
              }}
              placeholder="pods | nodes | events"
              aria-label="Commande k9s"
              className="flex-1 bg-transparent text-(--t-fg) outline-none placeholder:text-(--t-dim)"
            />
          </div>
        )}

        {/* main box, titled in its border like k9s */}
        <fieldset className="relative flex min-h-0 flex-1 flex-col rounded border border-(--t-blue)/70 px-2 pb-1">
          <legend className="mx-auto px-1">
            <span className="text-(--t-aqua)">{title[0]}</span>
            <span className="text-(--t-magenta)">({title[1]})</span>
            {title[2] !== null && <span className="text-(--t-fg)">[{title[2]}]</span>}
          </legend>

          {view.kind === 'pods' && (
            <Table
              rows={pods}
              selected={sel}
              onSelect={setSelected}
              onOpen={(i) => go({ kind: 'describe', id: pods[i].id })}
              rowKey={(p) => p.id}
              rowClass={(p) => statusColor[p.status]}
              columns={[
                { label: 'NAME↑', width: 'minmax(0,26ch)', mobile: 'minmax(0,1fr)', cell: (p) => p.id },
                { label: 'READY', width: '6ch', cell: (p) => (p.status === 'Running' ? '1/1' : '0/1') },
                { label: 'STATUS', width: '18ch', mobile: '13ch', cell: (p) => p.status },
                { label: 'RESTARTS', width: '9ch', cell: () => '0' },
                { label: 'IP', width: '12ch', cell: (p) => (p.node ? ipFor(p, state.nodes) : '<none>') },
                { label: 'NODE', width: '8ch', mobile: '7ch', cell: (p) => p.node ?? '<none>' },
                { label: 'AGE', width: 'minmax(0,1fr)', cell: (p) => age(now, p.createdAt) },
              ]}
            />
          )}

          {view.kind === 'nodes' && (
            <Table
              rows={state.nodes}
              selected={sel}
              onSelect={setSelected}
              onOpen={(i) => go({ kind: 'pods', node: state.nodes[i].name })}
              rowKey={(n) => n.name}
              rowClass={(n) => (n.cordoned ? 'text-(--t-yellow)' : 'text-(--t-aqua)')}
              columns={[
                { label: 'NAME↑', width: '10ch', mobile: '8ch', cell: (n) => n.name },
                {
                  label: 'STATUS',
                  width: '28ch',
                  mobile: 'minmax(0,1fr)',
                  cell: (n) => (n.cordoned ? 'Ready,SchedulingDisabled' : 'Ready'),
                },
                { label: 'ROLES', width: '8ch', cell: () => '<none>' },
                { label: 'VERSION', width: '10ch', cell: () => 'v1.34.1' },
                { label: 'PODS', width: '6ch', mobile: '5ch', cell: (n) => `${load(state.pods, n.name)}/${CAPACITY}` },
                { label: 'AGE', width: 'minmax(0,1fr)', cell: () => '14d' },
              ]}
            />
          )}

          {view.kind === 'events' && (
            <Table
              rows={state.events}
              selected={sel}
              onSelect={setSelected}
              rowKey={(e: ClusterEvent) => e.id}
              rowClass={(e) => (e.type === 'Warning' ? 'text-(--t-yellow)' : 'text-(--t-aqua)')}
              columns={[
                { label: 'LAST SEEN', width: '10ch', mobile: '6ch', cell: (e) => (e.at ? age(now, e.at) : '14d') },
                { label: 'TYPE', width: '8ch', cell: (e) => e.type },
                { label: 'REASON', width: '19ch', mobile: '17ch', cell: (e) => e.reason },
                { label: 'OBJECT', width: '32ch', mobile: 'minmax(0,1fr)', cell: (e) => e.object },
                { label: 'MESSAGE', width: 'minmax(0,1fr)', cell: (e) => e.message },
              ]}
            />
          )}

          {view.kind === 'describe' && <Describe state={state} id={view.id} now={now} copy={copy} />}

          {confirm && (
            <div className="absolute inset-0 grid place-items-center bg-(--t-bg)/70">
              <div className="w-[min(92%,440px)] rounded border border-(--t-blue) bg-(--t-bg) p-4 text-center">
                <p className="text-(--t-orange)">&lt;Delete&gt;</p>
                <p className="mt-2 break-all">Delete pod default/{confirm.id}?</p>
                <div className="mt-4 flex justify-center gap-3">
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setConfirm(null)}
                    className="px-3 text-(--t-dim) hover:text-(--t-fg)"
                  >
                    [ Cancel ]
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      kill(confirm);
                      setConfirm(null);
                    }}
                    className="bg-(--t-aqua) px-3 text-(--t-bg)"
                  >
                    [ OK ]
                  </button>
                </div>
              </div>
            </div>
          )}
        </fieldset>

        {hintButtons('flex flex-wrap gap-x-4 gap-y-1 sm:hidden')}

        {/* crumbs, flash message, view shortcuts */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            {crumbs.map((crumb, i) => (
              <span
                key={crumb}
                className={`px-1.5 ${i === crumbs.length - 1 ? 'bg-(--t-orange) text-(--t-bg)' : 'bg-(--t-blue) text-(--t-bg)'}`}
              >
                &lt;{crumb}&gt;
              </span>
            ))}
            {flash && (
              <span className={`truncate pl-2 ${flash.warn ? 'text-(--t-red)' : 'text-(--t-aqua)'}`}>{flash.text}</span>
            )}
          </div>
          <div className="flex shrink-0 gap-3 text-(--t-dim)">
            {(['pods', 'nodes', 'events'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => go({ kind } as View)}
                className={view.kind === kind ? 'text-(--t-fg)' : 'hover:text-(--t-fg)'}
              >
                :{kind}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Describe({ state, id, now, copy }: { state: State; id: string; now: number; copy: (typeof COPY)['en'] }) {
  const pod = state.pods.find((p) => p.id === id);
  if (!pod) {
    return <p className="p-2 text-(--t-red)">pod/{id} {copy.notFound}</p>;
  }
  const events = state.events.filter((e) => e.object === `pod/${pod.id}`).slice(0, 4);
  const lines: [string, string, number?][] = [
    ['Name', pod.id],
    ['Namespace', 'default'],
    ['Node', pod.node ? `${pod.node}/${ipFor(pod, state.nodes)}` : '<none>'],
    ['Labels', `app=${pod.app}`],
    ['', `pod-template-hash=${APPS[pod.app].replicaSet.split('-')[1]}`],
    ['Status', pod.status],
    ['IP', pod.node ? ipFor(pod, state.nodes) : '<none>'],
    ['Controlled By', `ReplicaSet/${APPS[pod.app].replicaSet}`],
    ['Containers', ''],
    [`${pod.app}`, '', 1],
    ['Image', `registry.local/${pod.app}:1.0.0`, 2],
    ['State', pod.status === 'Running' ? 'Running' : 'Waiting', 2],
    ['Ready', pod.status === 'Running' ? 'True' : 'False', 2],
    ['Restart Count', '0', 2],
  ];
  return (
    <div className="min-h-0 flex-1 overflow-hidden px-1">
      {lines.map(([key, value, indent = 0], i) => (
        <div key={i} className="flex gap-2" style={{ paddingLeft: `${indent * 2}ch` }}>
          <span className="w-[16ch] shrink-0 text-(--t-blue)">{key ? `${key}:` : ''}</span>
          <span className="truncate">{value}</span>
        </div>
      ))}
      <div className="mt-1 text-(--t-blue)">Events:</div>
      {events.length === 0 ? (
        <div className="pl-[2ch] text-(--t-dim)">&lt;none&gt;</div>
      ) : (
        events.map((e) => (
          <div key={e.id} className="truncate pl-[2ch]">
            <span className="text-(--t-dim)">{age(now, e.at).padEnd(7)}</span> {e.reason.padEnd(17)} {e.message}
          </div>
        ))
      )}
      <p className="mt-1 text-(--t-dim)">{copy.back}</p>
    </div>
  );
}
