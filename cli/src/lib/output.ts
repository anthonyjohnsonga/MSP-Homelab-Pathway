/**
 * Terminal output.
 *
 * Colour only when stdout is a real terminal, so piping to a file or reading
 * CI logs does not produce escape-code soup. The plain markers carry the
 * meaning on their own.
 */

/** Built rather than written literally so no raw control byte lives in source. */
const ESC = String.fromCharCode(27);

const useColour = Boolean(process.stdout.isTTY) && process.env.NO_COLOR === undefined;

function paint(code: string, text: string): string {
  return useColour ? `${ESC}[${code}m${text}${ESC}[0m` : text;
}

export const colour = {
  green: (t: string) => paint('32', t),
  red: (t: string) => paint('31', t),
  amber: (t: string) => paint('33', t),
  dim: (t: string) => paint('2', t),
  bold: (t: string) => paint('1', t),
};

export const mark = {
  pass: () => colour.green('ok  '),
  fail: () => colour.red('FAIL'),
  warn: () => colour.amber('warn'),
  skip: () => colour.dim('--  '),
};

export function heading(text: string): void {
  console.log(`\n${colour.bold(text)}`);
}

export function line(text = ''): void {
  console.log(text);
}
