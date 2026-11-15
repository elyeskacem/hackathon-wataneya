import { config } from '../../config';
import { asset, type MomentId } from '../../data/moments';
import type { Localized } from '../../i18n/useT';

/** Positions are fractions of the room render (u from the left, v from the top). */
export interface CharacterConfig {
  id: string;
  name: Localized;
  /** null draws a silhouette placeholder (no approved cut-out yet). */
  image: string | null;
  imageAspect: number;
  /** Where the feet touch the floor in the render. */
  u: number;
  v: number;
  depth: number;
  /** Character height as a share of the render's height. */
  heightShare: number;
  /** Where the talk ring sits, as a fraction of the cut-out (beside the head). */
  ring: { u: number; v: number };
  /** Guide knowledge entry used by «احكيلي على …». */
  entryId: string;
}

export interface DoorConfig {
  to: string;
  u: number;
  v: number;
}

export interface RoomConfig {
  id: string;
  name: Localized;
  backdrop: string;
  aspect: number;
  /** Horizontal point of interest; narrow screens turn the camera toward it. */
  focusU: number;
  characters: CharacterConfig[];
  doors: DoorConfig[];
  /** A spot in the room that moves the camera closer (e.g. the front row), and the way back. */
  viewpoint?: { label: Localized; backLabel: Localized; u: number; v: number; dolly: number };
}

export interface SceneConfig {
  momentId: MomentId;
  rooms: RoomConfig[];
  /** Placeholder subtitle for the room sound (real recordings pending). */
  ambientLine?: Localized;
}

const SLIMAN: CharacterConfig = {
  id: 'sliman',
  name: { ar: 'سليمان', fr: 'Sliman', en: 'Sliman', zh: 'Sliman' },
  image: asset('renders/char-sliman.webp'),
  imageAspect: 636 / 1200,
  u: 0.3,
  v: 0.98,
  depth: 5,
  heightShare: 0.78,
  ring: { u: 0.66, v: 0.12 },
  entryId: 'character-sliman',
};

const SBOU3I: CharacterConfig = {
  id: 'sbou3i',
  name: { ar: 'السبوعي', fr: 'Sbou3i', en: 'Sbou3i', zh: 'Sbou3i' },
  image: asset('renders/char-sbou3i.webp'),
  imageAspect: 798 / 883,
  u: 0.68,
  v: 0.97,
  depth: 6,
  heightShare: 0.46,
  ring: { u: 0.72, v: 0.12 },
  entryId: 'character-sbou3i',
};

const FOCHIKA: CharacterConfig = {
  id: 'fochika',
  name: { ar: 'فوشيكة', fr: 'Fochika', en: 'Fochika', zh: 'Fochika' },
  image: null,
  imageAspect: 0.42,
  u: 0.3,
  v: 0.88,
  depth: 7,
  heightShare: 0.36,
  ring: { u: 0.9, v: 0.12 },
  entryId: 'choufli-characters',
};

const OM_KALTHOUM: CharacterConfig = {
  id: 'om-kalthoum',
  name: { ar: 'أم كلثوم', fr: 'Oum Kalthoum', en: 'Oum Kalthoum', zh: '乌姆·库勒苏姆' },
  image: asset('renders/char-om-kalthoum.webp'),
  imageAspect: 665 / 709,
  u: 0.5,
  v: 0.64,
  depth: 8,
  heightShare: 0.14,
  ring: { u: 0.8, v: 0.1 },
  entryId: 'kalthoum-concert',
};

export const SCENES: Partial<Record<MomentId, SceneConfig>> = {
  'choufli-hal': {
    momentId: 'choufli-hal',
    rooms: [
      {
        id: 'office',
        name: { ar: 'البيرو', fr: 'le bureau', en: 'the office', zh: '办公室' },
        backdrop: asset('renders/choufli-office.webp'),
        aspect: 849 / 545,
        focusU: 0.45,
        characters: [SLIMAN],
        doors: [{ to: 'corridor', u: 0.56, v: 0.5 }],
      },
      {
        id: 'corridor',
        name: { ar: 'الكولوار', fr: 'le couloir', en: 'the corridor', zh: '走廊' },
        backdrop: asset('renders/choufli-corridor.webp'),
        aspect: 865 / 544,
        focusU: 0.42,
        characters: [],
        doors: [
          { to: 'kitchen', u: 0.52, v: 0.48 },
          { to: 'office', u: 0.32, v: 0.56 },
        ],
      },
      {
        id: 'kitchen',
        name: { ar: 'الكوجينة', fr: 'la cuisine', en: 'the kitchen', zh: '厨房' },
        backdrop: asset('renders/choufli-kitchen.webp'),
        aspect: 851 / 531,
        focusU: 0.45,
        characters: [
          SBOU3I,
          FOCHIKA,
        ],
        doors: [{ to: 'corridor', u: 0.2, v: 0.45 }],
      },
    ],
  },
  'om-kalthoum': {
    momentId: 'om-kalthoum',
    rooms: [
      {
        id: 'hall',
        name: { ar: 'القاعة', fr: 'la salle', en: 'the hall', zh: '音乐厅' },
        backdrop: asset('renders/kalthoum-hall.webp'),
        aspect: 1600 / 900,
        focusU: 0.5,
        // Real person: shown only when the team turns the flag on (docs/PLAN.md §6.6).
        characters: config.showOmKalthoumFigure
          ? [OM_KALTHOUM]
          : [],
        doors: [],
        viewpoint: {
          label: { ar: 'الصف الأول', fr: 'Premier rang', en: 'Front row', zh: '前排' },
          backLabel: { ar: 'القاعة كاملة', fr: 'Toute la salle', en: 'Whole hall', zh: '整个大厅' },
          u: 0.5,
          v: 0.72,
          dolly: 3.2,
        },
      },
    ],
    ambientLine: {
      ar: '[موسيقى] صوت تجريبي · تسجيل الحفلة الأصلي يجي من أرشيف الوطنية.',
      fr: '[musique] son provisoire · l’enregistrement original viendra des archives Wataniya.',
      en: '[music] placeholder sound · the original recording will come from the Wataniya archive.',
      zh: '[音乐] 临时音效 · 原始录音将来自 Wataniya 档案。',
    },
  },
};

export function roomOf(scene: SceneConfig, roomId: string | undefined): RoomConfig {
  return scene.rooms.find((r) => r.id === roomId) ?? scene.rooms[0]!;
}

/** Every image a scene needs; also used to warm the cache before the visitor arrives. */
export function sceneUrls(scene: SceneConfig): string[] {
  return [...scene.rooms.map((r) => r.backdrop), ...scene.rooms.flatMap((r) => r.characters.map((c) => c.image).filter((u): u is string => u !== null))];
}

/** Name and guide entry of a character, whichever scene form shows it (2.5D, GLB or Unity). Unknown ids still get a card. */
export function characterInfo(id: string): Pick<CharacterConfig, 'id' | 'name' | 'entryId'> {
  const known = [SLIMAN, SBOU3I, FOCHIKA, OM_KALTHOUM].find((c) => c.id === id);
  if (known) return known;
  const name = id.replace(/[-_]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  return { id, name: { ar: name, fr: name, en: name, zh: name }, entryId: `character-${id}` };
}

/** Display name of a room: from the 2.5D scene when it knows the room, otherwise the id. */
export function roomName(momentId: MomentId, roomId: string): Localized {
  const known = SCENES[momentId]?.rooms.find((r) => r.id === roomId);
  return known?.name ?? { ar: roomId, fr: roomId, en: roomId, zh: roomId };
}
