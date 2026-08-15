(()=>{const out=[];
for(const ss of document.styleSheets){let rs;try{rs=ss.cssRules}catch(e){out.push('SKIP '+ss.href);continue}
  out.push('SHEET '+(ss.href||'inline')+' regras='+rs.length);
  for(const r of rs){const t=r.selectorText||'';
    if(t.indexOf('service-card__glow')>=0||t.indexOf('servicos--livre')>=0) out.push('  RULE '+t.slice(0,90));}}
const c2=document.querySelectorAll('.service-card')[1];
const g=c2.querySelector('.service-card__glow');
const m=c2.querySelector('.service-card__more');
out.push('glow computed: '+getComputedStyle(g).visibility+' / '+getComputedStyle(g).opacity);
out.push('more computed: '+getComputedStyle(m).visibility+' / '+getComputedStyle(m).opacity);
return out.join('\n');})()
