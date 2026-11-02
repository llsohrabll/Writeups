export const listingCss = `
.post-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;align-items:stretch}
.post-list>.post-card{display:flex;flex-direction:column;align-items:flex-start;gap:20px;padding:26px;min-width:0}
.post-list .post-avatar{width:56px;height:58px;flex-shrink:0;align-self:flex-start;border-radius:13px}
.post-list .post-avatar>svg{color:var(--accent);width:28px;height:28px}
.post-list .post-copy{width:100%;flex:1;gap:11px;align-content:start}
.post-list .post-card h3{font-size:25px;line-height:1.3}
.post-list .post-card p{font-size:15px;line-height:1.65}
.post-list .read-link{margin-top:auto}
@media(max-width:640px){
  .post-list{grid-template-columns:minmax(0,1fr);gap:16px}
  .post-list>.post-card{display:grid;grid-template-columns:50px minmax(0,1fr);column-gap:14px;row-gap:14px;padding:20px 16px}
  .post-list .post-avatar{grid-column:1;grid-row:1 / span 2;width:50px;height:60px;align-self:center;border-radius:12px}
  .post-list .post-copy{grid-column:2;grid-row:1}
  .post-list .read-link{grid-column:2;grid-row:2}
  .post-list .post-card h3{font-size:24px}
}
`;
