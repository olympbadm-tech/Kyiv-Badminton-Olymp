// Generates ADMIN_PASSWORD_HASH (and a fresh SESSION_SECRET) for the admin panel.
// Run: npm run hash-password
// The password itself is never stored anywhere — only paste the printed hash
// into Vercel → Settings → Environment Variables.

import crypto from 'node:crypto';
import readline from 'node:readline';
import { hashPassword } from '../lib/auth.js';

function ask(question) {
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    // Fallback for terminals without raw mode: input is visible.
    const rl = readline.createInterface({ input: stdin, output: process.stdout });
    return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a); }));
  }
  return new Promise((resolve) => {
    process.stdout.write(question);
    let value = '';
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          return resolve(value);
        }
        if (ch === '\u0003') { process.stdout.write('\n'); process.exit(1); }
        if (ch === '\u007f' || ch === '\b') { value = value.slice(0, -1); continue; }
        value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

const password = await ask('Новий пароль адмінки (не менше 10 символів): ');
if (password.length < 10) {
  console.error('Пароль закороткий — потрібно щонайменше 10 символів.');
  process.exit(1);
}
const repeat = await ask('Повторіть пароль: ');
if (repeat !== password) {
  console.error('Паролі не збігаються.');
  process.exit(1);
}

const hash = await hashPassword(password);
const secret = crypto.randomBytes(48).toString('base64url');

console.log('\nСкопіюйте ці значення у Vercel → Settings → Environment Variables:\n');
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
console.log(`SESSION_SECRET=${secret}`);
console.log('\nSESSION_SECRET потрібен лише один раз (при першому налаштуванні).');
console.log('Щоб змінити пароль, достатньо оновити тільки ADMIN_PASSWORD_HASH — старі входи стануть недійсними.');
