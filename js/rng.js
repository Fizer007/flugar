// Детерминированный ГСЧ: одинаковый seed у обоих игроков => одинаковые комнаты
export function hash(...nums) {
  let h = 2166136261 >>> 0;
  for (const n of nums) {
    h ^= (n | 0);
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  return h >>> 0;
}

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
