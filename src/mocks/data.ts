/**
 * Deterministic, fully synthetic data for the playground's mocked API.
 *
 * Nothing here talks to a real backend. The same data feeds the MSW browser
 * worker (so demos can call `fetch` for real) and the MSW node server used by
 * the test-suite, which keeps demos and tests honest about the same contract.
 */

/** Small seeded PRNG (mulberry32) so data is stable across reloads and tests. */
export function createRandom(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Product {
  id: number;
  name: string;
  category: ProductCategory;
  price: number;
  rating: number;
  stock: number;
}

export const productCategories = [
  'Books',
  'Electronics',
  'Garden',
  'Kitchen',
  'Outdoors',
  'Toys',
] as const;
export type ProductCategory = (typeof productCategories)[number];

const adjectives = [
  'Ancient',
  'Bright',
  'Compact',
  'Durable',
  'Elegant',
  'Fast',
  'Gentle',
  'Handy',
  'Iconic',
  'Jolly',
  'Keen',
  'Lucky',
  'Modern',
  'Nimble',
  'Quiet',
  'Rapid',
  'Smart',
  'Tidy',
  'Vivid',
  'Warm',
];
const nouns = [
  'Lamp',
  'Kettle',
  'Notebook',
  'Speaker',
  'Backpack',
  'Planter',
  'Puzzle',
  'Blender',
  'Tent',
  'Headphones',
  'Shovel',
  'Novel',
  'Drone',
  'Skillet',
  'Kite',
];

function buildProducts(count: number): Product[] {
  const random = createRandom(42);
  return Array.from({ length: count }, (_, index) => {
    const adjective = adjectives[Math.floor(random() * adjectives.length)] ?? 'Plain';
    const noun = nouns[Math.floor(random() * nouns.length)] ?? 'Thing';
    const category = productCategories[Math.floor(random() * productCategories.length)] ?? 'Books';
    return {
      id: index + 1,
      name: `${adjective} ${noun} ${index + 1}`,
      category,
      price: Math.round((5 + random() * 495) * 100) / 100,
      rating: Math.round((1 + random() * 4) * 10) / 10,
      stock: Math.floor(random() * 120),
    };
  });
}

/** 500 products: enough to make filtering, paging and virtualization meaningful. */
export const products: readonly Product[] = buildProducts(500);

/** Programming languages used by search / autocomplete / command palette demos. */
export const languages: readonly string[] = [
  'Ada',
  'Assembly',
  'Bash',
  'C',
  'C#',
  'C++',
  'Clojure',
  'COBOL',
  'Crystal',
  'Dart',
  'Elixir',
  'Elm',
  'Erlang',
  'F#',
  'Fortran',
  'Gleam',
  'Go',
  'Groovy',
  'Haskell',
  'Java',
  'JavaScript',
  'Julia',
  'Kotlin',
  'Lisp',
  'Lua',
  'MATLAB',
  'Nim',
  'Objective-C',
  'OCaml',
  'Pascal',
  'Perl',
  'PHP',
  'PowerShell',
  'Prolog',
  'Python',
  'R',
  'Racket',
  'Ruby',
  'Rust',
  'Scala',
  'Scheme',
  'Smalltalk',
  'SQL',
  'Swift',
  'TypeScript',
  'V',
  'Visual Basic',
  'WebAssembly',
  'Zig',
];

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export const initialTodos: readonly Todo[] = [
  { id: 't1', title: 'Read the Rules of Hooks', completed: true },
  { id: 't2', title: 'Write a custom hook', completed: false },
  { id: 't3', title: 'Test effect cleanup', completed: false },
];

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

export const users: readonly User[] = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' },
  { id: 2, name: 'Grace Hopper', email: 'grace@example.com', role: 'editor' },
  { id: 3, name: 'Alan Turing', email: 'alan@example.com', role: 'viewer' },
  { id: 4, name: 'Katherine Johnson', email: 'katherine@example.com', role: 'editor' },
  { id: 5, name: 'Edsger Dijkstra', email: 'edsger@example.com', role: 'viewer' },
];

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number): Paginated<T> {
  const safeSize = Math.max(1, Math.min(100, pageSize));
  const totalPages = Math.max(1, Math.ceil(items.length / safeSize));
  const safePage = Math.max(1, Math.min(totalPages, page));
  const start = (safePage - 1) * safeSize;
  return {
    items: items.slice(start, start + safeSize),
    page: safePage,
    pageSize: safeSize,
    total: items.length,
    totalPages,
  };
}
