import lib_default from 'markdown-it';
import { parseDocument } from 'yaml';
import { renderLlmFlow, renderLlmCheckpoint } from './llm-visuals.mjs';
const __name = (value) => value;
var escape3 = /* @__PURE__ */ __name((value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]), "escape");
function slugify(value) {
  const slug = String(value).normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(slug) ? `post-${slug}` : slug;
}
__name(slugify, "slugify");
function parsePost(source, file) {
  const normal = source.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const match2 = normal.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  let meta = {};
  if (match2) {
    const document = parseDocument(match2[1], { uniqueKeys: true });
    if (document.errors.length) throw new Error(`${file}: ${document.errors[0].message}`);
    meta = document.toJS({ maxAliasCount: 20 });
    if (!meta || Array.isArray(meta) || typeof meta !== "object") throw new Error(`${file}: frontmatter must be a mapping`);
  }
  let body = match2 ? normal.slice(match2[0].length) : normal;
  const heading2 = body.match(/^# (.+)\s*$/m);
  const parts = String(file).replace(/\\/g, "/").split("/");
  const stem = parts.at(-1).replace(/\.md$/i, "");
  const fallback = /^(index|readme)$/i.test(stem) && parts.length > 1 ? parts.at(-2) : stem;
  const title = String(meta.title || heading2?.[1] || fallback.replace(/-/g, " "));
  if (heading2 && heading2[1].trim() === title.trim()) body = body.replace(heading2[0], "").trim();
  const slug = meta.slug ? slugify(meta.slug) : slugify(fallback) || slugify(title);
  if (!slug) throw new Error(`${file}: provide a title or valid slug`);
  if (meta.draft !== void 0 && typeof meta.draft !== "boolean") throw new Error(`${file}: draft must be true or false without quotes`);
  if (meta.date !== void 0 && (typeof meta.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(meta.date) || Number.isNaN(Date.parse(meta.date)) || new Date(meta.date).toISOString().slice(0, 10) !== meta.date)) throw new Error(`${file}: date must be YYYY-MM-DD`);
  if (meta.tags !== void 0 && (!Array.isArray(meta.tags) || meta.tags.length > 12 || meta.tags.some((tag) => typeof tag !== "string" || !tag.trim() || tag.trim().length > 48))) throw new Error(`${file}: tags must be a list of up to 12 nonempty strings, each at most 48 characters`);
  const tags2 = [...new Map((meta.tags || []).map((tag) => [tag.trim().toLowerCase(), tag.trim()])).values()];
  if (meta.reading_minutes !== void 0 && (!Number.isSafeInteger(meta.reading_minutes) || meta.reading_minutes < 1)) throw new Error(`${file}: reading_minutes must be a positive whole number`);
  if (meta.icon !== void 0 && (typeof meta.icon !== "string" || !meta.icon.trim())) throw new Error(`${file}: icon must be a nonempty image path`);
  return { title, slug, explicitSlug: meta.slug !== void 0, body, tags: tags2, layout: meta.layout === "document" ? "document" : "article", description: String(meta.description || meta.summary || ""), category: String(meta.category || "Writeup"), author: String(meta.author || ""), date: meta.date || null, draft: meta.draft === true, minutes: meta.reading_minutes ?? Math.max(1, Math.ceil(body.split(/\s+/).length / 220)), icon: meta.icon?.trim() || null, file };
}
__name(parsePost, "parsePost");
function renderPost(post, resolveLocal2) {
  const md = new lib_default({ html: false, linkify: true, typographer: true });
  const defaultFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, index, options, env, renderer) => {
    const name = tokens[index].info.trim();
    if (name === 'llm-flow') return renderLlmFlow();
    if (name === 'llm-checkpoint') return renderLlmCheckpoint();
    return defaultFence(tokens, index, options, env, renderer);
  };
  const toc = [];
  const used = /* @__PURE__ */ new Set();
  md.core.ruler.push("nightwatch", (state) => {
    for (let i = 0; i < state.tokens.length; i++) {
      const token = state.tokens[i];
      if (token.type === "heading_open") {
        if (token.tag === "h1") {
          token.tag = "h2";
          state.tokens[i + 2].tag = "h2";
        }
        const text2 = state.tokens[i + 1].content;
        const base2 = slugify(text2) || "section";
        let id = base2;
        let n = 1;
        while (used.has(id)) id = `${base2}-${n++}`;
        used.add(id);
        token.attrSet("id", id);
        if (["h2", "h3"].includes(token.tag)) toc.push({ id, text: text2, depth: Number(token.tag.slice(1)) });
      }
      for (const child of token.children || []) {
        const attribute2 = child.type === "image" ? "src" : child.type === "link_open" ? "href" : null;
        if (!attribute2) continue;
        const href = child.attrGet(attribute2);
        if (href && !/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(href)) child.attrSet(attribute2, resolveLocal2(href));
        if (child.type === "image") {
          child.attrSet("loading", "lazy");
          child.attrSet("decoding", "async");
        }
        if (child.type === "link_open" && /^https?:/i.test(href)) child.attrSet("rel", "noopener noreferrer");
      }
    }
  });
  md.renderer.rules.table_open = () => '<div class="table-wrap"><table>\n';
  md.renderer.rules.table_close = () => "</table></div>\n";
  return { html: md.render(post.body), toc };
}
__name(renderPost, "renderPost");

export { parsePost, renderPost, slugify, escape3 };
