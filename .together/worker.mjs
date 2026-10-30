import { createWorker, TogetherRoom } from './app.mjs';
import { page, icons } from './ui.mjs';
import css from './style.css';
import js from './client.js';
import illustration from './assets/couple.webp';

export { TogetherRoom };
const version = [...css + js].reduce((hash, character) => (Math.imul(31, hash) + character.charCodeAt(0)) | 0, 0).toString(36);
export default createWorker({ page: (authorized, items) => page(authorized, version, items), css, js: 'const icons = ' + JSON.stringify(icons) + ';\n' + js, illustration });
