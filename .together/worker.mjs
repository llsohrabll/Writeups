import { createWorker, TogetherRoom } from './app.mjs';
import { page, icons } from './ui.mjs';
import css from './style.css';
import js from './client.js';
import illustration from './assets/couple.webp';

export { TogetherRoom };
export default createWorker({ page, css, js: 'const icons = ' + JSON.stringify(icons) + ';\n' + js, illustration });
