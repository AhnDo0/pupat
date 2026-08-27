/**
 * 조사 처리.
 * 부위 이름이 품종·문구마다 바뀌므로, 받침 유무에 따라 조사를 골라 준다.
 */
function hasFinalConsonant(word: string): boolean {
  const code = word.charCodeAt(word.length - 1);
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

/** 은/는 */
export function topic(word: string): string {
  return `${word}${hasFinalConsonant(word) ? '은' : '는'}`;
}

/** 을/를 */
export function object(word: string): string {
  return `${word}${hasFinalConsonant(word) ? '을' : '를'}`;
}
