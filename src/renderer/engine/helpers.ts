type Entry<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T];

export function entries<T>(obj: T): Entry<T>[] {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return Object.entries(obj) as any;
}
