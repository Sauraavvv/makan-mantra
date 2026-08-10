import { randomInt } from "crypto";
import type { Collection, Document, OptionalUnlessRequiredId } from "mongodb";

/** Eight digits, never leading zero, so a PID is always readable over a call. */
const PID_MIN = 10_000_000;
const PID_MAX = 99_999_999;

const MAX_ATTEMPTS = 8;
const DUPLICATE_KEY = 11000;

export function randomPid() {
  return String(randomInt(PID_MIN, PID_MAX + 1));
}

function isDuplicateKeyError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === DUPLICATE_KEY;
}

/**
 * Inserts a document under a freshly minted PID.
 *
 * Checking for a free id and then inserting it leaves a gap two requests can
 * both walk through, so the insert itself is the check: a unique index on `pid`
 * rejects a collision and the next attempt draws again.
 */
export async function insertWithPid<T extends Document>(
  collection: Collection<T>,
  build: (pid: string) => OptionalUnlessRequiredId<T>,
) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const pid = randomPid();

    try {
      const result = await collection.insertOne(build(pid));
      return { pid, insertedId: result.insertedId };
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
  }

  throw new Error("Could not allocate a property id");
}
