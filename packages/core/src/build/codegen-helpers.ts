export const stringLiteral = (val: string) => literal(val);

export const literal = (val: string | number | null | undefined) => {
  if (val === undefined) return "undefined";
  return JSON.stringify(val);
};

export const arrayLiteral = (lits: string[]) => "[" + lits.join(", ") + "]";
