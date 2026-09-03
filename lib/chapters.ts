export const CHAPTERS = [
  {
    name: '晨光草原',
    subtitle: '從第一道線索出發',
    color: '#315b3e',
    tint: '#e5eedc',
    paper: '#f4f6ec',
    size: 5,
    lesson: '觀察只有一個位置的牧區',
  },
  {
    name: '靜謐森林',
    subtitle: '在樹影間找到方向',
    color: '#2e5b4d',
    tint: '#dcebe3',
    paper: '#eff4ef',
    size: 6,
    lesson: '用已放好的牛排除同列、同欄與鄰格',
  },
  {
    name: '繁花原野',
    subtitle: '讓線索慢慢盛開',
    color: '#874861',
    tint: '#f0dfe6',
    paper: '#fbf2f3',
    size: 6,
    lesson: '留意牧區與橫列、直欄的交集',
  },
  {
    name: '溪谷漫步',
    subtitle: '順著線索往前走',
    color: '#266767',
    tint: '#d8eeea',
    paper: '#eef7f4',
    size: 7,
    lesson: '候選格都在同一列時，其他牧區就不能占用那一列',
  },
  {
    name: '海風牧場',
    subtitle: '在潮汐之間思考',
    color: '#365d86',
    tint: '#ddeaf5',
    paper: '#f0f5fa',
    size: 7,
    lesson: '結合牧區邊界與牛不能相鄰的規則',
  },
  {
    name: '金色沙丘',
    subtitle: '在起伏之間找路',
    color: '#805a22',
    tint: '#f3e7c6',
    paper: '#faf5e9',
    size: 8,
    lesson: '先找限制最多的列、欄或牧區',
  },
  {
    name: '秋日林間',
    subtitle: '把零散線索串起來',
    color: '#914a31',
    tint: '#f4dfcd',
    paper: '#faf1e8',
    size: 8,
    lesson: '兩個牧區若占滿兩列，其他牧區就要避開',
  },
  {
    name: '白雪丘陵',
    subtitle: '留下清晰的足跡',
    color: '#4e6478',
    tint: '#e1eaf0',
    paper: '#f2f6fa',
    size: 8,
    lesson: '用排除記號保存每一步推理',
  },
  {
    name: '星夜原野',
    subtitle: '讓細小的線索發光',
    color: '#55518b',
    tint: '#e5e2f4',
    paper: '#f3f2fa',
    size: 9,
    lesson: '觀察多個牧區共同占用的列與欄',
  },
  {
    name: '雲端牧場',
    subtitle: '最後一段登頂之路',
    color: '#286567',
    tint: '#d8eae5',
    paper: '#edf5f2',
    size: 9,
    lesson: '綜合所有技巧，不必猜測',
  },
] as const;

export const CHAPTER_LENGTH = 20;
export const CAMPAIGN_LENGTH = CHAPTERS.length * CHAPTER_LENGTH;
export const chapterFor = (level: number) =>
  CHAPTERS[Math.floor(level / CHAPTER_LENGTH)] ?? CHAPTERS[0];
export const chapterImage = (chapter: number) =>
  `./chapters/ch${String(chapter + 1).padStart(2, '0')}.webp`;
