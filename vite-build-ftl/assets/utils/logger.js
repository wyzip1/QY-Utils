import signale from 'signale';

const { Signale } = signale;

export function createInteractive(options) {
  const interactive = new Signale({ ...options,
    interactive: true
  });
  return interactive;
}

export const logger = signale;
