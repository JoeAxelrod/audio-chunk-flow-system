import fs from 'fs';
 
export function ffconcat(a: string, b: string, out: string) {
  const bufA = fs.readFileSync(a);
  const bufB = fs.readFileSync(b);
  fs.writeFileSync(out, Buffer.concat([bufA, bufB]));
} 