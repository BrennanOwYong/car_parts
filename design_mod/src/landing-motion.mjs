export const clamp01 = value => Math.max(0, Math.min(1, value));
export function easeRange(value, start, end) {
  const t = clamp01((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}
// All phases derive from the same scroll position, so reversing scroll is exact.
export function landingMotion(progress, reduced = false) {
  const p = clamp01(progress);
  return {
    explode: reduced ? 0 : easeRange(p, .08, .60),
    turn: reduced ? 0 : easeRange(p, .025, .58),
    opening: 1 - easeRange(p, .03, .19),
    chapter: easeRange(p, .2, .33) * (1 - easeRange(p, .64, .76)),
    reveal: easeRange(p, .78, .95),
    blur: easeRange(p, .72, .92),
    cue: 1 - easeRange(p, .015, .13),
  };
}
