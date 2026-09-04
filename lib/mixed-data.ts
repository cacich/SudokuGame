import { CAMPAIGN } from './campaign-data.ts';
import { mixRegions } from './variants.ts';

// Frozen v1 specs: never change an existing ID after publishing.
const SPECS = [
  { source: 26, pairs: [[1, 2]], size: 6, score: 106 },
  { source: 23, pairs: [[0, 1]], size: 6, score: 220 },
  { source: 27, pairs: [[0, 2]], size: 6, score: 220 },
  { source: 39, pairs: [[2, 4]], size: 6, score: 220 },
  { source: 30, pairs: [[0, 1]], size: 6, score: 227 },
  { source: 44, pairs: [[1, 2]], size: 6, score: 227 },
  { source: 48, pairs: [[0, 2]], size: 6, score: 227 },
  { source: 20, pairs: [[1, 2]], size: 6, score: 234 },
  { source: 31, pairs: [[1, 2]], size: 6, score: 234 },
  { source: 33, pairs: [[0, 3]], size: 6, score: 234 },
  { source: 37, pairs: [[0, 5]], size: 6, score: 234 },
  { source: 54, pairs: [[1, 2]], size: 6, score: 234 },
  { source: 47, pairs: [[0, 1]], size: 6, score: 241 },
  { source: 52, pairs: [[0, 2]], size: 6, score: 247 },
  { source: 56, pairs: [[1, 2]], size: 6, score: 248 },
  { source: 50, pairs: [[1, 2]], size: 6, score: 255 },
  { source: 59, pairs: [[1, 2]], size: 6, score: 275 },
  {
    source: 98,
    pairs: [
      [0, 2],
      [1, 3],
    ],
    size: 7,
    score: 213,
  },
  {
    source: 86,
    pairs: [
      [0, 2],
      [1, 3],
    ],
    size: 7,
    score: 220,
  },
  {
    source: 61,
    pairs: [
      [0, 1],
      [3, 5],
    ],
    size: 7,
    score: 221,
  },
  {
    source: 74,
    pairs: [
      [0, 3],
      [2, 4],
    ],
    size: 7,
    score: 221,
  },
  {
    source: 60,
    pairs: [
      [0, 1],
      [3, 6],
    ],
    size: 7,
    score: 227,
  },
  {
    source: 92,
    pairs: [
      [0, 1],
      [3, 5],
    ],
    size: 7,
    score: 227,
  },
  {
    source: 70,
    pairs: [
      [0, 1],
      [4, 5],
    ],
    size: 7,
    score: 228,
  },
  {
    source: 93,
    pairs: [
      [0, 1],
      [5, 6],
    ],
    size: 7,
    score: 228,
  },
  {
    source: 79,
    pairs: [
      [0, 1],
      [2, 4],
    ],
    size: 7,
    score: 235,
  },
  {
    source: 69,
    pairs: [
      [0, 2],
      [1, 4],
    ],
    size: 7,
    score: 241,
  },
  {
    source: 73,
    pairs: [
      [0, 1],
      [4, 5],
    ],
    size: 7,
    score: 242,
  },
  {
    source: 80,
    pairs: [
      [1, 2],
      [3, 4],
    ],
    size: 7,
    score: 242,
  },
  {
    source: 97,
    pairs: [
      [0, 1],
      [3, 4],
    ],
    size: 7,
    score: 242,
  },
  {
    source: 88,
    pairs: [
      [0, 1],
      [3, 6],
    ],
    size: 7,
    score: 249,
  },
  {
    source: 87,
    pairs: [
      [0, 3],
      [1, 4],
    ],
    size: 7,
    score: 256,
  },
  {
    source: 144,
    pairs: [
      [0, 1],
      [3, 4],
      [5, 7],
    ],
    size: 8,
    score: 213,
  },
  {
    source: 111,
    pairs: [
      [1, 5],
      [2, 4],
      [3, 6],
    ],
    size: 8,
    score: 214,
  },
  {
    source: 117,
    pairs: [
      [1, 2],
      [3, 4],
      [5, 6],
    ],
    size: 8,
    score: 222,
  },
  {
    source: 136,
    pairs: [
      [0, 2],
      [1, 6],
      [3, 5],
    ],
    size: 8,
    score: 228,
  },
  {
    source: 139,
    pairs: [
      [0, 1],
      [2, 6],
      [4, 5],
    ],
    size: 8,
    score: 243,
  },
  {
    source: 180,
    pairs: [
      [1, 2],
      [3, 6],
      [4, 7],
    ],
    size: 9,
    score: 229,
  },
  {
    source: 178,
    pairs: [
      [1, 2],
      [3, 6],
      [4, 7],
    ],
    size: 9,
    score: 236,
  },
  {
    source: 193,
    pairs: [
      [1, 4],
      [2, 5],
      [7, 8],
    ],
    size: 9,
    score: 272,
  },
];
export const MIXED = SPECS.map((spec, index) => ({
  ...mixRegions(CAMPAIGN[spec.source], spec.pairs),
  id: `mixed-v1-${String(index + 1).padStart(3, '0')}`,
  difficulty: { score: spec.score, size: spec.size },
}));
