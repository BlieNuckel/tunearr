import { createHash } from "crypto";
import { getDataSource } from "./index";
import {
  UserProfile,
  DERIVED_PROFILE_SCHEMA_VERSION,
  type DerivedProfile,
} from "./entity/UserProfile";
import { UserSignalEvent } from "./entity/UserSignalEvent";

/** The config fields that shape the derived profile and thus invalidate it on change. */
export type ProfileConfigInputs = {
  topArtistsRange: string;
  genericTags: string[];
  tagsPerArtist: number;
  pickedArtistsCount: number;
};

const EMPTY_DERIVED_PROFILE: DerivedProfile = {
  genreVector: [],
  explorationHistory: { albums: [], artists: [] },
};

export function serializeDerivedProfile(profile: DerivedProfile): string {
  return JSON.stringify(profile);
}

/**
 * Parse a stored `profile_json`. Returns an empty profile when the stored shape is
 * unreadable so callers never crash on a corrupt/legacy row — a regenerate replaces it.
 */
export function parseDerivedProfile(json: string): DerivedProfile {
  try {
    const parsed = JSON.parse(json) as Partial<DerivedProfile>;
    return {
      genreVector: parsed.genreVector ?? [],
      explorationHistory: {
        albums: parsed.explorationHistory?.albums ?? [],
        artists: parsed.explorationHistory?.artists ?? [],
      },
    };
  } catch {
    return { ...EMPTY_DERIVED_PROFILE };
  }
}

/** Stable hash of the config inputs that shape the vector — a mismatch forces a regenerate. */
export function computeConfigHash(inputs: ProfileConfigInputs): string {
  const stable = JSON.stringify({
    topArtistsRange: inputs.topArtistsRange,
    genericTags: [...inputs.genericTags].map((t) => t.toLowerCase()).sort(),
    tagsPerArtist: inputs.tagsPerArtist,
    pickedArtistsCount: inputs.pickedArtistsCount,
  });
  return createHash("sha256").update(stable).digest("hex");
}

export async function getUserProfile(
  userId: number
): Promise<UserProfile | null> {
  const repo = getDataSource().getRepository(UserProfile);
  return repo.findOne({ where: { user_id: userId } });
}

/**
 * Insert or replace the derived profile for a user. Stamps `generated_at` and
 * `last_used_at` to now and writes the current {@link DERIVED_PROFILE_SCHEMA_VERSION}.
 */
export async function upsertUserProfile(
  userId: number,
  profile: DerivedProfile,
  configHash: string
): Promise<UserProfile> {
  const repo = getDataSource().getRepository(UserProfile);
  const now = new Date().toISOString();
  const existing = await repo.findOne({ where: { user_id: userId } });

  const entity = repo.create({
    ...(existing ?? {}),
    user_id: userId,
    profile_json: serializeDerivedProfile(profile),
    schema_version: DERIVED_PROFILE_SCHEMA_VERSION,
    config_hash: configHash,
    generated_at: now,
    last_used_at: now,
  });

  return repo.save(entity);
}

export async function touchProfileUsed(userId: number): Promise<void> {
  const repo = getDataSource().getRepository(UserProfile);
  await repo.update(
    { user_id: userId },
    { last_used_at: new Date().toISOString() }
  );
}

export async function appendSignalEvent(
  userId: number,
  kind: string,
  payload: unknown
): Promise<UserSignalEvent> {
  const repo = getDataSource().getRepository(UserSignalEvent);
  const entity = repo.create({
    user_id: userId,
    kind,
    payload: JSON.stringify(payload),
    recorded_at: new Date().toISOString(),
  });
  return repo.save(entity);
}

export async function getSignalEvents(
  userId: number,
  kind?: string
): Promise<UserSignalEvent[]> {
  const repo = getDataSource().getRepository(UserSignalEvent);
  return repo.find({
    where: kind ? { user_id: userId, kind } : { user_id: userId },
    order: { recorded_at: "ASC", id: "ASC" },
  });
}
