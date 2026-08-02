/**
 * Mirror a query's membership into a plain array.
 *
 * elics keeps query membership in a Set, and `for (const e of query.entities)`
 * allocates a SetIterator every time it runs - which, in a system's update, is
 * once per query per frame for the life of the app. Membership only changes
 * when an entity qualifies or disqualifies, so mirroring it into an array and
 * walking that with an index costs nothing per frame and the bookkeeping runs
 * only on the rare transitions.
 *
 * `includes`, `indexOf` and `splice` here are fine precisely because they never
 * run in the frame loop.
 *
 * Returns the teardown functions; push them onto the system's `cleanupFuncs`.
 */

import type { Entity } from '@iwsdk/core';

/** The slice of elics' Query that this needs, structurally. */
interface QueryLike {
  subscribe(
    event: 'qualify' | 'disqualify',
    callback: (entity: Entity) => void,
    replayExisting?: boolean,
  ): () => void;
}

export function mirrorQuery(query: QueryLike, out: Entity[]): Array<() => void> {
  return [
    // replayExisting, so anything that already matched is picked up.
    query.subscribe(
      'qualify',
      (entity) => {
        if (!out.includes(entity)) {
          out.push(entity);
        }
      },
      true,
    ),
    query.subscribe('disqualify', (entity) => {
      const index = out.indexOf(entity);
      if (index !== -1) {
        out.splice(index, 1);
      }
    }),
  ];
}
