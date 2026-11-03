export const displayScale = 1.3;
export const displayVersion = '130-v1';

// CSS zoom does not resize the viewport used by media queries.
// Move the breakpoints to match the layout space available at this scale.
export function scaleResponsiveCss(css) {
  return css.replace(/@media\s*[^{}]+\{/g, header => header.replace(/\b((?:min|max)-(?:width|height)\s*:\s*)(\d+(?:\.\d+)?)px/gi,
    (_, feature, value) => feature + Number((Number(value) * displayScale).toFixed(3)) + 'px'));
}

export const displayCss = `
html{zoom:${displayScale}}
body{min-height:calc(100vh / ${displayScale})}
@media(min-width:780.001px){.contents{max-height:calc(100vh / ${displayScale} - 64px)}}
@media(max-width:600px){
  .header-inner{flex-wrap:wrap;padding-block:12px;gap:9px}
  .header-inner .nav{width:100%;justify-content:space-between;gap:6px}
  .oauth-toolbar,.llm-toolbar{flex-wrap:wrap}
  .oauth-library-tabs,.llm-library-tabs{flex-wrap:wrap;gap:16px}
  .oauth-playback,.llm-playback{flex-wrap:wrap}
  .oauth-speed,.llm-speed{flex-basis:100%;justify-content:flex-end;margin:6px 0 0}
  .oauth-timeline,.llm-timeline{flex-wrap:wrap;justify-content:flex-start;gap:8px}
  .note-card-footer{flex-wrap:wrap}
}
@media print{html{zoom:1}body{min-height:0}.contents{max-height:none}}
`;
