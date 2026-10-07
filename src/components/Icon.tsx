import { ReactElement, SVGProps } from 'react';

export type IconName =
  | 'check'
  | 'cross'
  | 'reset'
  | 'teams'
  | 'chevron'
  | 'menu'
  | 'sound'
  | 'mute'
  | 'stamina'
  | 'goal'
  | 'search'
  | 'grid'
  | 'list'
  | 'attack'
  | 'balance'
  | 'shield'
  | 'ball'
  | 'card'
  | 'glove'
  | 'flame'
  | 'whistle'
  | 'trophy'
  | 'play'
  | 'pause'
  | 'forward'
  | 'skip'
  | 'post'
  | 'target'
  | 'assist'
  | 'injury'
  | 'tactic'
  | 'share'
  | 'download'
  | 'copy'
  | 'brand-x'
  | 'brand-whatsapp'
  | 'brand-instagram'
  | 'dice'
  | 'arrow'
  | 'heart';

const paths: Record<IconName, ReactElement> = {
  check: <path d="M4 11l4 4 8-9" />,
  cross: <path d="M5 5l10 10M15 5L5 15" />,
  reset: (
    <>
      <path d="M4 10a6 6 0 1 1 2 4.5" />
      <path d="M4 15v-5h5" />
    </>
  ),
  teams: (
    <>
      <circle cx="7" cy="6" r="2.5" />
      <circle cx="14" cy="6" r="2.5" />
      <path d="M3 16v-3a4 4 0 0 1 8 0v3" />
      <path d="M10 16v-3a4 4 0 0 1 8 0v3" />
    </>
  ),
  chevron: <path d="M5 8l5 5 5-5" />,
  menu: <path d="M3 5h14M3 10h14M3 15h14" />,
  sound: (
    <>
      <path d="M3 8h3l5-4v12l-5-4H3z" />
      <path d="M14 7a4 4 0 0 1 0 6M16 4.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  mute: (
    <>
      <path d="M3 8h3l5-4v12l-5-4H3z" />
      <path d="M14 8l4 4M18 8l-4 4" />
    </>
  ),
  stamina: (
    <>
      <path d="M3 6h12v8H3z" />
      <path d="M17 9v2" />
      <path d="M5.5 8.5v3M8.5 8.5v3" />
    </>
  ),
  goal: (
    <>
      <path d="M2 16V5h16v11" />
      <path d="M2 9h16M2 12.5h16M6 5v11M10 5v11M14 5v11" strokeWidth={1} />
    </>
  ),
  search: (
    <>
      <circle cx="8.5" cy="8.5" r="5" />
      <path d="M12.5 12.5L17 17" />
    </>
  ),
  grid: <path d="M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z" />,
  list: <path d="M3 4h14M3 8h14M3 12h14M3 16h14" />,
  attack: <path d="M3 5l5 5-5 5M10 5l5 5-5 5" />,
  balance: <path d="M3 7h14M3 13h14" />,
  shield: <path d="M10 2.5l6.5 2.5v4.5c0 4-2.8 6.8-6.5 8-3.7-1.2-6.5-4-6.5-8V5z" />,
  ball: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6.5l3 2.2-1.1 3.6H8.1L7 8.7z" />
      <path d="M10 3v3.5M13 8.7l3.5-1M11.9 12.3l2 3M8.1 12.3l-2 3M7 8.7l-3.5-1" />
    </>
  ),
  card: <rect x="6" y="3" width="8" height="14" fill="currentColor" stroke="none" />,
  glove: (
    <>
      <path d="M6 17V8.5a1.5 1.5 0 0 1 3 0V7a1.5 1.5 0 0 1 3 0v1a1.5 1.5 0 0 1 3 0V13a4 4 0 0 1-4 4z" />
      <path d="M6 11l-2-2" />
    </>
  ),
  flame: <path d="M10 18a5 5 0 0 1-5-5c0-3 2.5-4.5 3-8 2 1.5 3 3 3 5 1-.5 1.5-1.5 1.5-2.5 1.5 1.5 2.5 3.5 2.5 5.5a5 5 0 0 1-5 5z" />,
  whistle: (
    <>
      <circle cx="8" cy="12" r="4.5" />
      <path d="M11 8.5L17 5v4l-5 1.5" />
      <circle cx="8" cy="12" r="1" />
    </>
  ),
  trophy: (
    <>
      <path d="M6 3h8v5a4 4 0 0 1-8 0z" />
      <path d="M6 5H3v1a3 3 0 0 0 3 3M14 5h3v1a3 3 0 0 1-3 3" />
      <path d="M10 12v3M6.5 17h7" />
    </>
  ),
  play: <path d="M6 4l10 6-10 6z" fill="currentColor" stroke="none" />,
  pause: <path d="M6 4h3v12H6zM11 4h3v12h-3z" fill="currentColor" stroke="none" />,
  forward: <path d="M3 5l7 5-7 5zM10 5l7 5-7 5z" fill="currentColor" stroke="none" />,
  skip: (
    <>
      <path d="M4 5l8 5-8 5z" fill="currentColor" stroke="none" />
      <path d="M15 5v10" />
    </>
  ),
  post: (
    <>
      <path d="M4 17V4h12v13" />
      <circle cx="13" cy="13" r="2" />
    </>
  ),
  target: (
    <>
      <circle cx="10" cy="10" r="7" />
      <circle cx="10" cy="10" r="3" />
    </>
  ),
  assist: (
    <>
      <path d="M3 15c3-8 9-10 14-9" />
      <path d="M13 3l4 3-3 4" />
    </>
  ),
  injury: <path d="M8 3h4v5h5v4h-5v5H8v-5H3V8h5z" />,
  tactic: (
    <>
      <path d="M4 6h12M4 14h12" />
      <circle cx="8" cy="6" r="2" />
      <circle cx="12" cy="14" r="2" />
    </>
  ),
  share: (
    <>
      <path d="M10 3v10M6 7l4-4 4 4" />
      <path d="M4 11v6h12v-6" />
    </>
  ),
  download: (
    <>
      <path d="M10 3v10M6 9l4 4 4-4" />
      <path d="M4 17h12" />
    </>
  ),
  copy: (
    <>
      <path d="M7 7h9v10H7z" />
      <path d="M4 13V3h9" />
    </>
  ),
  'brand-x': <path d="M4 4l12 12M16 4L4 16" />,
  'brand-whatsapp': (
    <>
      <path d="M10 3a7 7 0 0 0-6 10.5L3 17l3.6-1A7 7 0 1 0 10 3z" />
      <path d="M7.5 8c0 2.5 2 4.5 4.5 4.5" />
    </>
  ),
  'brand-instagram': (
    <>
      <rect x="3" y="3" width="14" height="14" rx="4" />
      <circle cx="10" cy="10" r="3.2" />
      <path d="M14 6h.01" />
    </>
  ),
  dice: (
    <>
      <rect x="3" y="3" width="14" height="14" />
      <path d="M7 7h.01M13 7h.01M10 10h.01M7 13h.01M13 13h.01" strokeWidth={2.6} />
    </>
  ),
  arrow: <path d="M4 10h11M11 5l5 5-5 5" />,
  heart: <path d="M10 16.5L3.8 10.3a3.6 3.6 0 0 1 5.1-5.1l1.1 1.1 1.1-1.1a3.6 3.6 0 0 1 5.1 5.1z" />,
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
}

/**
 * Set di icone custom, forme geometriche semplici con tratti squadrati.
 */
export function Icon({ name, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
