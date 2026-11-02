export const listingCss = `
.post-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;align-items:stretch}
.post-list>.post-card{display:flex;flex-direction:column;align-items:flex-start;gap:20px;padding:26px;min-width:0}
.post-list .post-avatar{width:56px;height:58px;flex-shrink:0;align-self:flex-start;border-radius:13px}
.post-list .post-avatar>svg{color:var(--accent);width:28px;height:28px}
.post-list .post-copy{width:100%;flex:1;gap:11px;align-content:start}
.post-list .post-card h3{font-size:25px;line-height:1.3}
.post-list .post-card p{font-size:15px;line-height:1.65}
.post-list .read-link{margin-top:auto}
.home-layout{display:grid;grid-template-columns:minmax(0,1fr) 276px;column-gap:32px;align-items:start;max-width:1320px}
.home-layout>.hero{grid-column:1;grid-row:1}
.home-layout>.archive{grid-column:1;grid-row:2;min-width:0}
.welcome-sidebar{grid-column:2;grid-row:1 / span 2;position:sticky;top:28px;margin-block:52px 68px;min-width:0}
.welcome-panel{padding:26px 24px;background:var(--white);border:1px solid var(--line);border-radius:18px;box-shadow:0 5px 22px var(--card-shadow)}
.welcome-portrait{display:block;width:72px;height:72px;object-fit:cover;border-radius:18px;margin-bottom:24px;border:1px solid var(--line)}
.welcome-eyebrow{display:block;color:var(--accent);font:600 11px/1.5 var(--sans);letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px}
.welcome-panel h2{margin:0 0 18px;font:400 28px/1.2 var(--serif);letter-spacing:-.035em;overflow-wrap:anywhere}
.welcome-copy{color:var(--muted);font:14px/1.8 var(--sans);overflow-wrap:anywhere}
.welcome-copy p{margin:0 0 14px}.welcome-copy>:last-child{margin-bottom:0}
.welcome-copy a{color:var(--accent)}.welcome-copy img{max-width:100%;height:auto}.welcome-copy pre{overflow:auto}
.welcome-read{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:19px;margin-top:23px;border-top:1px solid var(--line);color:var(--accent);font:600 13px/1.5 var(--sans);text-decoration:none}
.welcome-read span{font-size:20px;transition:transform .15s}.welcome-read:hover span{transform:translateX(3px)}
@media(max-width:1099px){
  .home-layout{grid-template-columns:minmax(0,1fr);row-gap:0;max-width:1136px}
  .welcome-sidebar{grid-column:1;grid-row:2;position:static;margin:0 0 26px}
  .home-layout>.archive{grid-row:3}
  .welcome-panel{position:relative;padding:24px 26px 24px 124px}
  .welcome-portrait{position:absolute;left:26px;top:26px;margin:0}
  .welcome-panel h2{font-size:26px;margin-bottom:12px}
  .welcome-copy{max-width:650px}.welcome-copy p{margin-bottom:9px}
  .welcome-read{margin-top:16px;padding-top:14px}
}
@media(max-width:640px){
  .post-list{grid-template-columns:minmax(0,1fr);gap:16px}
  .post-list>.post-card{display:grid;grid-template-columns:50px minmax(0,1fr);column-gap:14px;row-gap:14px;padding:20px 16px}
  .post-list .post-avatar{grid-column:1;grid-row:1 / span 2;width:50px;height:60px;align-self:center;border-radius:12px}
  .post-list .post-copy{grid-column:2;grid-row:1}
  .post-list .read-link{grid-column:2;grid-row:2}
  .post-list .post-card h3{font-size:24px}
  .welcome-panel{padding:22px}
  .welcome-portrait{position:static;width:56px;height:56px;border-radius:14px;margin-bottom:18px}
  .welcome-panel h2{font-size:25px}
}
`;
