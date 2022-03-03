export const formatPercentage =
  (fractionDigits = 2, padStart = 3) =>
  (value: number) => {
    const fractionDivisor = Math.pow(10, fractionDigits);
    const percentValue = value * 100;
    const fraction = percentValue % 1;

    const digits = Math.round(fraction * fractionDivisor) / fractionDivisor;

    return [
      `${Math.round(percentValue)}`.padStart(padStart, '0'),
      ...(fractionDigits > 0
        ? [`${digits}`.padStart(fractionDigits, '0')]
        : []),
    ].join('.');
  };

export const formattedTimeStep = (cursorPosition: number | null) => {
  if (cursorPosition === null) return 1;

  return (
    [
      3600 * 100,
      3600 * 100,
      3600 * 10,
      3600,
      60 * 10,
      60 * 10,
      60,
      10,
      10,
      1,
      1 / 10,
      1 / 10,
      1 / 100,
      1 / 1000,
      1 / 10000,
    ][cursorPosition] ?? 1
  );
};

export const parseFormattedTime = (formattedTime: string) => {
  const segments = formattedTime.split(':');
  if (segments.length === 4) {
    return (
      +segments[0] * 3600 +
      +segments[1] * 60 +
      +segments[2] +
      +segments[3].padEnd(4) / 10000
    );
  }
  return NaN;
};

export const formatTime = (time: number) => {
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time - hours * 3600) / 60);
  const seconds = Math.floor(time - hours * 3600 - minutes * 60);
  const fraction = Math.floor(
    (time - hours * 3600 - minutes * 60 - seconds) * 10000,
  );

  return [
    `${hours}`.padStart(3, '0'),
    `${minutes}`.padStart(2, '0'),
    `${seconds}`.padStart(2, '0'),
    `${fraction}`.padStart(4, '0'),
  ].join(':');
};

export const camelCaseToSpaced = (str: string) => {
  let newString = '';
  for (let i = 0; i < str.length; i++) {
    if (str[i] === str[i].toUpperCase()) {
      newString += ' ';
    }
    newString += str[i].toLowerCase();
  }
  return newString;
};
