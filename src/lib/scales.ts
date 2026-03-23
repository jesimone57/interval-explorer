export type Temperament = 'equal' | 'pythagorean' | 'just';

export function getScaleRatios(n: number, temperament: Temperament): number[] {
  const ratios: number[] = [];
  
  if (temperament === 'equal') {
    for (let i = 0; i <= n; i++) {
      ratios.push(Math.pow(2, i / n));
    }
  } else if (temperament === 'pythagorean') {
    let pythRatios: number[] = [];
    const minK = -Math.floor((n - 1) / 2);
    const maxK = Math.ceil((n - 1) / 2);
    for (let k = minK; k <= maxK; k++) {
      let ratio = Math.pow(3/2, k);
      while (ratio >= 2) ratio /= 2;
      while (ratio < 1) ratio *= 2;
      pythRatios.push(ratio);
    }
    pythRatios.sort((a, b) => a - b);
    ratios.push(...pythRatios);
    ratios.push(2.0); // Octave
  } else if (temperament === 'just') {
    const justPool = [
      1/1, 25/24, 16/15, 10/9, 9/8, 8/7, 7/6, 32/27, 6/5, 5/4, 81/64, 4/3,
      27/20, 45/32, 64/45, 3/2, 25/16, 8/5, 5/3, 27/16, 16/9, 9/5, 15/8, 243/128, 2/1
    ];
    for (let i = 0; i <= n; i++) {
      if (i === 0) { ratios.push(1); continue; }
      if (i === n) { ratios.push(2); continue; }
      const target = Math.pow(2, i / n);
      let closest = justPool[0];
      let minDiff = Math.abs(justPool[0] - target);
      for (let r of justPool) {
        const diff = Math.abs(r - target);
        if (diff < minDiff) {
          minDiff = diff;
          closest = r;
        }
      }
      ratios.push(closest);
    }
  }
  
  return ratios;
}

export const getIntervalName = (steps: number, totalNotes: number) => {
  if (totalNotes === 12) {
    const names = ['Unison', 'Minor 2nd', 'Major 2nd', 'Minor 3rd', 'Major 3rd', 'Perfect 4th', 'Tritone', 'Perfect 5th', 'Minor 6th', 'Major 6th', 'Minor 7th', 'Major 7th', 'Octave'];
    return names[steps] || `Step ${steps}`;
  }
  if (steps === 0) return 'Unison';
  if (steps === totalNotes) return 'Octave';
  return `Step ${steps}`;
};

export const ratioToCents = (ratio: number) => {
  return 1200 * Math.log2(ratio);
};
