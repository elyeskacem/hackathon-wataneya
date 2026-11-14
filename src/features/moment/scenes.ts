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
  characters: CharacterConfig[];
  doors: DoorConfig[];
  /** A spot in the room that moves the camera closer (e.g. the front row), and the way back. */
  viewpoint?: { label: Localized; backLabel: Localized; u: number; v: number; dolly: number };
  /** An object in the scene that opens the archive viewer. */
  archiveSpot?: { u: number; v: number };
}

export interface SceneConfig {
  momentId: MomentId;
  rooms: RoomConfig[];
  /** Placeholder line for the archive subtitle band (real recordings pending). */
  archiveLine?: Localized;
}

const SLIMAN: CharacterConfig = {
  id: 'sliman',
  name: { ar: 'سليمان', fr: 'Sliman' },
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
  name: { ar: 'السبوعي', fr: 'Sbou3i' },
  image: asset('renders/char-sbou3i.webp'),
  imageAspect: 798 / 883,
  u: 0.68,
  v: 0.97,
  depth: 6,
  heightShare: 0.46,
  ring: { u: 0.72, v: 0.12 },
  entryId: 'character-sbou3i',
};

export const SCENES: Partial<Record<MomentId, SceneConfig>> = {
  'choufli-hal': {
    momentId: 'choufli-hal',
    rooms: [
      {
        id: 'office',
        name: { ar: 'البيرو', fr: 'le bureau' },
        backdrop: asset('renders/choufli-office.webp'),
        aspect: 849 / 545,
        characters: [SLIMAN],
        doors: [{ to: 'corridor', u: 0.56, v: 0.5 }],
      },
      {
        id: 'corridor',
        name: { ar: 'الكولوار', fr: 'le couloir' },
        backdrop: asset('renders/choufli-corridor.webp'),
        aspect: 865 / 544,
        characters: [],
        doors: [
          { to: 'kitchen', u: 0.52, v: 0.48 },
          { to: 'office', u: 0.32, v: 0.56 },
        ],
      },
      {
        id: 'kitchen',
        name: { ar: 'الكوجينة', fr: 'la cuisine' },
        backdrop: asset('renders/choufli-kitchen.webp'),
        aspect: 851 / 531,
        characters: [
          SBOU3I,
          {
            id: 'fochika',
            name: { ar: 'فوشيكة', fr: 'Fochika' },
            image: null,
            imageAspect: 0.42,
            u: 0.3,
            v: 0.88,
            depth: 7,
            heightShare: 0.36,
            ring: { u: 0.9, v: 0.12 },
            entryId: 'choufli-characters',
          },
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
        name: { ar: 'القاعة', fr: 'la salle' },
        backdrop: asset('renders/kalthoum-hall.webp'),
        aspect: 1600 / 900,
        // Real person: shown only when the team turns the flag on (docs/PLAN.md §6.6).
        characters: config.showOmKalthoumFigure
          ? [
              {
                id: 'om-kalthoum',
                name: { ar: 'أم كلثوم', fr: 'Oum Kalthoum' },
                image: asset('renders/char-om-kalthoum.webp'),
                imageAspect: 665 / 709,
                u: 0.5,
                v: 0.64,
                depth: 8,
                heightShare: 0.14,
                ring: { u: 0.8, v: 0.1 },
                entryId: 'kalthoum-concert',
              },
            ]
          : [],
        doors: [],
        viewpoint: { label: { ar: 'الصف الأول', fr: 'Premier rang' }, backLabel: { ar: 'القاعة كاملة', fr: 'Toute la salle' }, u: 0.5, v: 0.72, dolly: 3.2 },
        archiveSpot: { u: 0.5, v: 0.52 },
      },
    ],
    archiveLine: {
      ar: '[موسيقى] صوت تجريبي · تسجيل الحفلة الأصلي يجي من أرشيف الوطنية.',
      fr: '[musique] son provisoire · l’enregistrement original viendra des archives Wataniya.',
    },
  },
};

export function roomOf(scene: SceneConfig, roomId: string | undefined): RoomConfig {
  return scene.rooms.find((r) => r.id === roomId) ?? scene.rooms[0]!;
}
