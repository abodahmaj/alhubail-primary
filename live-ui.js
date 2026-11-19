(function(){'use strict';
 const find=s=>document.querySelector(s),feedback=find('#login-feedback');let connection=null,token=null,currentUser=null,school=null;
 const configured=typeof window.SCHOOL_BACKEND_URL==='string'&&window.SCHOOL_BACKEND_URL.length>0;
 const DEV_OVERVIEW_MODE=true;
 const SESSION_KEY='alhubail-session-token';
 function saveToken(t){try{if(t)sessionStorage.setItem(SESSION_KEY,t);else sessionStorage.removeItem(SESSION_KEY);}catch(_){}}
 if(DEV_OVERVIEW_MODE){
  find('.environment').textContent='وضع التطوير · التركيز على النظرة العامة';
  find('#username').disabled=true;find('#password').disabled=true;find('#login-submit').disabled=true;
  feedback.textContent='تسجيل الدخول معطّل مؤقتًا للعمل السريع على قسم النظرة العامة.';
 }else if(configured){find('.environment').textContent='اتصال مهيأ · تسجيل الدخول مطلوب';find('#username').disabled=false;find('#username').required=true;find('#password').disabled=false;find('#password').required=true;find('#login-submit').disabled=false;feedback.textContent='الدخول للحسابات المعتمدة فقط.';connect().ready.catch(()=>{if(connection){connection.close();connection=null;}});}
 try{const note=sessionStorage.getItem('alhubail-logout-note');if(note){feedback.textContent=note;sessionStorage.removeItem('alhubail-logout-note');}}catch(_){}
 function connect(){if(!connection)connection=window.createSchoolConnection(window.SCHOOL_BACKEND_URL);return connection;}
 function api(action,payload){return connect().request({action,payload,token}).then(result=>{if(!result||!result.ok){if(result?.error?.code==='UNAUTHORIZED'){token=null;currentUser=null;saveToken(null);find('#overview .stats')?.classList.remove('stats-4');find('#live-school')?.remove();find('#live-reports')?.remove();find('#live-executive')?.remove();find('#workspace').hidden=true;find('#login').hidden=false;feedback.textContent='انتهت الجلسة. يرجى تسجيل الدخول مجددًا.';}throw Error(result?.error?.code||'SERVICE_UNAVAILABLE');}return result.data;});}
 function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
 function populate(select,list,label){select.replaceChildren();select.append(new Option(label,''));for(const x of list)select.append(new Option(x.label,x.value));}
 let analyticsCache=null,periodCache={},activePeriod='1';
 function downloadCsv(filename,headers,rows){
  const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const csv='\uFEFF'+[headers.map(esc).join(','),...rows.map(r=>r.map(esc).join(','))].join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function barList(items){
  const list=node('div',undefined,'bar-list');
  for(const it of items){
   const row=node('div',undefined,'bar-row'),hd=node('div',undefined,'bar-head');
   hd.append(node('span',it.label),node('strong',it.right));
   const trk=node('div',undefined,'bar-track'),fill=node('div',undefined,'bar-fill');
   fill.style.width=Math.max(0,Math.min(100,Math.round((it.pct||0)*100)))+'%';
   trk.append(fill);row.append(hd,trk);list.append(row);
  }
  return list;
 }
 function levelBadge(lvl){
  if(lvl==='above')return node('span','✓ فوق المتوسط','badge-good');
  if(lvl==='mid')return node('span','• متوسط','badge-mid');
  if(lvl==='low')return node('span','⚑ منخفض','badge-warn');
  return node('span','غير مرصود','muted');
 }
 function skeletonBlock(kind){
  const wrap=node('div',undefined,'skeleton-wrap');
  wrap.setAttribute('aria-busy','true');
  if(kind==='cards'){
   const grid=node('div',undefined,'skeleton-grid');
   for(let i=0;i<3;i++){const c=node('div',undefined,'skeleton-card');c.append(node('div',undefined,'skeleton-line w-40'),node('div',undefined,'skeleton-line h-lg'),node('div',undefined,'skeleton-line w-85'));grid.append(c);}
   wrap.append(grid);
  }else if(kind==='card'){
   const c=node('div',undefined,'skeleton-card');
   c.append(node('div',undefined,'skeleton-line w-65'),node('div',undefined,'skeleton-line w-40'),node('div',undefined,'skeleton-row'),node('div',undefined,'skeleton-row'));
   wrap.append(c);
  }else{
   for(let i=0;i<5;i++)wrap.append(node('div',undefined,'skeleton-row'));
  }
  return wrap;
 }
 function printCertificates(list){
  if(!list||!list.length)return;
  find('#print-sheet')?.remove();
  const sheet=node('div',undefined,'print-only');sheet.id='print-sheet';
  for(const x of list){
   const page=node('section',undefined,'cert-page');
   const hdr=node('div',undefined,'cert-header');
   hdr.append(node('span','المملكة العربية السعودية · وزارة التعليم'),node('span','ابتدائية الحبيل'));
   const title=node('h1','شهادة شكر وتفوق','cert-title');
   const sub=node('p','تمنح إدارة ابتدائية الحبيل هذه الشهادة للطالبة / الطالب:','muted');
   const nm=node('div',x.name,'cert-name');
   const body=node('p','تقديرًا للتفوق الدراسي والتميز الملحوظ في '+x.grade+' ('+x.class_name+' — '+x.section+') بتحقيق معدل '+fmtPct(x.average)+' في '+x.subjectsCount+' مواد خلال الفترة الدراسية المعتمدة.','cert-body');
   const ftr=node('div',undefined,'cert-footer');
   ftr.append(node('span','إدارة ابتدائية الحبيل'),node('span','صمم بواسطة أ. أفراح عسيري'));
   page.append(hdr,title,sub,nm,body,ftr);sheet.append(page);
  }
  document.body.append(sheet);
  document.body.classList.add('printing-sheet');
  const cleanup=()=>{document.body.classList.remove('printing-sheet');sheet.remove();window.removeEventListener('afterprint',cleanup);};
  window.addEventListener('afterprint',cleanup);
  window.print();
 }
 function levelLabel(lvl){return lvl==='above'?'فوق المتوسط':lvl==='mid'?'متوسط':lvl==='low'?'منخفض':'غير مرصود';}
 function stackedList(items){
  const list=node('div',undefined,'bar-list'),colors=[['above','#075c49'],['mid','#d49b27'],['low','#b83a2d']];
  for(const it of items){
   const row=node('div',undefined,'bar-row'),hd=node('div',undefined,'bar-head');
   hd.append(node('span',it.label),node('strong',it.right));
   const trk=node('div',undefined,'stacked-track'),lv=it.levels||{},tot=(lv.above||0)+(lv.mid||0)+(lv.low||0);
   if(tot){
    for(const [k,col] of colors){
     if(!lv[k])continue;
     const seg=node('div',undefined,'stacked-seg');seg.style.width=((lv[k]/tot)*100).toFixed(2)+'%';seg.style.background=col;seg.title=levelLabel(k)+': '+lv[k]+' ('+Math.round((lv[k]/tot)*100)+'%)';trk.append(seg);
    }
   }
   row.append(hd,trk);list.append(row);
  }
  return list;
 }
 function svgDonut(lv){
  const NS='http://www.w3.org/2000/svg',items=[{lbl:'فوق المتوسط (≥ 80%)',val:lv.above||0,color:'#075c49'},{lbl:'متوسط (50% – 79%)',val:lv.mid||0,color:'#d49b27'},{lbl:'منخفض (< 50%)',val:lv.low||0,color:'#b83a2d'}];
  const total=items.reduce((s,x)=>s+x.val,0),wrap=node('div',undefined,'donut-wrap');
  const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 120 120');svg.setAttribute('width','132');svg.setAttribute('height','132');svg.setAttribute('aria-hidden','true');
  const r=44,c=2*Math.PI*r;let off=0;
  if(!total){const bg=document.createElementNS(NS,'circle');bg.setAttribute('cx','60');bg.setAttribute('cy','60');bg.setAttribute('r',String(r));bg.setAttribute('fill','none');bg.setAttribute('stroke','#e8efec');bg.setAttribute('stroke-width','16');svg.append(bg);}
  else{
   for(const it of items){
    if(!it.val)continue;
    const len=(it.val/total)*c,seg=document.createElementNS(NS,'circle');
    seg.setAttribute('cx','60');seg.setAttribute('cy','60');seg.setAttribute('r',String(r));seg.setAttribute('fill','none');seg.setAttribute('stroke',it.color);seg.setAttribute('stroke-width','16');
    seg.setAttribute('stroke-dasharray',len.toFixed(2)+' '+(c-len).toFixed(2));seg.setAttribute('stroke-dashoffset',(-off).toFixed(2));
    seg.setAttribute('transform','rotate(-90 60 60)');svg.append(seg);off+=len;
   }
  }
  const txt=document.createElementNS(NS,'text');txt.setAttribute('x','60');txt.setAttribute('y','64');txt.setAttribute('text-anchor','middle');txt.setAttribute('font-size','18');txt.setAttribute('font-weight','700');txt.setAttribute('fill','#172e2a');txt.textContent=String(total);svg.append(txt);
  const leg=node('div',undefined,'donut-legend');
  for(const it of items){
   const row=node('div',undefined,'legend-item'),left=node('span'),dot=node('span',undefined,'legend-dot');
   dot.style.background=it.color;left.append(dot,document.createTextNode(it.lbl));
   row.append(left,node('strong',it.val+' ('+(total?Math.round((it.val/total)*100):0)+'%)'));leg.append(row);
  }
  wrap.append(svg,leg);return wrap;
 }
 function buildMatrix(rows,onCellSelect){
  const byClass=[...new Set(rows.map(r=>r.grade))].length===1;
  const rowKeys=byClass?[...new Set(rows.map(r=>r.class_id))]:[...new Set(rows.map(r=>r.grade))];
  const subjs=[...new Set(rows.map(r=>r.subject_id))];
  const wrap=node('div',undefined,'table-wrap'),tbl=node('table'),hd=node('thead'),hr=node('tr');
  hr.append(node('th',byClass?'الفصل':'الصف'));
  for(const id of subjs)hr.append(node('th',rows.find(r=>r.subject_id===id)?.subject_name||id));
  hd.append(hr);tbl.append(hd);const bd=node('tbody');
  for(const rk of rowKeys){
   const tr=node('tr');
   const rowSample=byClass?rows.find(r=>r.class_id===rk):null;
   tr.append(node('td',byClass?(rowSample.grade+' '+rowSample.class_name+' ('+rowSample.section+')'):rk));
   for(const id of subjs){
    const match=rows.filter(r=>(byClass?r.class_id===rk:r.grade===rk)&&r.subject_id===id&&r.average!==null);
    const td=node('td');
    if(!match.length){td.textContent='—';}
    else{
     const totRec=match.reduce((s,x)=>s+x.recorded,0),wAvg=totRec?match.reduce((s,x)=>s+x.average*x.recorded,0)/totRec:null;
     const cls=wAvg>=0.85?'heat-hi':wAvg>=0.7?'heat-mid':wAvg>=0.5?'heat-low':'heat-danger';
     const sym=wAvg>=0.85?'✓':wAvg>=0.7?'•':wAvg>=0.5?'⚑':'!';
     if(onCellSelect){
      const btn=node('button',sym+' '+fmtPct(wAvg),'heat-btn '+cls);btn.type='button';
      btn.title=byClass?'عرض كشف هذا الفصل والمادة':'تصفية فصول '+rk+' في هذه المادة';
      btn.addEventListener('click',()=>onCellSelect(byClass?rowSample.grade:rk,id,match));
      td.append(btn);
     }else{
      td.append(node('span',sym+' '+fmtPct(wAvg),'heat-cell '+cls));
     }
    }
    tr.append(td);
   }
   bd.append(tr);
  }
  tbl.append(bd);wrap.append(tbl);return wrap;
 }
 function classRankingList(rows){
  const byCls={};
  for(const r of rows){
   if(r.average===null)continue;
   const k=r.class_id;
   if(!byCls[k])byCls[k]={label:r.grade+' '+r.class_name+' ('+r.section+')',sum:0,rec:0};
   byCls[k].sum+=r.average*r.recorded;byCls[k].rec+=r.recorded;
  }
  return Object.values(byCls).map(x=>({label:x.label,pct:x.rec?x.sum/x.rec:0,right:fmtPct(x.rec?x.sum/x.rec:0)})).sort((a,b)=>b.pct-a.pct);
 }
 async function loadPeriodAnalytics(p){
  activePeriod=p;
  if(periodCache[p]){renderExecutive(periodCache[p]);return;}
  const ex=find('#live-executive');
  if(ex){ex.querySelector('.exec-grid,.kpi-band,.notice')?.remove();ex.append(skeletonBlock('cards'));}
  try{const an=await api('analytics',{period:p});periodCache[p]=an;renderExecutive(an);}catch(_){ex?.querySelector('.skeleton-wrap')?.remove();}
 }
 function renderExecutive(an){
  analyticsCache=an;
  if(an.period)periodCache[an.period]=an;
  find('#live-executive')?.remove();
  const director=currentUser?.role==='headmistress';
  const wrap=node('div');wrap.id='live-executive';wrap.style.marginTop='24px';
  const pbar=node('div',undefined,'period-bar'),pills=node('div',undefined,'period-pills'),actionsBox=node('div',undefined,'exec-actions');
  for(const [p,lbl] of [['1','الفترة الأولى'],['2','الفترة الثانية'],['compare','مقارنة الفترتين']]){
   const b=node('button',lbl,'secondary');b.setAttribute('aria-pressed',String((an.period||'1')===p));
   b.addEventListener('click',()=>loadPeriodAnalytics(p));pills.append(b);
  }
  const printExec=node('button','طباعة ملخص الإدارة','secondary');printExec.type='button';
  printExec.addEventListener('click',()=>window.print());
  actionsBox.append(pills,printExec);
  pbar.append(node('h2','لوحة المتابعة الأكاديمية للمديرة'),actionsBox);wrap.append(pbar);
  if(an.period==='compare'){
   if(!an.comparisonAvailable){
    wrap.append(node('p','لا تتوفر بيانات مكتملة للفترة الثانية بعد؛ تُفعّل مقارنة الفترتين والانتقال بين المستويات تلقائيًا للطلاب ذوي القياسين المتوافقين فقط.','notice'));
   }else{
    const kpi=node('div',undefined,'kpi-band');
    for(const [l,v] of [['القياسات المقارنة',an.pairedCount],['تحسنوا',an.improvedCount],['تراجعوا',an.declinedCount],['صعدوا مستوى',an.transition?.up||0]]){const box=node('div',undefined,'kpi-box');box.append(node('span',l),node('strong',String(v)));kpi.append(box);}
    wrap.append(kpi);
   }
   const anchor=find('#live-school');if(anchor)anchor.before(wrap);else find('#overview').append(wrap);
   if(school)renderReports(school,true);
   return;
  }
  if(!an.hasData){
   wrap.append(node('p','لا توجد درجات مرصودة لهذه الفترة حتى الآن.','notice'));
   const anchor=find('#live-school');if(anchor)anchor.before(wrap);else find('#overview').append(wrap);
   return;
  }
  if(director&&school){
   const stats=find('#overview .stats'),comp=school.completion||{},lv=an.levels||{},total=(lv.above||0)+(lv.mid||0)+(lv.low||0);
   stats.classList.add('stats-4');stats.replaceChildren();
   const ov=an.overview||{};
   const cards=[
    ['المتوسط والوسيط (ف'+an.period+')',fmtPct(ov.average),'الوسيط: '+fmtPct(ov.median)+' · '+ov.students+' طالبة/طالب',''],
    ['اكتمال الرصد (العليا)',fmtPct(comp.completionRate),(comp.recordedEligible||0)+' من '+(comp.expectedEligible||0)+' · '+(comp.deferredClasses||0)+' مؤجلة',''],
    ['فوق المتوسط (≥80%)',String(lv.above||0),(total?Math.round(((lv.above||0)/total)*100):0)+'% من الدرجات · متوسط: '+(lv.mid||0),'kpi-card-good'],
    ['منخفض (<50%)',String(lv.low||0),(an.singleSubjectDeficit||[]).length+' تعثر نوعي بمادة واحدة','kpi-card-warn']
   ];
   for(const [t,v,n,cls] of cards){const a=node('article',undefined,cls||undefined);a.append(node('span',t),node('strong',v),node('small',n));stats.append(a);}
  }
  if(an.briefing?.length){
   const bGrid=node('div',undefined,'brief-grid'),titles=['أعلى مادة أداءً','تركّز حالات الدعم','التعثر النوعي'],icons=['★','⚑','◈'];
   an.briefing.slice(0,3).forEach((line,idx)=>{
    const item=node('div',undefined,'brief-item brief-'+idx),ico=node('span',icons[idx]||'•','brief-ico'),txt=node('div');
    ico.setAttribute('aria-hidden','true');
    txt.append(node('b',titles[idx]||'مؤشر تربوي'),node('span',line.replace('<50%','أقل من 50%')));
    item.append(ico,txt);bGrid.append(item);
   });
   wrap.append(bGrid);
  }
  const wlList=an.supportWatchlist||[];
  if(wlList.length){
   const byStu={};
   for(const x of wlList){const k=x.name+'|'+x.grade+'|'+x.class_name;if(!byStu[k])byStu[k]={name:x.name,grade:x.grade,cls:x.class_name,subjs:[]};byStu[k].subjs.push(x.subject_name);}
   const multi=Object.values(byStu).filter(s=>s.subjs.length>=2).sort((a,b)=>b.subjs.length-a.subjs.length);
   if(multi.length){
    const pa=node('div',undefined,'priority-alert');
    pa.append(node('h3','⚑ أولوية التدخل المبكر: تعثر في أكثر من مادة ('+multi.length+')'),node('p','طلاب وطالبات يحتاجون خطة دعم مركزة لتجاوز الصعوبات في أكثر من مادة:','muted'));
    const chips=node('div',undefined,'priority-chips');
    for(const m of multi.slice(0,12))chips.append(node('span',m.name+' ('+m.grade+' '+m.cls+') — '+m.subjs.join('، '),'priority-chip'));
    pa.append(chips);wrap.append(pa);
   }
  }
  const grid=node('div',undefined,'exec-grid');
  const distCard=node('section',undefined,'panel exec-card');
  distCard.append(node('h2','توزيع المستويات الثلاثة'),svgDonut(an.levels||{}),node('p','التصنيف المعتمد: فوق المتوسط (≥80%) · متوسط (50–79%) · منخفض (<50%).','muted'));
  const subjCard=node('section',undefined,'panel exec-card');
  subjCard.append(node('h2','المستويات على مستوى المادة'),stackedList((an.bySubject||[]).map(s=>({label:s.subject_name+' ('+s.recorded+')',right:'متوسط '+fmtPct(s.average)+' · وسيط '+fmtPct(s.median),levels:s.levels}))));
  const gradeCard=node('section',undefined,'panel exec-card');
  gradeCard.append(node('h2','المستويات على مستوى الصفوف'),stackedList((an.byGrade||[]).map(g=>({label:g.grade+' ('+g.students+')',right:'متوسط '+fmtPct(g.average)+' · وسيط '+fmtPct(g.median),levels:g.levels}))));
  const secCard=node('section',undefined,'panel exec-card');
  secCard.append(node('h2','المستويات على مستوى الأقسام'),stackedList((an.bySection||[]).map(sec=>({label:sec.section+' ('+sec.students+')',right:'متوسط '+fmtPct(sec.average)+' · وسيط '+fmtPct(sec.median),levels:sec.levels}))));
  grid.append(distCard,subjCard,gradeCard,secCard);
  const stRows=an.studentSummaries||[];
  if(stRows.length){
   const stCard=node('section',undefined,'panel exec-card exec-full');
   const stHd=node('div',undefined,'table-top');stHd.style.padding='0 0 12px';
   stHd.append(node('h2','تقديرات ومستويات طلاب الصف ('+stRows.length+')'));
   const expSt=node('button','تصدير CSV','secondary');
   stHd.append(expSt);stCard.append(stHd);
   const sf=node('div',undefined,'exec-filters'),sg=node('select'),sc=node('select'),sl=node('select'),sq=node('input');
   sq.type='search';sq.placeholder='بحث باسم الطالب/ة…';
   populate(sg,[...new Set(stRows.map(r=>r.grade))].map(g=>({value:g,label:g})),'جميع الصفوف');
   populate(sc,[...new Set(stRows.map(r=>r.class_name))].map(x=>({value:x,label:'فصل '+x})),'جميع الفصول');
   populate(sl,[{value:'above',label:'فوق المتوسط'},{value:'mid',label:'متوسط'},{value:'low',label:'منخفض'}],'جميع المستويات');
   sf.append(sg,sc,sl,sq);stCard.append(sf);
   const sWrap=node('div',undefined,'table-wrap');sWrap.style.marginTop='14px';sWrap.style.maxHeight='420px';
   const sTbl=node('table'),sHead=node('thead'),sHr=node('tr');
   for(const h of ['الاسم','الصف','الفصل','لغتي','رياضيات','علوم','إنجليزي','المعدل','التقدير'])sHr.append(node('th',h));
   sHead.append(sHr);sTbl.append(sHead);const sBd=node('tbody');sTbl.append(sBd);sWrap.append(sTbl);stCard.append(sWrap);
   let curList=stRows;
   function drawStudents(){
    const q=sq.value.trim();
    curList=stRows.filter(r=>(!sg.value||r.grade===sg.value)&&(!sc.value||r.class_name===sc.value)&&(!sl.value||r.level===sl.value)&&(!q||r.name.includes(q)));
    sBd.replaceChildren();
    for(const r of curList.slice(0,120)){
     const tr=node('tr'),tdLvl=node('td');tdLvl.append(levelBadge(r.level));
     tr.append(node('td',r.name),node('td',r.grade),node('td',r.class_name+' ('+r.section+')'),node('td',r.scores.ARB??'—'),node('td',r.scores.MAT??'—'),node('td',r.scores.SCI??'—'),node('td',r.scores.ENG??'—'),node('td',fmtPct(r.average)),tdLvl);
     sBd.append(tr);
    }
   }
   expSt.addEventListener('click',()=>downloadCsv('alhubail-students-levels.csv',['الاسم','الصف','الفصل','القسم','لغتي','رياضيات','علوم','إنجليزي','المعدل','التقدير'],curList.map(r=>[r.name,r.grade,r.class_name,r.section,r.scores.ARB??'',r.scores.MAT??'',r.scores.SCI??'',r.scores.ENG??'',fmtPct(r.average),levelLabel(r.level)])));
   sg.addEventListener('change',drawStudents);sc.addEventListener('change',drawStudents);sl.addEventListener('change',drawStudents);sq.addEventListener('input',drawStudents);
   drawStudents();grid.append(stCard);
  }
  const csRows=an.byClassSubject||[];
  if(csRows.length){
   const fltCard=node('section',undefined,'panel exec-card exec-full');
   fltCard.append(node('h2','تحليل الفصول والمواد (تصفية تفاعلية)'));
   const fBar=node('div',undefined,'exec-filters'),gSel=node('select'),sSel=node('select'),mSel=node('select');
   populate(gSel,[...new Set(csRows.map(r=>r.grade))].map(g=>({value:g,label:g})),'جميع الصفوف');
   populate(sSel,[...new Set(csRows.map(r=>r.section))].map(x=>({value:x,label:x})),'جميع الأقسام');
   populate(mSel,[...new Set(csRows.map(r=>r.subject_id))].map(id=>({value:id,label:csRows.find(r=>r.subject_id===id)?.subject_name||id})),'جميع المواد');
   fBar.append(gSel,sSel,mSel);fltCard.append(fBar);
   const body=node('div');body.style.marginTop='16px';fltCard.append(body);
   const drillBox=node('div');drillBox.style.marginTop='16px';drillBox.setAttribute('aria-live','polite');fltCard.append(drillBox);
   async function openMatrixDrill(match){
    if(!match||!match.length)return;
    if(match.length===1){
     const target=match[0];
     drillBox.replaceChildren(node('h3','جارٍ تحميل كشف '+target.grade+' '+target.class_name+' — '+target.subject_name+'…'),skeletonBlock('table'));
     try{
      const rep=await api('report',{class_id:target.class_id,subject_id:target.subject_id});
      const dWrap=node('div',undefined,'table-wrap'),dTbl=node('table'),dHd=node('thead'),dHr=node('tr');
      for(const h of ['م','الاسم','الدرجة','التقدير'])dHr.append(node('th',h));dHd.append(dHr);dTbl.append(dHd);
      const dBd=node('tbody');
      rep.students.forEach((st,idx)=>{const sr=node('tr'),tdL=node('td');tdL.append(levelBadge(st.level));sr.append(node('td',String(idx+1)),node('td',st.name),node('td',fmtScore(st.score,st.max_score)),tdL);dBd.append(sr);});
      dTbl.append(dBd);dWrap.append(dTbl);
      drillBox.replaceChildren(node('h3',rep.grade+' '+rep.class_name+' ('+rep.section+') — '+rep.subject_name+' · المتوسط: '+fmtPct(rep.average)),dWrap);
     }catch(_){drillBox.replaceChildren(node('p','تعذر تحميل الكشف التفصيلي.','notice'));}
     return;
    }
    const g=match[0].grade;if(gSel.value!==g){gSel.value=g;drawFiltered();}
   }
   function drawFiltered(){
    const sub=csRows.filter(r=>(!gSel.value||r.grade===gSel.value)&&(!sSel.value||r.section===sSel.value)&&(!mSel.value||r.subject_id===mSel.value));
    body.replaceChildren();drillBox.replaceChildren();
    if(!sub.length){body.append(node('p','لا توجد نتائج مطابقة للتصفية.','muted'));return;}
    body.append(node('p','اضغطي على أي خلية في خريطة الحرارة لعرض فصول الصف أو كشف المادة مباشرة.','muted'),buildMatrix(sub,(_g,_id,match)=>openMatrixDrill(match)),node('h3','ترتيب الفصول المطابقة'),barList(classRankingList(sub)));
   }
   gSel.addEventListener('change',drawFiltered);sSel.addEventListener('change',drawFiltered);mSel.addEventListener('change',drawFiltered);
   drawFiltered();grid.append(fltCard);
  }
  wrap.append(grid);
  const anchor=find('#live-school');
  if(anchor)anchor.before(wrap);else find('#overview').append(wrap);
  if(school)renderReports(school,true);
 }
 function liveSummary(data){
  analyticsCache=null;periodCache={};activePeriod='1';find('#live-executive')?.remove();
  school=data;const director=currentUser.role==='headmistress';find('.environment').textContent='جلسة موثقة · '+(director?'مديرة المدرسة':'معلمة');find('.toolbar .pill').textContent=currentUser.display_name;
  find('#overview .heading h1').textContent=director?'متابعة أداء المدرسة':'متابعة فصولي وموادي';find('#overview .heading p').textContent='البيانات من قاعدة المدرسة. لا تُحسب الدرجة غير المرصودة صفرًا.';
  const cta=find('#overview .heading button');if(cta&&director){cta.textContent='التقارير والتحليل ←';cta.dataset.go='reports';}
  const stats=find('#overview .stats');stats.replaceChildren();const comp=data.completion||{};const pct=comp.completionRate!==null&&comp.completionRate!==undefined?Math.round(comp.completionRate*100)+'%':'—';const recNote=data.recordedSuppressed?'حماية خصوصية المجموعات الصغيرة':comp.expectedEligible?'اكتمال الرصد: '+pct+' ('+comp.recordedEligible+' / '+comp.expectedEligible+')':'لا تقييمات معتمدة حتى إضافتها';const clsNote=comp.deferredClasses?comp.deferredClasses+' فصول (الأول والثاني) مؤجلة':'حسب توزيع المدرسة';for(const [title,value,note] of [['الطلاب والطالبات',data.students,'مؤشر عام للمدرسة دون أسماء'],['الفصول',data.classes,clsNote],['الدرجات المرصودة',data.recordedSuppressed?'محجوب':data.recorded,recNote]]){const a=node('article');a.append(node('span',title),node('strong',String(value)),node('small',note));stats.append(a);}
  const ovGrid=find('#overview .overview-grid');if(ovGrid)ovGrid.hidden=director;
  const empty=find('#overview .overview-grid .panel .empty');empty.replaceChildren(node('h3',director?'جميع فصول المدرسة':'الفصول المسندة إليكِ'),node('p',director?'التفاصيل الفردية متاحة للمديرة. المعلمات لم تُضف حساباتهن بعد.':data.accessibleClasses.length?'التفاصيل الفردية تخص موادك وفصولك فقط.':'لا يوجد إسناد حتى الآن؛ ستتولى الإدارة ربط المواد والفصول.'));
  find('#overview .panel-title .pill').textContent='متصل';find('#exit').textContent='تسجيل الخروج';const exitTop=find('#exit-top');if(exitTop)exitTop.hidden=false;find('#preview').hidden=true;
  const account=find('#account .empty');account.replaceChildren(node('h2',currentUser.display_name),node('p',director?'الصلاحية: مديرة المدرسة — جميع الفصول. إدارة المعلمات والإسناد ستفعّل عند توفير بياناتهن.':'الصلاحية: معلمة — التفاصيل الفردية لفصولك وموادك فقط، والمؤشرات العامة للمدرسة دون أسماء بقية الطلاب.'));
  find('#live-school')?.remove();const panel=node('section',undefined,'panel');panel.id='live-school';panel.style.marginTop='24px';const title=node('div',undefined,'panel-title');title.append(node('h2','استعراض الطلاب والطالبات حسب الصلاحية'));panel.append(title);
  const filters=node('div',undefined,'filters'),classLabel=node('label','الفصل والقسم'),classes=node('select'),subjectLabel=node('label','المادة'),subjects=node('select'),button=node('button','عرض القائمة','primary');classes.id='live-class';subjects.id='live-subject';populate(classes,data.accessibleClasses.map(c=>({value:c.class_id,label:[c.grade,c.class_name,c.section].join(' — ')})),'اختاري الفصل');populate(subjects,[],'اختاري الفصل أولًا');classLabel.append(classes);subjectLabel.append(subjects);filters.append(classLabel,subjectLabel,button);panel.append(filters);const result=node('div',undefined,'empty');result.setAttribute('aria-live','polite');result.textContent='لا تظهر أسماء قبل اختيار فصل ومادة مصرحين.';panel.append(result);find('#overview').append(panel);
  classes.addEventListener('change',()=>{const allowed=director?data.subjectList:data.subjectList.filter(s=>data.assignments.some(a=>a.class_id===classes.value&&a.subject_id===s.subject_id));populate(subjects,allowed.map(s=>({value:s.subject_id,label:s.name})),'اختاري المادة');result.replaceChildren(node('p','اختاري المادة ثم اعرضي القائمة.'));});
  button.addEventListener('click',async()=>{if(!classes.value||!subjects.value){result.textContent='اختاري الفصل والمادة أولًا.';return;}button.disabled=true;result.replaceChildren(skeletonBlock('table'));try{const r=await api('roster',{class_id:classes.value,subject_id:subjects.value});const wrap=node('div',undefined,'table-wrap'),table=node('table'),head=node('thead'),tr=node('tr');tr.append(node('th','م'),node('th','الاسم'));head.append(tr);table.append(head);const body=node('tbody');r.students.forEach((s,i)=>{const row=node('tr');row.append(node('td',String(i+1)),node('td',s.name));body.append(row);});table.append(body);wrap.append(table);result.replaceChildren(node('p','عدد السجلات: '+r.students.length),wrap);}catch(e){result.textContent='تعذر عرض القائمة. تحققي من الجلسة والصلاحيات.';}finally{button.disabled=false;}});
  find('#report-message').textContent=data.recorded?'':'لا درجات في قاعدة الويب حتى الآن. لا يمكن استنتاج مستوى أو تحسن قبل رصد التقييمات.';
  renderReports(data,director);
 }
 function fmtPct(v){return v===null||v===undefined?'—':Math.round(v*100)+'%';}
 function fmtScore(s,m){return s===null||s===undefined?'غير مرصود':String(s)+(m?' / '+m:'');}
 function renderReports(data,director){
  find('#live-reports')?.remove();
  const panel=find('#reports .panel'),empty=find('#reports .panel .empty'),printBtn=find('#reports .panel .empty button');
  if(printBtn){printBtn.disabled=false;printBtn.onclick=()=>window.print();}
  const host=node('div');host.id='live-reports';host.style.marginTop='16px';panel.append(host);
  let activeTab='تشخيص الفترة الأولى';
  function draw(){
   host.replaceChildren();
   if(activeTab==='مقارنة الفترتين'){
    host.append(node('p',data.comparisonAvailable?'تتوفر قياسات للفترتين.':'لا تتوفر درجات للفترة الثانية بعد؛ لا تُستنتج مقارنة أو تحسن دون قياسين متوافقين للطالب والمادة نفسيهما.','notice'));
    return;
   }
   if(activeTab==='بطاقة الطالبة'){
    if(!director){host.append(node('p','بطاقة الطالبة الشاملة متاحة لإدارة المدرسة فقط.','notice'));return;}
    const f=node('div',undefined,'filters'),cLbl=node('label','الفصل'),cSel=node('select'),sLbl=node('label','الطالبة / الطالب'),sSel=node('select'),go=node('button','عرض البطاقة','primary');
    populate(cSel,data.accessibleClasses.map(c=>({value:c.class_id,label:[c.grade,c.class_name,c.section].join(' — ')})),'اختاري الفصل');
    populate(sSel,[],'اختاري الفصل أولًا');cLbl.append(cSel);sLbl.append(sSel);f.append(cLbl,sLbl,go);host.append(f);
    const out=node('div');out.setAttribute('aria-live','polite');host.append(out);
    cSel.addEventListener('change',async()=>{
     populate(sSel,[],'جارٍ التحميل…');if(!cSel.value)return;
     const subj=(data.classSubjectsSummary||[]).find(x=>x.class_id===cSel.value)?.subject_id||data.subjectList[0]?.subject_id||'MAT';
     try{const r=await api('roster',{class_id:cSel.value,subject_id:subj});populate(sSel,r.students.map(x=>({value:x.student_id,label:x.name})),'اختاري الطالبة / الطالب');}catch(_){populate(sSel,[],'تعذر التحميل');}
    });
    go.addEventListener('click',async()=>{
     if(!sSel.value){out.textContent='اختاري الطالبة / الطالب أولًا.';return;}
     go.disabled=true;out.replaceChildren(skeletonBlock('card'));
     try{
      const card=await api('studentCard',{student_id:sSel.value});
      if(!card.student){out.textContent='لم يُعثر على السجل.';return;}
      const headRow=node('div',undefined,'table-top');headRow.style.padding='16px 0 8px';
      headRow.append(node('strong',[card.student.name,card.student.grade,card.student.class_name,card.student.section].join(' — ')));
      const pCardBtn=node('button','طباعة البطاقة','secondary');pCardBtn.type='button';pCardBtn.addEventListener('click',()=>window.print());
      headRow.append(pCardBtn);
      const wrap=node('div',undefined,'table-wrap'),tbl=node('table'),hd=node('thead'),hr=node('tr');
      for(const h of ['المادة','الفترة','الدرجة','التقدير'])hr.append(node('th',h));hd.append(hr);tbl.append(hd);
      const bd=node('tbody');
      for(const sc of card.scores){const tr=node('tr'),tdL=node('td');tdL.append(levelBadge(sc.level));tr.append(node('td',sc.subject_name),node('td','الفترة '+sc.period),node('td',fmtScore(sc.score,sc.max_score)),tdL);bd.append(tr);}
      tbl.append(bd);wrap.append(tbl);out.replaceChildren(headRow,wrap,node('p','حدود تصنيف الأداء بانتظار اعتماد المدرسة.','notice'));
     }catch(_){out.textContent='تعذر تحميل البطاقة.';}finally{go.disabled=false;}
    });
    return;
   }
   if(!director||!Array.isArray(data.classSubjectsSummary)){
    host.append(node('p',data.recordedSuppressed?'المؤشرات محجوبة لحماية خصوصية المجموعات الصغيرة.':('المعدل العام للمدرسة: '+fmtPct(data.average)+' · التفاصيل الفردية متاحة للمديرة، وللمعلمة ضمن إسنادها فقط.'),'notice'));
    return;
   }
   const comp=data.completion||{};
   host.append(node('p','اكتمال الرصد للصفوف العليا (الثالث–السادس): '+fmtPct(comp.completionRate)+' ('+(comp.recordedEligible||0)+' من '+(comp.expectedEligible||0)+') · الأول والثاني مؤجلان ('+(comp.deferredClasses||0)+' فصول) · حدود التصنيف بانتظار اعتماد المدرسة.','notice'));
   if(analyticsCache){
    const d=analyticsCache.distribution||{};
    const band=node('div',undefined,'kpi-band');
    for(const [lbl,val] of [['90% – 100%',d.gte90||0],['75% – 89%',d.r75_89||0],['50% – 74%',d.r50_74||0],['أقل من 50% (دعم)',d.below50||0]]){const box=node('div',undefined,'kpi-box');box.append(node('span',lbl),node('strong',String(val)));band.append(box);}
    host.append(band);
   }
   const rows=data.classSubjectsSummary;
   const f=node('div',undefined,'filters'),gLbl=node('label','الصف'),gSel=node('select'),mLbl=node('label','المادة'),mSel=node('select');
   const grades=[...new Set(rows.map(r=>r.grade))],subjs=[...new Set(rows.map(r=>r.subject_id))];
   populate(gSel,grades.map(g=>({value:g,label:g})),'جميع الصفوف');
   populate(mSel,subjs.map(id=>({value:id,label:rows.find(r=>r.subject_id===id)?.subject_name||id})),'جميع المواد');
   gLbl.append(gSel);mLbl.append(mSel);f.append(gLbl,mLbl);host.append(f);
   const actions=node('div',undefined,'report-actions'),expSummary=node('button','تصدير ملخص الفصول CSV','secondary');
   expSummary.addEventListener('click',()=>downloadCsv('alhubail-period1-summary.csv',['الصف','الفصل','القسم','المادة','المرصود','المتوقع','الاكتمال','المتوسط','الأدنى','الأعلى'],rows.map(r=>[r.grade,r.class_name,r.section,r.subject_name,r.recorded,r.expected,fmtPct(r.completionRate),fmtPct(r.average),r.minScore??'',r.maxScore??''])));
   actions.append(expSummary);host.append(actions);
   const wrap=node('div',undefined,'table-wrap'),tbl=node('table'),hd=node('thead'),hr=node('tr');
   for(const h of ['الصف','الفصل','القسم','المادة','المرصود','الاكتمال','المتوسط','الأدنى–الأعلى','كشف'])hr.append(node('th',h));
   hd.append(hr);tbl.append(hd);const bd=node('tbody');tbl.append(bd);wrap.append(tbl);host.append(wrap);
   const detail=node('div');detail.setAttribute('aria-live','polite');detail.style.marginTop='16px';host.append(detail);
   if(analyticsCache){
    const wl=analyticsCache.supportWatchlist||[],tp=analyticsCache.topPerformers||[];
    const wlTitle=node('div',undefined,'table-top');wlTitle.append(node('h3','رادار الدعم والمتابعة (أقل من 50%: '+wl.length+' حالة)'));
    const expWl=node('button','تصدير قائمة الدعم CSV','secondary');
    expWl.addEventListener('click',()=>downloadCsv('alhubail-support-watchlist.csv',['الاسم','الصف','الفصل','القسم','المادة','الدرجة','العظمى'],wl.map(x=>[x.name,x.grade,x.class_name,x.section,x.subject_name,x.score,x.max_score])));
    wlTitle.append(expWl);host.append(wlTitle);
    if(wl.length){
     const wWrap=node('div',undefined,'table-wrap'),wTbl=node('table'),wHd=node('thead'),wHr=node('tr');
     for(const h of ['الاسم','الصف','الفصل','القسم','المادة','الدرجة'])wHr.append(node('th',h));wHd.append(wHr);wTbl.append(wHd);
     const wBd=node('tbody');
     for(const x of wl){const tr=node('tr'),sc=node('td');sc.append(node('span',x.score+' / '+x.max_score,'badge-warn'));tr.append(node('td',x.name),node('td',x.grade),node('td',x.class_name),node('td',x.section),node('td',x.subject_name),sc);wBd.append(tr);}
     wTbl.append(wBd);wWrap.append(wTbl);host.append(wWrap);
    }else host.append(node('p','لا توجد درجات أقل من 50% في البيانات المرصودة.','notice'));
    const ssd=analyticsCache.singleSubjectDeficit||[];
    if(ssd.length){
     const sdTitle=node('div',undefined,'table-top');sdTitle.append(node('h3','تعثر نوعي في مادة واحدة فقط ('+ssd.length+')'));
     const expSd=node('button','تصدير التعثر النوعي CSV','secondary');
     expSd.addEventListener('click',()=>downloadCsv('alhubail-single-subject-deficit.csv',['الاسم','الصف','الفصل','القسم','المادة المتعثرة','الدرجة','متوسط بقية المواد'],ssd.map(x=>[x.name,x.grade,x.class_name,x.section,x.weak_subject,x.weak_score+'/'+x.max_score,fmtPct(x.other_avg)])));
     sdTitle.append(expSd);host.append(sdTitle);
     const sWrap=node('div',undefined,'table-wrap'),sTbl=node('table'),sHd=node('thead'),sHr=node('tr');
     for(const h of ['الاسم','الصف','الفصل','المادة المتعثرة','الدرجة','بقية المواد'])sHr.append(node('th',h));sHd.append(sHr);sTbl.append(sHd);
     const sBd=node('tbody');
     for(const x of ssd){const tr=node('tr');tr.append(node('td',x.name),node('td',x.grade),node('td',x.class_name),node('td',x.weak_subject),node('td',x.weak_score+' / '+x.max_score),node('td',fmtPct(x.other_avg)));sBd.append(tr);}
     sTbl.append(sBd);sWrap.append(sTbl);host.append(sWrap);
    }
    const tpTitle=node('div',undefined,'table-top');tpTitle.append(node('h3','لوحة التميز (متوسط ≥ 95%: '+tp.length+' طالب وطالبة)'));
    const tpBtns=node('div',undefined,'exec-actions');
    const expTp=node('button','تصدير المتفوقين CSV','secondary');
    expTp.addEventListener('click',()=>downloadCsv('alhubail-top-performers.csv',['الاسم','الصف','الفصل','القسم','المعدل','عدد المواد'],tp.map(x=>[x.name,x.grade,x.class_name,x.section,fmtPct(x.average),x.subjectsCount])));
    tpBtns.append(expTp);
    if(tp.length){
     const certAll=node('button','طباعة جميع الشهادات','primary');certAll.type='button';
     certAll.addEventListener('click',()=>printCertificates(tp));
     tpBtns.append(certAll);
    }
    tpTitle.append(tpBtns);host.append(tpTitle);
    if(tp.length){
     const tWrap=node('div',undefined,'table-wrap'),tTbl=node('table'),tHd=node('thead'),tHr=node('tr');
     for(const h of ['الاسم','الصف','الفصل','القسم','المعدل','المواد','شهادة'])tHr.append(node('th',h));tHd.append(tHr);tTbl.append(tHd);
     const tBd=node('tbody');
     for(const x of tp){const tr=node('tr'),av=node('td'),tdC=node('td'),cBtn=node('button','طباعة شهادة','secondary');cBtn.type='button';cBtn.addEventListener('click',()=>printCertificates([x]));tdC.append(cBtn);av.append(node('span',fmtPct(x.average),'badge-good'));tr.append(node('td',x.name),node('td',x.grade),node('td',x.class_name),node('td',x.section),av,node('td',String(x.subjectsCount)),tdC);tBd.append(tr);}
     tTbl.append(tBd);tWrap.append(tTbl);host.append(tWrap);
    }
   }
   function renderRows(){
    bd.replaceChildren();
    const filtered=rows.filter(r=>(!gSel.value||r.grade===gSel.value)&&(!mSel.value||r.subject_id===mSel.value));
    for(const r of filtered){
     const tr=node('tr'),btn=node('button','عرض الكشف','secondary');
     btn.addEventListener('click',async()=>{
      btn.disabled=true;detail.replaceChildren(node('h3','جارٍ تحميل كشف '+r.grade+' '+r.class_name+' — '+r.subject_name+'…'),skeletonBlock('table'));
      try{
       const rep=await api('report',{class_id:r.class_id,subject_id:r.subject_id});
       const dWrap=node('div',undefined,'table-wrap'),dTbl=node('table'),dHd=node('thead'),dHr=node('tr');
       for(const h of ['م','الاسم','الدرجة','التقدير'])dHr.append(node('th',h));dHd.append(dHr);dTbl.append(dHd);
       const dBd=node('tbody');
       rep.students.forEach((st,idx)=>{const sr=node('tr'),tdL=node('td');tdL.append(levelBadge(st.level));sr.append(node('td',String(idx+1)),node('td',st.name),node('td',fmtScore(st.score,st.max_score)),tdL);dBd.append(sr);});
       dTbl.append(dBd);dWrap.append(dTbl);
       detail.replaceChildren(node('h3',rep.grade+' '+rep.class_name+' ('+rep.section+') — '+rep.subject_name+' · المتوسط: '+fmtPct(rep.average)),dWrap);
      }catch(_){detail.textContent='تعذر تحميل الكشف.';}finally{btn.disabled=false;}
     });
     const tdBtn=node('td');tdBtn.append(btn);
     const range=r.minScore!==null&&r.maxScore!==null?(r.minScore+' – '+r.maxScore):'—';
     tr.append(node('td',r.grade),node('td',r.class_name),node('td',r.section),node('td',r.subject_name),node('td',r.recorded+' / '+r.expected),node('td',fmtPct(r.completionRate)),node('td',fmtPct(r.average)),node('td',range),tdBtn);
     bd.append(tr);
    }
   }
   gSel.addEventListener('change',renderRows);mSel.addEventListener('change',renderRows);renderRows();
  }
  document.querySelectorAll('[data-report]').forEach(b=>b.addEventListener('click',()=>{activeTab=b.dataset.report;draw();}));
  draw();
 }
 find('#login-form').addEventListener('submit',async e=>{e.preventDefault();if(DEV_OVERVIEW_MODE||!configured)return;const button=find('#login-submit');button.disabled=true;feedback.textContent='جارٍ التحقق من الاتصال والحساب…';let success=false;try{const username=find('#username').value,password=find('#password').value;const r=await connect().request({action:'login',payload:{username,password}});find('#password').value='';if(!r?.ok){feedback.textContent=r?.error?.code==='NOT_READY'?'حساب المديرة لم يُهيأ بعد. أكملي إعداد الحساب من ملف القاعدة.':'تعذر تسجيل الدخول. تحققي من البيانات أو حاولي لاحقًا.';return;}token=r.data.token;currentUser=r.data.user;saveToken(token);const summary=await api('summary');liveSummary(summary);if(currentUser.role==='headmistress')api('analytics',{period:'1'}).then(renderExecutive).catch(()=>{});find('#login').hidden=true;find('#workspace').hidden=false;find('.skip').href='#workspace-main';page('overview');success=true;}catch(e){const code=e?.message||'';feedback.textContent=code==='BACKEND_TIMEOUT'?'تعذر تهيئة جسر الاتصال بالخدمة (BACKEND_TIMEOUT). تأكدي من السماح للإطارات وملفات الارتباط أو حدّثي الصفحة.':code==='REQUEST_TIMEOUT'?'انتهت مهلة الرد من الخادم (REQUEST_TIMEOUT). أعيدي المحاولة بعد لحظات.':'تعذر الاتصال بالخدمة'+(code?' ('+code+')':'')+'. لم يتم تسجيل الدخول.';if(connection){connection.close();connection=null;}token=null;currentUser=null;saveToken(null);}finally{find('#password').value='';button.disabled=false;if(!success)find('#login').hidden=false;}});
 async function doLogout(e){if(!token)return;if(e)e.stopImmediatePropagation();const oldToken=token;token=null;currentUser=null;school=null;analyticsCache=null;saveToken(null);if(find('#exit-top'))find('#exit-top').hidden=true;find('#overview .stats')?.classList.remove('stats-4');find('#live-school')?.remove();find('#live-reports')?.remove();find('#live-executive')?.remove();find('#workspace').hidden=true;find('#login').hidden=false;feedback.textContent='جارٍ إنهاء الجلسة…';try{const r=await connection.request({action:'logout',token:oldToken});if(!r?.ok)feedback.textContent='أُغلقت الجلسة محليًا؛ تعذر تأكيد إلغائها في الخادم.';else feedback.textContent='تم تسجيل الخروج.';}catch(_){feedback.textContent='أُغلقت الجلسة محليًا؛ تعذر تأكيد إلغائها في الخادم.';}finally{if(connection)connection.close();connection=null;try{sessionStorage.setItem('alhubail-logout-note',feedback.textContent);}catch(_){}location.reload();}}
 find('#exit').addEventListener('click',doLogout,true);
 find('#exit-top')?.addEventListener('click',doLogout);
 setInterval(()=>{if(token)api('session').catch(()=>{});},900000);
 (async()=>{
  if(DEV_OVERVIEW_MODE||!configured)return;
  let saved=null;try{saved=sessionStorage.getItem(SESSION_KEY);}catch(_){}
  if(!saved||!/^[a-f0-9]{64}$/.test(saved))return;
  token=saved;const btn=find('#login-submit');btn.disabled=true;feedback.textContent='جارٍ استعادة الجلسة…';
  try{
   const s=await api('session');currentUser=s.user;
   const summary=await api('summary');liveSummary(summary);
   if(currentUser.role==='headmistress')api('analytics',{period:'1'}).then(renderExecutive).catch(()=>{});
   find('#login').hidden=true;find('#workspace').hidden=false;find('.skip').href='#workspace-main';page('overview');
  }catch(_){token=null;currentUser=null;saveToken(null);if(feedback.textContent==='جارٍ استعادة الجلسة…')feedback.textContent='الدخول للحسابات المعتمدة فقط.';}
  finally{btn.disabled=false;}
 })();
 (() => {
  const gradesSec=find('#grades'),saveBar=gradesSec?.querySelector('.save-bar');
  if(!gradesSec||!saveBar)return;
  const statusSpan=saveBar.querySelector('span'),saveBtn=saveBar.querySelector('button.primary');
  const dirtySet=new Set();
  function syncSaveBar(){
   const count=dirtySet.size;
   saveBar.dataset.dirty=count?'true':'false';
   if(statusSpan)statusSpan.textContent=count?'تم تعديل '+count+' درجة — لم تُحفظ بعد':'لا توجد تغييرات للحفظ';
   if(saveBtn)saveBtn.disabled=!count;
  }
  gradesSec.addEventListener('input',e=>{
   if(e.target.matches('table input, table select')){
    dirtySet.add(e.target.dataset.rowId||e.target.name||e.target);
    syncSaveBar();
   }
  });
 })();
})();
