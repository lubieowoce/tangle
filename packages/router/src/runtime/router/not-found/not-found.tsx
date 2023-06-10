const NOT_FOUND_DIGEST = "__TANGLE_NOT_FOUND__";

type NotFoundError = Error & { digest?: typeof NOT_FOUND_DIGEST };

export function isNotFound(val: unknown): val is NotFoundError {
  if (!(val && typeof val === "object")) {
    return false;
  }
  // oddly enough the digest doesn't seem to come through
  // despite NextJS doing it this way...
  if ("digest" in val && val.digest) {
    return val.digest === NOT_FOUND_DIGEST;
  }
  // ...so fall back to checking the message
  return "message" in val && val.message === NOT_FOUND_DIGEST;
}

export function notFound(): never {
  const err = new Error(NOT_FOUND_DIGEST) as NotFoundError;
  err.digest = NOT_FOUND_DIGEST;
  throw err;
}
