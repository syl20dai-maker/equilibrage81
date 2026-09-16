const TOLERANCE=0.10, NB_POSITIONS=81, PAS=360/NB_POSITIONS, MASSES=[0.9,1.2,1.6,1.8,2.1], MAX_MASSES=15;
const INTERDITES=new Set(['80-81','81-1','1-2']);
const $=id=>document.getElementById(id);
const angleEl=$('angle'), massEl=$('mass'), button=$('calculate'), statusEl=$('status');
let lastResult=null,lastMass=0;

function normAngle(a){return ((a%360)+360)%360}
function distAng(a,b){let d=Math.abs(a-b);return d>180?360-d:d}
function fmt(n,d=3){return Number(n).toFixed(d).replace('.',',')}
function angleMode(){return document.querySelector('input[name="angleMode"]:checked').value}
function resultMode(){return document.querySelector('input[name="resultMode"]:checked').value}

function buildIntervals(correction){
  const out=[];
  for(let p=1;p<=NB_POSITIONS;p++){
    const p2=p===NB_POSITIONS?1:p+1, name=`${p}-${p2}`;
    if(INTERDITES.has(name)) continue;
    let a1=(p-1)*PAS,a2=(p2-1)*PAS;
    if(p===NB_POSITIONS&&p2===1)a2=360;
    const angle=((a1+a2)/2)%360,r=angle*Math.PI/180;
    out.push({p1:p,p2,name,angle,x:Math.cos(r),y:Math.sin(r),distance:distAng(angle,correction)});
  }
  out.sort((a,b)=>a.distance-b.distance);
  return out;
}
function lexMassesBetter(a,b){
  const eps=1e-9;
  for(let i=0;i<a.length;i++){if(a[i]<b[i]-eps)return true;if(a[i]>b[i]+eps)return false}
  return false;
}
function better(cand,best){
  if(!best)return true;
  if(lexMassesBetter(cand.massesSorted,best.massesSorted))return true;
  if(lexMassesBetter(best.massesSorted,cand.massesSorted))return false;
  if(cand.total<best.total-1e-9)return true;
  if(cand.total>best.total+1e-9)return false;
  return cand.residual<best.residual-1e-9;
}
function solve(angleInput,massInput,mode){
  const entered=normAngle(angleInput);
  const angle=mode==='balourd'?entered:normAngle(entered+180);
  const correction=mode==='balourd'?normAngle(entered+180):entered;
  const intervals=buildIntervals(correction);
  const targetX=massInput*Math.cos(correction*Math.PI/180),targetY=massInput*Math.sin(correction*Math.PI/180);
  const maxMass=Math.max(...MASSES),minCount=Math.max(1,Math.ceil((massInput-TOLERANCE)/maxMass));
  for(let wanted=minCount;wanted<=MAX_MASSES;wanted++){
    let best=null,nodes=0; const combo=[];
    function dfs(start,sx,sy){
      if(++nodes>1800000)return;
      const remaining=wanted-combo.length;
      if(remaining===0){
        const residual=Math.hypot(sx-targetX,sy-targetY);
        if(residual>TOLERANCE)return;
        const total=combo.reduce((s,v)=>s+v.mass,0);
        const cand={combo:combo.map(x=>({...x})),residual,total,massesSorted:combo.map(x=>x.mass).sort((a,b)=>a-b)};
        if(better(cand,best))best=cand;
        return;
      }
      if(intervals.length-start<remaining)return;
      for(let i=start;i<intervals.length;i++){
        if(intervals.length-i-1<remaining-1)break;
        const it=intervals[i];
        for(const m of MASSES){
          const nx=sx+m*it.x,ny=sy+m*it.y;
          if(Math.hypot(nx-targetX,ny-targetY)>(remaining-1)*maxMass+TOLERANCE)continue;
          if(Math.hypot(nx,ny)+(remaining-1)*maxMass<massInput-TOLERANCE)continue;
          combo.push({intervalle:it.name,mass:m,angle:it.angle,p1:it.p1,p2:it.p2});
          dfs(i+1,nx,ny); combo.pop();
        }
      }
    }
    dfs(0,0,0);
    if(best){
      best.combo.sort((a,b)=>a.p1-b.p1 || a.p2-b.p2);
      return {angle,correction,entered,mode,...best};
    }
  }
  return {angle,correction,entered,mode,combo:null};
}
function point(cx,cy,r,a){const rad=a*Math.PI/180;return{x:cx+r*Math.sin(rad),y:cy-r*Math.cos(rad)}}
function draw(result,massInput){
  const c=$('diagram'),ctx=c.getContext('2d'),W=c.width,H=c.height,cx=W/2,cy=455,R=305;
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#f8fbfd';ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 28px -apple-system,sans-serif';ctx.fillStyle='#174A73';
  ctx.fillText('SCHÉMA D’ÉQUILIBRAGE — 81 POSITIONS',W/2,44);
  ctx.strokeStyle='#b7c3cf';ctx.lineWidth=1.5;ctx.setLineDash([7,7]);ctx.beginPath();ctx.moveTo(cx-R,cy);ctx.lineTo(cx+R,cy);ctx.moveTo(cx,cy-R);ctx.lineTo(cx,cy+R);ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='#174A73';ctx.lineWidth=4;ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.stroke();
  for(let p=1;p<=NB_POSITIONS;p++){const a=(p-1)*PAS,q=point(cx,cy,R,a),forbidden=(p===1||p===2||p===80||p===81);ctx.beginPath();ctx.fillStyle=forbidden?'#E12D2D':'#fff';ctx.strokeStyle=forbidden?'#E12D2D':'#174A73';ctx.lineWidth=forbidden?2.6:1.4;ctx.arc(q.x,q.y,forbidden?6:4,0,Math.PI*2);ctx.fill();ctx.stroke()}
  [1,2,10,20,30,40,50,60,70,80,81].forEach(p=>{const q=point(cx,cy,R+33,(p-1)*PAS);ctx.font=((p===1||p===2||p===80||p===81)?'900 ':'700 ')+'15px -apple-system,sans-serif';ctx.fillStyle=(p===1||p===2||p===80||p===81)?'#E12D2D':'#174A73';ctx.fillText('P'+p,q.x,q.y)});
  function arrow(a,color,label){const q=point(cx,cy,R-65,a);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.beginPath();ctx.arc(q.x,q.y,11,0,Math.PI*2);ctx.fill();const l=point(cx,cy,R-145,a);ctx.font='800 16px -apple-system,sans-serif';ctx.fillText(label,l.x,l.y)}
  // V3 : suppression de la barre/flèche rouge du balourd sur le cercle.
  // Seule la direction exacte à compenser est matérialisée sur le schéma.
  arrow(result.correction,'#1E9B50','À COMPENSER');
  // Sur le cercle, chaque masse est indiquée uniquement par un point bleu.\n  if(result.combo)result.combo.forEach(it=>{const q=point(cx,cy,R,it.angle);ctx.fillStyle='#17649A';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(q.x,q.y,14,0,Math.PI*2);ctx.fill();ctx.stroke()});
  ctx.fillStyle='#374151';ctx.beginPath();ctx.arc(cx,cy,7,0,Math.PI*2);ctx.fill();
}
function show(result,mass){
  $('results').classList.remove('hidden');$('rAngle').textContent=fmt(result.angle)+'°';$('rCorrection').textContent=fmt(result.correction)+'°';
  const placements=$('placements');placements.innerHTML='';
  const angles=resultMode()==='angles'; $('placementsTitle').textContent=angles?'Angles de placement':'Masses à placer';
  if(!result.combo){$('rCount').textContent='Aucune';$('rTotal').textContent='—';$('rResidual').textContent='—';placements.innerHTML='<div class="placement"><span>Aucune solution trouvée dans les limites de recherche.</span></div>';return}
  $('rCount').textContent=result.combo.length;$('rTotal').textContent=fmt(result.total)+' g';$('rResidual').textContent=fmt(result.residual)+' g';
  result.combo.forEach(it=>{
    const div=document.createElement('div');div.className='placement';
    const left=angles?`${fmt(it.angle)}°`:`${it.intervalle}`;
    div.innerHTML=`<strong>${left}</strong><span>${it.mass.toFixed(1).replace('.',',')} g</span>`;
    placements.appendChild(div);
  });
}
document.querySelectorAll('input[name="angleMode"]').forEach(r=>r.addEventListener('change',()=>{
  $('angleLabel').textContent=angleMode()==='balourd'?'Angle du balourd':'Angle à compenser';
}));
document.querySelectorAll('input[name="resultMode"]').forEach(r=>r.addEventListener('change',()=>{
  if(lastResult){show(lastResult,lastMass);draw(lastResult,lastMass)}
}));
button.addEventListener('click',()=>{
  const a=Number(String(angleEl.value).replace(',','.')),m=Number(String(massEl.value).replace(',','.'));
  if(!Number.isFinite(a)||!Number.isFinite(m)||m<=0){statusEl.textContent='Renseigne un angle valide et une masse supérieure à 0.';return}
  button.disabled=true;statusEl.textContent='Calcul en cours…';lastMass=m;
  setTimeout(()=>{try{lastResult=solve(a,m,angleMode());show(lastResult,m);draw(lastResult,m);statusEl.textContent=lastResult.combo?'Solution minimale trouvée.':'Aucune solution trouvée.'}catch(e){statusEl.textContent='Erreur : '+e.message}finally{button.disabled=false}},30);
});
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
draw({angle:0,correction:180,combo:null},0);
