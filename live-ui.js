(function(){'use strict';
 const find=s=>document.querySelector(s),feedback=find('#login-feedback');let connection=null,token=null,currentUser=null,school=null;
 const configured=typeof window.SCHOOL_BACKEND_URL==='string'&&window.SCHOOL_BACKEND_URL.length>0;
 document.body.classList.toggle('login-configured',configured);
 const SESSION_KEY='alhubail-session-token';
 function saveToken(t){try{if(t)localStorage.setItem(SESSION_KEY,t);else{localStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(SESSION_KEY);}}catch(_){}}
 if(configured){find('#username').disabled=false;find('#username').required=true;find('#password').disabled=false;find('#password').required=true;find('#login-submit').disabled=false;feedback.textContent='';connect().ready.catch(()=>{if(connection){connection.close();connection=null;}if(!feedback.textContent)feedback.textContent='تعذّر الاتصال. حاولي تسجيل الدخول مجددًا.';});}
 try{const note=sessionStorage.getItem('alhubail-logout-note');if(note){feedback.textContent=note;sessionStorage.removeItem('alhubail-logout-note');}}catch(_){}
 function connect(){if(!connection)connection=window.createSchoolConnection(window.SCHOOL_BACKEND_URL);return connection;}
 function api(action,payload){const requestToken=token;return connect().request({action,payload,token:requestToken}).then(result=>{if(!result||!result.ok){if(result?.error?.code==='UNAUTHORIZED'&&token===requestToken){token=null;currentUser=null;saveToken(null);clearDashboard();find('#workspace').hidden=true;find('#login').hidden=false;feedback.textContent='انتهت الجلسة. يرجى تسجيل الدخول مجددًا.';}throw Error(result?.error?.code||'SERVICE_UNAVAILABLE');}return result.data;});}
 function clearDashboard(){for(const id of ['#live-school','#live-reports','#live-executive','#exec-students-card','#report-sections','#report-certificates','#report-no-results','#print-sheet'])find(id)?.remove();document.body.classList.remove('printing-sheet');const panel=find('#reports [data-report-pane="classes"]');if(panel){delete panel.dataset.reportPane;panel.hidden=false;for(const child of panel.querySelectorAll('.report-tabs,.empty'))child.hidden=false;}reportSection='results';}
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
 function buildPrintDocument(title,scope,contents){
  const page=node('section',undefined,'official-report'),header=node('header',undefined,'official-header');
  const logo=node('img');logo.src='assets/moe-logo-white.svg';logo.alt='شعار وزارة التعليم';
  const identity=node('div');
  for(const line of ['المملكة العربية السعودية','وزارة التعليم','إدارة تعليم عسير','مدرسة الحبيل الابتدائية'])identity.append(node('div',line));
  header.append(logo,identity);
  const approval=node('div',undefined,'official-approval');approval.append(node('strong','مديرة المدرسة: تركية آل جابر'),node('p','التوقيع: ____________________'));
  page.append(header,node('h1',title),node('p',scope+' · تاريخ الإعداد: '+new Date().toLocaleDateString('ar-SA'),'official-scope'),contents,approval);
  return page;
 }
 function printReport(title,scope,contents){
  if(!currentUser||find('#print-sheet'))return;
  const sheet=node('div',undefined,'print-only');sheet.id='print-sheet';
  const report=buildPrintDocument(title,scope,contents);sheet.append(report);document.body.append(sheet);
  const cleanup=()=>{document.body.classList.remove('printing-sheet');sheet.remove();};
  const print=()=>{if(!sheet.isConnected||!currentUser){cleanup();return;}document.body.classList.add('printing-sheet');window.addEventListener('afterprint',cleanup,{once:true});window.print();};
  report.querySelector('img').decode().then(print,print);
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
  const leg=node('div',undefined,'chart-legend');
  for(const [k,col] of colors){
   const it=node('span',undefined,'chart-legend-item'),sw=node('span',undefined,'chart-swatch');
   sw.style.background=col;it.append(sw,document.createTextNode(levelLabel(k)));leg.append(it);
  }
  list.append(leg);
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
 function heatBand(value){
  return !Number.isFinite(value)?'':value>=.85?'heat-hi':value>=.7?'heat-mid':value>=.5?'heat-low':'heat-danger';
 }
 function buildMatrix(rows,onCellSelect,band='',scope='grade'){
  const byClass=scope==='class',bySubject=scope==='subject';
  const rowKey=r=>byClass?r.class_id:bySubject?r.subject_id:r.grade;
  const colKey=r=>bySubject?r.grade:r.subject_id;
  const rowKeys=[...new Set(rows.map(rowKey))],subjs=[...new Set(rows.map(colKey))];
  const wrap=node('div',undefined,'table-wrap'),tbl=node('table'),hd=node('thead'),hr=node('tr');
  hr.append(node('th',byClass?'الفصل':bySubject?'المادة':'الصف'));
  for(const id of subjs)hr.append(node('th',bySubject?id:rows.find(r=>r.subject_id===id)?.subject_name||id));
  hd.append(hr);tbl.append(hd);const bd=node('tbody');
  for(const rk of rowKeys){
   const tr=node('tr');
   const rowSample=rows.find(r=>rowKey(r)===rk);
   tr.append(node('td',byClass?(rowSample.grade+' — فصل '+rowSample.class_name+' ('+rowSample.section+')'):bySubject?rowSample.subject_name:rk));
   for(const id of subjs){
    const match=rows.filter(r=>rowKey(r)===rk&&colKey(r)===id&&Number.isFinite(r.average));
    const td=node('td');
    if(!match.length){td.textContent='—';}
    else{
     const totRec=match.reduce((s,x)=>s+x.recorded,0),wAvg=totRec?match.reduce((s,x)=>s+x.average*x.recorded,0)/totRec:null;
     const cls=heatBand(wAvg);
     const sym=wAvg>=0.85?'✓':wAvg>=0.7?'•':wAvg>=0.5?'⚑':'!';
     if(!cls||(band&&band!==cls)){td.textContent='—';}
     else if(onCellSelect){
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
   if(!band||tr.querySelector('.'+band))bd.append(tr);
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
  const user=currentUser;
  ex?.querySelector('.period-status')?.remove();
  const status=node('p','جارٍ تحميل الفترة…','notice period-status');status.setAttribute('role','status');ex?.querySelector('.period-bar')?.after(status);
  try{const an=await api('analytics',{period:p});if(currentUser!==user)return;periodCache[p]=an;if(activePeriod===p)renderExecutive(an);}catch(_){if(currentUser===user&&activePeriod===p)status.textContent='تعذّر تحميل الفترة المطلوبة. البيانات الظاهرة تخص الفترة السابقة.';}
 }
 function reportPage(rows,index){
  const pages=Math.max(1,Math.ceil(rows.length/25));index=Math.max(0,Math.min(index,pages-1));
  return {index,pages,rows:rows.slice(index*25,index*25+25)};
 }
 let reportSection='results';
 function selectReportSection(key){
  reportSection=key;
  for(const b of document.querySelectorAll('[data-report-section]'))b.setAttribute('aria-pressed',String(b.dataset.reportSection===key));
  for(const p of document.querySelectorAll('[data-report-pane]'))p.hidden=p.dataset.reportPane!==key;
 }
 function renderExecutive(an){
  analyticsCache=an;
  find('#exec-students-card')?.remove();
  if(an.period)periodCache[an.period]=an;
  find('#live-executive')?.remove();
  const director=currentUser?.role==='headmistress';if(!director)return;
  const wrap=node('div');wrap.id='live-executive';wrap.style.marginTop='24px';
  const pbar=node('div',undefined,'period-bar'),pills=node('div',undefined,'period-pills'),actionsBox=node('div',undefined,'exec-actions');
  for(const [p,lbl] of [['1','الفترة الأولى'],['2','الفترة الثانية'],['compare','مقارنة الفترتين']]){
   const b=node('button',lbl,'secondary');b.setAttribute('aria-pressed',String((an.period||'1')===p));
   b.addEventListener('click',()=>loadPeriodAnalytics(p));pills.append(b);
  }
  const printExec=node('button','طباعة ملخص الإدارة','secondary');printExec.type='button';
  printExec.addEventListener('click',()=>{
   const contents=node('div'),ov=an.overview||{};
   if(an.period==='compare')contents.append(node('p',an.comparisonAvailable?'القياسات المقارنة: '+an.pairedCount+' · تحسن: '+an.improvedCount+' · تراجع: '+an.declinedCount:'لا تتوفر بيانات مكتملة للمقارنة.'));
   else if(!an.hasData)contents.append(node('p','لا توجد درجات مرصودة لهذه الفترة حتى الآن.'));
   else contents.append(node('p','متوسط التحصيل: '+fmtPct(ov.average)),node('p','عدد الطلاب والطالبات: '+ov.students),node('p','درجات بلغت 80% فأكثر: '+(an.levels?.above||0)),node('p','درجات دون 50%: '+(an.levels?.low||0)));
   printReport('ملخص التحصيل الدراسي',an.period==='compare'?'مقارنة الفترتين':String(an.period)==='2'?'الفترة الثانية':'الفترة الأولى',contents);
  });
  actionsBox.append(pills,printExec);
  pbar.append(node('h2','لوحة المتابعة الأكاديمية للمديرة'),actionsBox);wrap.append(pbar);
  const overview=find('#overview');
  if(director)overview.querySelector('.stats').hidden=true;
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
   if(school)renderReports(school,true);
   const anchor=find('#live-school');if(anchor)anchor.before(wrap);else find('#overview').append(wrap);
   return;
  }

  if(director&&school){
   const stats=node('div',undefined,'stats stats-4'),comp=school.completion||{},lv=an.levels||{};
   const ov=an.overview||{};
   const cards=[
    ['متوسط التحصيل',fmtPct(ov.average),ov.students+' طالبًا وطالبة لديهم درجات في هذه الفترة','','عرض التوزيع ↙',()=>find('#exec-dist-card')?.scrollIntoView({block:'start'})],
    ['درجات بلغت 80% فأكثر',String(lv.above||0),'عدد الدرجات، لا عدد الطلاب','kpi-card-good','عرض توزيع الدرجات ↙',()=>find('#exec-dist-card')?.scrollIntoView({block:'start'})],
    ['درجات دون 50%',String(lv.low||0),'عدد الدرجات، لا عدد الطلاب','kpi-card-warn','عرض توزيع الدرجات ↙',()=>find('#exec-dist-card')?.scrollIntoView({block:'start'})]
   ];
   if(String(an.period)==='1'&&comp.expectedEligible>0)cards.splice(1,0,['اكتمال رصد الصفوف الثالث إلى السادس',fmtPct(comp.completionRate),comp.recordedEligible+' من '+comp.expectedEligible+' درجة متوقعة','','عرض الفصول والمواد ↙',()=>find('#exec-matrix-card')?.scrollIntoView({block:'start'})]);
   for(const [t,v,n,cls,hint,onClick] of cards){
    const a=node('article',undefined,'kpi-interactive'+(cls?' '+cls:''));
    const btn=node('button',undefined,'kpi-btn');btn.type='button';
    btn.append(node('span',t),node('strong',v),node('small',n),node('span','عرض التفاصيل ↗','kpi-hint'));
    btn.setAttribute('aria-haspopup','dialog');
    btn.addEventListener('click',()=>showOverviewCard(btn,t,v+' — '+n,hint,onClick));
    a.append(btn);stats.append(a);
   }
   wrap.append(stats);
   if(String(an.period)==='1'&&comp.deferredClasses)wrap.append(node('p',comp.deferredClasses+' فصول من الصفين الأول والثاني مؤجلة، ولا تدخل في نسبة اكتمال الرصد.','notice'));
  }
  const briefs=overviewBriefs(an);
  if(briefs.length){
   const bGrid=node('div',undefined,'brief-grid');
   briefs.forEach(({kind,title,summary,rows})=>{
    const idx=['top','support','deficit'].indexOf(kind);
    const item=node('button',undefined,'brief-item brief-action brief-'+idx),ico=node('span',['★','⚑','◈'][idx],'brief-ico'),txt=node('span');
    item.type='button';item.setAttribute('aria-haspopup','dialog');
    ico.setAttribute('aria-hidden','true');
    txt.append(node('b',title),node('span',summary));
    txt.append(node('span','عرض التفاصيل ↗','kpi-hint'));item.append(ico,txt);bGrid.append(item);
    item.onclick=()=>{
     const list=node('ul',undefined,'overview-detail-list');
     for(const r of rows){
      const location=[r.grade,r.class_name?'فصل '+r.class_name:null,r.section].filter(Boolean).join(' · ');
      const detail=kind==='top'?'المتوسط: '+fmtPct(r.average)+' · درجات مرصودة: '+r.recorded:
       kind==='support'?r.subject_name+' · '+fmtScore(r.score,r.max_score):r.weak_subject+' · '+fmtScore(r.weak_score,r.max_score)+' · متوسط بقية المواد: '+fmtPct(r.other_avg);
      const li=node('li');li.append(node('strong',kind==='top'?location:r.name),node('div',kind==='top'?detail:[location,detail].filter(Boolean).join(' — ')));list.append(li);
     }
     const period=String(an.period)==='2'?'الفترة الثانية':'الفترة الأولى';
     showOverviewCard(item,title,summary,null,null,rows.length?list:node('p','لا تتوفر تفاصيل لهذا المؤشر في الفترة المختارة.'),{period,printable:rows.length>0});
    };
   });
   wrap.append(bGrid);
  }
  const wlList=an.supportWatchlist||[];
  if(wlList.length){
   const byStu={};
   for(const x of wlList){const k=x.name+'|'+x.grade+'|'+x.class_name;if(!byStu[k])byStu[k]={name:x.name,grade:x.grade,cls:x.class_name,subjs:[]};byStu[k].subjs.push(x.subject_name);}
   const multi=Object.values(byStu).filter(s=>s.subjs.length>=2).sort((a,b)=>b.subjs.length-a.subjs.length);
   if(multi.length){
    const pa=node('div',undefined,'priority-alert');pa.id='exec-priority-alert';
    pa.append(node('h3','⚑ أولوية التدخل المبكر: تعثر في أكثر من مادة ('+multi.length+')'),node('p','طلاب وطالبات يحتاجون خطة دعم مركزة لتجاوز الصعوبات في أكثر من مادة:','muted'));
    const chips=node('div',undefined,'priority-chips');
    for(const m of multi.slice(0,12))chips.append(node('span',m.name+' ('+m.grade+' '+m.cls+') — '+m.subjs.join('، '),'priority-chip'));
    pa.append(chips);wrap.append(pa);
   }
  }
  const grid=node('div',undefined,'exec-grid');
  const distCard=node('section',undefined,'panel exec-card');distCard.id='exec-dist-card';
  distCard.append(node('h2','توزيع المستويات الثلاثة'),svgDonut(an.levels||{}),node('p','التصنيف المعتمد: فوق المتوسط (≥80%) · متوسط (50–79%) · منخفض (<50%).','muted'));
  const subjCard=node('section',undefined,'panel exec-card');
  subjCard.append(node('h2','توزيع الدرجات حسب المادة'),stackedList((an.bySubject||[]).map(s=>({label:s.subject_name+' ('+s.recorded+' درجة)',right:'المتوسط '+fmtPct(s.average),levels:s.levels}))));
  const gradeCard=node('section',undefined,'panel exec-card');
  gradeCard.append(node('h2','توزيع الدرجات حسب الصف'),stackedList((an.byGrade||[]).map(g=>({label:g.grade+' ('+g.recorded+' درجة)',right:'المتوسط '+fmtPct(g.average),levels:g.levels}))));
  const secCard=node('section',undefined,'panel exec-card');
  secCard.append(node('h2','توزيع الدرجات حسب القسم'),stackedList((an.bySection||[]).map(sec=>({label:sec.section+' ('+sec.recorded+' درجة)',right:'المتوسط '+fmtPct(sec.average),levels:sec.levels}))));
  const breakdown=node('div',undefined,'breakdown'),switcher=node('div',undefined,'period-pills'),chart=node('div');
  switcher.setAttribute('role','group');switcher.setAttribute('aria-label','طريقة عرض توزيع الدرجات');
  for(const [label,card] of [['المواد',subjCard],['الصفوف',gradeCard],['الأقسام',secCard]]){
   const button=node('button',label,'secondary');button.type='button';button.setAttribute('aria-pressed',String(card===subjCard));
   button.onclick=()=>{for(const b of switcher.children)b.setAttribute('aria-pressed',String(b===button));chart.replaceChildren(card);};switcher.append(button);
  }
  chart.append(subjCard);breakdown.append(switcher,chart);grid.append(distCard,breakdown);
  const stRows=an.studentSummaries||[];
  if(stRows.length){
   const stCard=node('section',undefined,'panel exec-card exec-full');stCard.id='exec-students-card';
   const stHd=node('div',undefined,'table-top');stHd.style.padding='0 0 12px';
   stHd.append(node('h2','تقديرات ومستويات طلاب الصف ('+stRows.length+')'));
   const expSt=node('button','تصدير CSV','secondary');
   const printSt=node('button','معاينة طباعة النتائج','secondary');
   stHd.append(printSt,expSt);stCard.append(stHd);
   const sf=node('div',undefined,'exec-filters'),sg=node('select'),sc=node('select'),sl=node('select'),sq=node('input');
   sq.type='search';sq.placeholder='بحث باسم الطالب/ة…';
   populate(sg,[...new Set(stRows.map(r=>r.grade))].map(g=>({value:g,label:g})),'جميع الصفوف');
   populate(sc,[...new Set(stRows.map(r=>r.class_name))].map(x=>({value:x,label:'فصل '+x})),'جميع الفصول');
   populate(sl,[{value:'above',label:'فوق المتوسط'},{value:'mid',label:'متوسط'},{value:'low',label:'منخفض'}],'جميع المستويات');
   const clear=node('button','مسح الفلاتر','secondary'),count=node('p',undefined,'report-count');count.setAttribute('role','status');
   for(const [control,label] of [[sg,'الصف'],[sc,'الفصل'],[sl,'المستوى'],[sq,'بحث بالاسم']])control.setAttribute('aria-label',label);
   clear.onclick=()=>{for(const control of [sg,sc,sl,sq])control.value='';drawStudents();};
   const filterBox=node('details',undefined,'result-filter-box');filterBox.open=window.matchMedia('(min-width: 641px)').matches;
   sf.append(sg,sc,sl,clear);filterBox.append(node('summary','الفلاتر'),sf);stCard.append(sq,count,filterBox,node('p','الطباعة والتصدير يشملان كل النتائج المطابقة، لا الصفحة الحالية فقط.','muted'));
   const sWrap=node('div',undefined,'table-wrap results-table');sWrap.style.marginTop='14px';
   const sTbl=node('table'),sHead=node('thead'),sHr=node('tr');
   for(const h of ['الاسم','الصف','الفصل','لغتي','رياضيات','علوم','إنجليزي','المعدل','التقدير'])sHr.append(node('th',h));
   sHead.append(sHr);sTbl.append(sHead);const sBd=node('tbody');sTbl.append(sBd);sWrap.append(sTbl);stCard.append(sWrap);
   let curList=stRows,pageIndex=0;
   const pager=node('div',undefined,'report-pager'),prev=node('button','السابق','secondary'),next=node('button','التالي','secondary'),pageLabel=node('span');
   pageLabel.setAttribute('aria-live','polite');pager.append(prev,pageLabel,next);stCard.append(pager);
   prev.onclick=()=>{pageIndex--;drawStudents();};next.onclick=()=>{pageIndex++;drawStudents();};
   const periodLabel=String(an.period)==='2'?'الفترة الثانية':'الفترة الأولى';
   const rowCells=r=>[r.name,r.grade,r.class_name+' ('+r.section+')',r.scores.ARB??'—',r.scores.MAT??'—',r.scores.SCI??'—',r.scores.ENG??'—',fmtPct(r.average),levelLabel(r.level)];
   printSt.onclick=()=>{
    const table=node('table');table.append(sHead.cloneNode(true));const body=node('tbody');
    for(const r of curList){const row=node('tr');row.append(...rowCells(r).map(v=>node('td',v)));body.append(row);}table.append(body);
    printReport('نتائج الطلاب', [periodLabel,curList.length+' نتيجة',sg.value||'جميع الصفوف',sc.value?'فصل '+sc.value:'جميع الفصول',sl.value?levelLabel(sl.value):'جميع المستويات',sq.value.trim()?'بحث بالاسم مطبّق':''].filter(Boolean).join(' · '),table);
   };
   function drawStudents(){
    const q=sq.value.trim();
    curList=stRows.filter(r=>(!sg.value||r.grade===sg.value)&&(!sc.value||r.class_name===sc.value)&&(!sl.value||r.level===sl.value)&&(!q||r.name.includes(q)));
    sBd.replaceChildren();
    count.textContent=curList.length?curList.length+' نتيجة مطابقة من '+stRows.length:'لا توجد نتائج مطابقة للفلاتر.';
    printSt.disabled=expSt.disabled=!curList.length;
    const page=reportPage(curList,pageIndex);pageIndex=page.index;
    pageLabel.textContent='صفحة '+(page.index+1)+' من '+page.pages;prev.disabled=page.index===0;next.disabled=page.index+1===page.pages;pager.hidden=page.pages===1;
    for(const r of page.rows){
     const tr=node('tr'),tdLvl=node('td');tdLvl.append(levelBadge(r.level));
     tr.append(node('td',r.name),node('td',r.grade),node('td',r.class_name+' ('+r.section+')'),node('td',r.scores.ARB??'—'),node('td',r.scores.MAT??'—'),node('td',r.scores.SCI??'—'),node('td',r.scores.ENG??'—'),node('td',fmtPct(r.average)),tdLvl);
     const nameCell=tr.firstChild,open=node('button',r.name,'secondary');nameCell.replaceChildren(open);
     open.onclick=()=>{
      const dialog=node('dialog',undefined,'result-detail'),title=node('h2','بطاقة الطالب — '+r.name),close=node('button','رجوع إلى النتائج','secondary');
      dialog.setAttribute('aria-label',title.textContent);dialog.append(title,node('p',periodLabel+' · '+r.grade+' · '+r.class_name+' · '+r.section));
      const labels=['لغتي','الرياضيات','العلوم','الإنجليزية','المعدل','المستوى'];rowCells(r).slice(3).forEach((value,i)=>dialog.append(node('p',labels[i]+': '+value)));
      close.onclick=()=>dialog.close();dialog.append(close);dialog.onclose=()=>{dialog.remove();open.focus();};stCard.append(dialog);dialog.showModal();
     };
     sBd.append(tr);
    }
   }
   expSt.addEventListener('click',()=>downloadCsv('alhubail-students-period-'+(String(an.period)==='2'?'2':'1')+'.csv',['الفترة','الاسم','الصف','الفصل','القسم','لغتي','رياضيات','علوم','إنجليزي','المعدل','التقدير'],curList.map(r=>[periodLabel,r.name,r.grade,r.class_name,r.section,r.scores.ARB??'',r.scores.MAT??'',r.scores.SCI??'',r.scores.ENG??'',fmtPct(r.average),levelLabel(r.level)])));
   const applyFilters=()=>{pageIndex=0;drawStudents();};
   sg.addEventListener('change',applyFilters);sc.addEventListener('change',applyFilters);sl.addEventListener('change',applyFilters);sq.addEventListener('input',applyFilters);
   stHd.querySelector('h2').textContent='نتائج الطلاب — الفترة '+(String(an.period)==='2'?'الثانية':'الأولى')+' ('+stRows.length+')';
   stCard.dataset.reportPane='results';drawStudents();find('#reports').append(stCard);
   const link=node('button','عرض نتائج الطلاب في التقارير ←','secondary');
   link.onclick=()=>{selectReportSection('results');find('nav [data-page="reports"]').click();};wrap.append(link);
  }
  const csRows=an.byClassSubject||[];
  if(csRows.length){
   const fltCard=node('section',undefined,'panel exec-card exec-full');fltCard.id='exec-matrix-card';
   fltCard.append(node('h2','تحليل الفصول والمواد (تصفية تفاعلية)'));
   const fBar=node('div',undefined,'exec-filters'),gSel=node('select'),sSel=node('select'),mSel=node('select');
   populate(gSel,[...new Set(csRows.map(r=>r.grade))].map(g=>({value:g,label:g})),'جميع الصفوف');
   populate(sSel,[...new Set(csRows.map(r=>r.section))].map(x=>({value:x,label:x})),'جميع الأقسام');
   populate(mSel,[...new Set(csRows.map(r=>r.subject_id))].map(id=>({value:id,label:csRows.find(r=>r.subject_id===id)?.subject_name||id})),'جميع المواد');
   const cSel=node('select');cSel.setAttribute('aria-label','الفصل');
   gSel.setAttribute('aria-label','الصف');sSel.setAttribute('aria-label','القسم');mSel.setAttribute('aria-label','المادة');
   const classRows=()=>csRows.filter(r=>(!gSel.value||r.grade===gSel.value)&&(!sSel.value||r.section===sSel.value));
   function refreshClasses(){const previous=cSel.value;cSel.replaceChildren();populate(cSel,[...new Map(classRows().map(r=>[r.class_id,{value:r.class_id,label:r.grade+' — فصل '+r.class_name+' ('+r.section+')'}])).values()],'جميع الفصول');if([...cSel.options].some(o=>o.value===previous))cSel.value=previous;}
   refreshClasses();fBar.append(gSel,sSel,cSel,mSel);fltCard.append(fBar);
   const scopes=node('div',undefined,'chart-legend');scopes.setAttribute('role','group');scopes.setAttribute('aria-label','مستوى عرض الخريطة');fltCard.append(scopes);
   let scope='grade';
   function setScope(value){scope=value;for(const b of scopes.children)b.setAttribute('aria-pressed',String(b.dataset.scope===scope));drawFiltered();}
   for(const [value,label] of [['subject','حسب المادة'],['grade','حسب الصف'],['class','حسب الفصل']]){const b=node('button',label,'secondary heat-filter');b.type='button';b.dataset.scope=value;b.onclick=()=>setScope(value);scopes.append(b);}
   const body=node('div');body.style.marginTop='16px';fltCard.append(body);
   const drillBox=node('div');drillBox.style.marginTop='16px';drillBox.setAttribute('aria-live','polite');fltCard.append(drillBox);
   async function openMatrixDrill(match){
    if(!match||!match.length)return;
    const open=target=>{
     if(!openClassReport){drillBox.replaceChildren(node('p','لا يوجد كشف متاح لهذا الاختيار.','notice'));return;}
     find('nav [data-page="reports"]').click();selectReportSection('classes');
     openClassReport({...target,period:String(an.period)});
    };
    if(match.length===1){open(match[0]);return;}
    drillBox.replaceChildren(node('h3','اختاري الفصل لفتح كشف '+match[0].subject_name));
    for(const target of match){const button=node('button',target.grade+' '+target.class_name+' — '+target.section,'secondary');button.onclick=()=>open(target);drillBox.append(button);}
   }
   let selectedBand='';
   function drawFiltered(){
    const sub=classRows().filter(r=>(!cSel.value||r.class_id===cSel.value)&&(!mSel.value||r.subject_id===mSel.value));
    body.replaceChildren();drillBox.replaceChildren();
    if(!sub.length){body.append(node('p','لا توجد نتائج مطابقة للتصفية.','muted'));return;}
    const hLeg=node('div',undefined,'chart-legend');
    hLeg.setAttribute('role','group');hLeg.setAttribute('aria-label','تصفية الخريطة حسب متوسط الخلية');
    for(const [lbl,cls] of [['الكل',''],['ممتاز: 85% فأكثر','heat-hi'],['جيد: 70% إلى أقل من 85%','heat-mid'],['متابعة: 50% إلى أقل من 70%','heat-low'],['دعم عاجل: أقل من 50%','heat-danger']]){
     const b=node('button',lbl,'heat-btn heat-filter '+cls);b.type='button';b.setAttribute('aria-pressed',String(cls===selectedBand));
     b.onclick=()=>{selectedBand=selectedBand===cls?'':cls;drawFiltered();body.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});};hLeg.append(b);
    }
    const matrix=buildMatrix(sub,(_g,_id,match)=>openMatrixDrill(match),selectedBand,scope);
    const count=matrix.querySelectorAll('.heat-btn').length,status=node('p',count?count+' خلية مطابقة':'لا توجد خلايا مطابقة لهذا المستوى.','muted');status.setAttribute('role','status');
    body.append(node('p','اختاري مستوى لتصفية متوسطات الخريطة، ثم اضغطي على خلية لفتح تفاصيلها.','muted'),hLeg,status);
    if(count)body.append(matrix);
    if(!selectedBand)body.append(node('h3','ترتيب الفصول المطابقة'),barList(classRankingList(sub)));
   }
   for(const control of [gSel,sSel])control.addEventListener('change',()=>{refreshClasses();drawFiltered();});
   mSel.addEventListener('change',drawFiltered);cSel.addEventListener('change',()=>setScope(cSel.value?'class':scope));
   setScope(scope);grid.append(fltCard);
  }
  wrap.append(grid);
  const anchor=find('#live-school');
  if(anchor)anchor.before(wrap);else find('#overview').append(wrap);
  if(school)renderReports(school,true);
 }
 function liveSummary(data){
  find('#exec-students-card')?.remove();
  find('#overview .stats').hidden=false;
  analyticsCache=null;periodCache={};activePeriod='1';find('#live-executive')?.remove();
  school=data;const director=currentUser.role==='headmistress';find('.environment').textContent='جلسة موثقة · '+(director?'مديرة المدرسة':'معلمة');find('.toolbar .pill').textContent=currentUser.display_name;
  find('#overview .heading h1').textContent=director?'متابعة أداء المدرسة':'متابعة فصولي وموادي';find('#overview .heading p').textContent='البيانات من قاعدة المدرسة. لا تُحسب الدرجة غير المرصودة صفرًا.';
  const cta=find('#overview .heading button');if(cta&&director){cta.textContent='التقارير والتحليل ←';cta.dataset.go='reports';}
  const stats=find('#overview .stats');stats.replaceChildren();const comp=data.completion||{};const pct=comp.completionRate!==null&&comp.completionRate!==undefined?Math.round(comp.completionRate*100)+'%':'—';const recNote=data.recordedSuppressed?'حماية خصوصية المجموعات الصغيرة':comp.expectedEligible?'اكتمال الرصد: '+pct+' ('+comp.recordedEligible+' / '+comp.expectedEligible+')':'لا تقييمات معتمدة حتى إضافتها';const clsNote=comp.deferredClasses?comp.deferredClasses+' فصول (الأول والثاني) مؤجلة':'حسب توزيع المدرسة';for(const [title,value,note] of [['الطلاب والطالبات',data.students,'مؤشر عام للمدرسة دون أسماء'],['الفصول',data.classes,clsNote],['الدرجات المرصودة',data.recordedSuppressed?'محجوب':data.recorded,recNote]]){const a=node('article');a.append(node('span',title),node('strong',String(value)),node('small',note));stats.append(a);}
  const ovGrid=find('#overview .overview-grid');if(ovGrid)ovGrid.hidden=director;
  const empty=find('#overview .overview-grid .panel .empty');empty.replaceChildren(node('h3',director?'جميع فصول المدرسة':'الفصول المسندة إليكِ'),node('p',director?'التفاصيل الفردية متاحة للمديرة. المعلمات لم تُضف حساباتهن بعد.':data.accessibleClasses.length?'التفاصيل الفردية تخص موادك وفصولك فقط.':'لا يوجد إسناد حتى الآن؛ ستتولى الإدارة ربط المواد والفصول.'));
  find('#overview .panel-title .pill').textContent='متصل';find('#exit').textContent='تسجيل الخروج';find('#preview').hidden=true;
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
 function overviewBriefs(an){
  const subjects=an.bySubject||[],cards=[];
  const top=subjects.filter(s=>Number.isFinite(s.average)).sort((a,b)=>b.average-a.average)[0];
  if(top)cards.push({kind:'top',title:'أعلى مادة أداءً',summary:top.subject_name+' بمتوسط '+fmtPct(top.average),rows:(an.byClassSubject||[]).filter(r=>r.subject_id===top.subject_id&&Number.isFinite(r.average)).sort((a,b)=>b.average-a.average)});
  const support=subjects.slice().sort((a,b)=>(b.dist?.below50||0)-(a.dist?.below50||0))[0];
  if(support?.dist?.below50>0)cards.push({kind:'support',title:'تركّز حالات الدعم',summary:support.subject_name+' · '+support.dist.below50+' درجة دون 50%',rows:(an.supportWatchlist||[]).filter(r=>r.subject_id===support.subject_id)});
  const rows=an.singleSubjectDeficit||[];
  if(rows.length)cards.push({kind:'deficit',title:'التعثر النوعي',summary:rows.length+' حالة تعثر في مادة واحدة مع تميّز في بقية المواد المرصودة',rows});
  return cards;
 }
 function showOverviewCard(trigger,title,summary,actionLabel,action,details,exports){
  const dialog=node('dialog',undefined,'overview-card-dialog'),close=node('button','إغلاق','secondary'),go=node('button',actionLabel,'secondary');
  dialog.setAttribute('aria-label',title);close.type=go.type='button';
  const actions=node('div',undefined,'report-actions');actions.append(close);if(action)actions.append(go);
  dialog.append(node('h2',title),node('p',summary));
  if(exports){
   const status=node('p',undefined,'muted');status.setAttribute('role','status');
   const text=['مدرسة الحبيل الابتدائية',exports.period,title,summary].join('\n');
   const share=node('button','مشاركة الملخص دون أسماء','secondary');share.type='button';actions.append(share);
   share.onclick=async()=>{
    try{
     if(typeof navigator.share==='function'){await navigator.share({title,text});return;}
     await navigator.clipboard.writeText(text);status.textContent='نُسخ الملخص دون أسماء.';
    }catch(error){if(error.name==='AbortError')return;dialog.querySelector('.overview-share-text')?.remove();const copy=node('textarea',undefined,'overview-share-text');copy.value=text;copy.readOnly=true;copy.setAttribute('aria-label','الملخص دون أسماء');status.before(copy);copy.focus();copy.select();status.textContent='يمكنك نسخ الملخص يدويًا.';}
   };
   if(exports.printable){
    const print=node('button','معاينة طباعة القائمة','secondary');print.type='button';actions.append(print);
    print.onclick=()=>{const content=node('div'),list=details.cloneNode(true);for(const row of list.querySelectorAll('[hidden]'))row.hidden=false;content.append(node('p',summary),list);finish(false);printReport(title,exports.period,content);};
   }
   if(details?.matches('ul')&&details.children.length>1){
    const search=node('input',undefined,'overview-list-search'),count=node('p',undefined,'muted');search.type='search';search.placeholder='ابحثي في القائمة…';search.setAttribute('aria-label','البحث في تفاصيل المؤشر');count.setAttribute('role','status');
    const update=()=>{const query=search.value.trim().toLocaleLowerCase('ar');let found=0;for(const row of details.children){row.hidden=!row.textContent.toLocaleLowerCase('ar').includes(query);if(!row.hidden)found++;}count.textContent=found+' من '+details.children.length+' · الطباعة تشمل القائمة كاملة';};
    search.oninput=update;update();dialog.append(search,count);
   }
   dialog.append(status);
  }
  if(details)dialog.append(details);dialog.append(actions);trigger.closest('#live-executive').append(dialog);
  const finish=follow=>{dialog.close();dialog.remove();trigger.focus({preventScroll:true});if(follow)action();};
  close.onclick=()=>finish(false);go.onclick=()=>finish(true);
  dialog.oncancel=e=>{e.preventDefault();finish(false);};
  dialog.showModal();close.focus();
 }
 function matchesClassReport(report,scope){
  return !!report&&report.class_id===scope.class_id&&report.subject_id===scope.subject_id&&String(report.period)===String(scope.period);
 }
 let openClassReport=null;
 function renderReports(data,director){
  openClassReport=null;
  find('#live-reports')?.remove();
  const panel=find('#reports .panel'),empty=find('#reports .panel .empty'),printBtn=find('#reports .panel .empty button');
  if(printBtn)printBtn.disabled=true;
  panel.querySelector('.report-tabs').hidden=true;
  if(empty)empty.hidden=true;
  find('#report-sections')?.remove();
  const tabs=node('div',undefined,'report-section-nav');tabs.id='report-sections';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','أقسام التقارير');
  if(director){for(const [key,label] of [['results','نتائج الطلاب'],['classes','كشوف الفصول والمواد'],['certificates','الشهادات']]){const b=node('button',label,'secondary');b.dataset.reportSection=key;b.onclick=()=>selectReportSection(key);tabs.append(b);}panel.before(tabs);}
  const host=node('div');host.id='live-reports';host.style.marginTop='16px';panel.append(host);
  panel.dataset.reportPane='classes';
  find('#report-certificates')?.remove();find('#report-no-results')?.remove();
  const certificates=node('section',undefined,'panel');certificates.id='report-certificates';certificates.dataset.reportPane='certificates';panel.after(certificates);
  if(director&&!find('#exec-students-card')){const notice=node('p','لا توجد نتائج طلاب لهذه الفترة.','panel notice');notice.id='report-no-results';notice.dataset.reportPane='results';panel.after(notice);}
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
   const period=String(analyticsCache?.period||'1'),label=period==='2'?'الفترة الثانية':'الفترة الأولى';
   host.append(node('h2','كشوف الفصول والمواد — '+(period==='compare'?'اختاري فترة واحدة':label)));
   const rows=period==='1'?(data.classSubjectsSummary||[]):period==='2'?(analyticsCache?.byClassSubject||[]):[];
   if(!rows.length){host.append(node('p','لا توجد كشوف متاحة لهذا الاختيار.','notice'));return;}
   const f=node('div',undefined,'filters'),gLbl=node('label','الصف'),gSel=node('select'),mLbl=node('label','المادة'),mSel=node('select');
   const grades=[...new Set(rows.map(r=>r.grade))],subjs=[...new Set(rows.map(r=>r.subject_id))];
   populate(gSel,grades.map(g=>({value:g,label:g})),'جميع الصفوف');
   populate(mSel,subjs.map(id=>({value:id,label:rows.find(r=>r.subject_id===id)?.subject_name||id})),'جميع المواد');
   gLbl.append(gSel);mLbl.append(mSel);f.append(gLbl,mLbl);host.append(f);
   const actions=node('div',undefined,'report-actions'),expSummary=node('button','تصدير ملخص الفصول CSV','secondary');
   expSummary.addEventListener('click',()=>downloadCsv('alhubail-period'+period+'-summary.csv',['الفترة','الصف','الفصل','القسم','المادة','المرصود','المتوقع','الاكتمال','المتوسط','الأدنى','الأعلى'],rows.filter(r=>(!gSel.value||r.grade===gSel.value)&&(!mSel.value||r.subject_id===mSel.value)).map(r=>[label,r.grade,r.class_name,r.section,r.subject_name,r.recorded,r.expected,fmtPct(r.completionRate),fmtPct(r.average),r.minScore??'',r.maxScore??''])));
   actions.append(expSummary);host.append(actions);
   const wrap=node('div',undefined,'table-wrap'),tbl=node('table'),hd=node('thead'),hr=node('tr');
   for(const h of ['الصف','الفصل','القسم','المادة','المرصود','الاكتمال','المتوسط','الأدنى–الأعلى','كشف'])hr.append(node('th',h));
   hd.append(hr);tbl.append(hd);const bd=node('tbody');tbl.append(bd);wrap.append(tbl);host.append(wrap);
   const detail=node('div');detail.setAttribute('aria-live','polite');detail.style.marginTop='16px';host.append(detail);
   wrap.before(detail);
   let version=0;
   openClassReport=async(target)=>{
    if(!host.isConnected||String(target.period)!==period)return;
    const user=currentUser,request=++version;
    detail.replaceChildren(node('p','جارٍ تحميل الكشف…','notice'));
    try{
     const rep=await api('report',{class_id:target.class_id,subject_id:target.subject_id,period});
     if(request!==version||!host.isConnected||currentUser!==user)return;
     if(!matchesClassReport(rep,target)){detail.replaceChildren(node('p','لا يتوفر كشف مطابق للفترة والفصل والمادة المختارة.','notice'));return;}
     const dWrap=node('div',undefined,'table-wrap'),dTbl=node('table'),hd=node('thead'),hr=node('tr'),bd=node('tbody');
     for(const h of ['م','الاسم','الدرجة','التقدير'])hr.append(node('th',h));hd.append(hr);dTbl.append(hd,bd);
     rep.students.forEach((st,i)=>{const tr=node('tr'),level=node('td');level.append(st.score==null?node('span','—'):levelBadge(st.level));tr.append(node('td',i+1),node('td',st.name),node('td',fmtScore(st.score,st.max_score)),level);bd.append(tr);});
     dWrap.append(dTbl);
     const scope=rep.grade+' '+rep.class_name+' ('+rep.section+') — '+rep.subject_name+' · '+label;
     const summary='المرصود: '+rep.recordedCount+' من '+rep.expectedCount+' · غير المرصود: '+Math.max(0,rep.expectedCount-rep.recordedCount)+' · المتوسط: '+fmtPct(rep.average);
     const print=node('button','معاينة طباعة الكشف','secondary');print.onclick=()=>{const contents=node('div');contents.append(node('p',summary),dTbl.cloneNode(true));printReport('كشف الفصل والمادة',scope,contents);};
     detail.replaceChildren(node('h3',scope),node('p',summary),print,dWrap);
    }catch(_){if(request===version&&host.isConnected&&currentUser===user)detail.replaceChildren(node('p','تعذّر تحميل الكشف.','notice'));}
   };
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
    tpTitle.append(tpBtns);certificates.append(tpTitle);
    if(tp.length){
     const tWrap=node('div',undefined,'table-wrap'),tTbl=node('table'),tHd=node('thead'),tHr=node('tr');
     for(const h of ['الاسم','الصف','الفصل','القسم','المعدل','المواد','شهادة'])tHr.append(node('th',h));tHd.append(tHr);tTbl.append(tHd);
     const tBd=node('tbody');
     for(const x of tp){const tr=node('tr'),av=node('td'),tdC=node('td'),cBtn=node('button','طباعة شهادة','secondary');cBtn.type='button';cBtn.addEventListener('click',()=>printCertificates([x]));tdC.append(cBtn);av.append(node('span',fmtPct(x.average),'badge-good'));tr.append(node('td',x.name),node('td',x.grade),node('td',x.class_name),node('td',x.section),av,node('td',String(x.subjectsCount)),tdC);tBd.append(tr);}
     tTbl.append(tBd);tWrap.append(tTbl);certificates.append(tWrap);
    }
   }
   function renderRows(){
    bd.replaceChildren();
    const filtered=rows.filter(r=>(!gSel.value||r.grade===gSel.value)&&(!mSel.value||r.subject_id===mSel.value));
    for(const r of filtered){
     const tr=node('tr'),btn=node('button','عرض الكشف','secondary');
     btn.addEventListener('click',async()=>{
      await openClassReport({...r,period});
     });
     const tdBtn=node('td');tdBtn.append(btn);
     const range=r.minScore!==null&&r.maxScore!==null?(r.minScore+' – '+r.maxScore):'—';
     tr.append(node('td',r.grade),node('td',r.class_name),node('td',r.section),node('td',r.subject_name),node('td',r.recorded+' / '+r.expected),node('td',fmtPct(r.completionRate)),node('td',fmtPct(r.average)),node('td',range),tdBtn);
     bd.append(tr);
    }
   }
   gSel.addEventListener('change',renderRows);mSel.addEventListener('change',renderRows);renderRows();
  }
  draw();
  if(!certificates.textContent)certificates.append(node('p','لا توجد شهادات متاحة للفترة المعروضة.','notice'));
  selectReportSection(director?reportSection:'classes');
 }
 async function loadWorkspaceParallel(){
  const exOld=find('#live-executive');if(exOld)exOld.remove();
  const skHost=node('div');skHost.id='live-executive';skHost.style.marginTop='24px';
  skHost.append(skeletonBlock('cards'));
  const anchor=find('#live-school');if(anchor)anchor.before(skHost);else find('#overview').append(skHost);
  const isDir=currentUser?.role==='headmistress';
  const [sumRes,anRes]=await Promise.allSettled([
   api('summary'),
   isDir?api('analytics',{period:'1'}):Promise.resolve(null)
  ]);
  if(sumRes.status==='rejected')throw sumRes.reason;
  liveSummary(sumRes.value);
  if(isDir&&anRes.status==='fulfilled'&&anRes.value)renderExecutive(anRes.value);
 }
 find('#login-form').addEventListener('submit',async e=>{e.preventDefault();if(!configured)return;const button=find('#login-submit');button.disabled=true;feedback.textContent='جارٍ التحقق من الحساب…';let success=false;try{const username=find('#username').value,password=find('#password').value;const r=await connect().request({action:'login',payload:{username,password}});find('#password').value='';if(!r?.ok){feedback.textContent=r?.error?.code==='NOT_READY'?'حساب المديرة لم يُهيأ بعد. أكملي إعداد الحساب من ملف القاعدة.':'تعذر تسجيل الدخول. تحققي من البيانات أو حاولي لاحقًا.';return;}token=r.data.token;currentUser=r.data.user;saveToken(token);find('#login').hidden=true;find('#workspace').hidden=false;find('.skip').href='#workspace-main';page('overview');success=true;await loadWorkspaceParallel();}catch(e){const code=e?.message||'';feedback.textContent=code==='BACKEND_TIMEOUT'?'تعذر تهيئة جسر الاتصال بالخدمة (BACKEND_TIMEOUT). تأكدي من السماح للإطارات وملفات الارتباط أو حدّثي الصفحة.':code==='REQUEST_TIMEOUT'?'انتهت مهلة الرد من الخادم (REQUEST_TIMEOUT). أعيدي المحاولة بعد لحظات.':'تعذر الاتصال بالخدمة'+(code?' ('+code+')':'')+'. لم يتم تسجيل الدخول.';if(!success){if(connection){connection.close();connection=null;}token=null;currentUser=null;saveToken(null);find('#workspace').hidden=true;find('#login').hidden=false;}}finally{find('#password').value='';button.disabled=false;}});
 async function doLogout(e){if(!token)return;if(e)e.stopImmediatePropagation();const oldToken=token;token=null;currentUser=null;school=null;analyticsCache=null;periodCache={};activePeriod='1';saveToken(null);if(find('#exit-top'))find('#exit-top').hidden=true;find('#overview .stats')?.classList.remove('stats-4');clearDashboard();find('#workspace').hidden=true;find('#login').hidden=false;feedback.textContent='جارٍ إنهاء الجلسة…';try{const r=await connection.request({action:'logout',token:oldToken});if(!r?.ok)feedback.textContent='أُغلقت الجلسة محليًا؛ تعذر تأكيد إلغائها في الخادم.';else feedback.textContent='تم تسجيل الخروج.';}catch(_){feedback.textContent='أُغلقت الجلسة محليًا؛ تعذر تأكيد إلغائها في الخادم.';}finally{if(connection)connection.close();connection=null;try{sessionStorage.setItem('alhubail-logout-note',feedback.textContent);}catch(_){}location.reload();}}
 find('#exit').addEventListener('click',doLogout,true);
 find('#exit-top')?.addEventListener('click',doLogout);
 setInterval(()=>{if(token)api('session').catch(()=>{});},900000);
 (async()=>{
  if(!configured)return;
  let saved=null;try{saved=localStorage.getItem(SESSION_KEY)||sessionStorage.getItem(SESSION_KEY);}catch(_){}
  if(!saved||!/^[a-f0-9]{64}$/.test(saved))return;
  token=saved;const btn=find('#login-submit');btn.disabled=true;feedback.textContent='جارٍ استعادة الجلسة…';
  try{
   const [sesRes,sumRes]=await Promise.allSettled([api('session'),api('summary')]);
   if(sesRes.status==='rejected')throw sesRes.reason;
   currentUser=sesRes.value.user;
   find('#login').hidden=true;find('#workspace').hidden=false;find('.skip').href='#workspace-main';page('overview');
   if(sumRes.status==='fulfilled'){
    liveSummary(sumRes.value);
    if(currentUser.role==='headmistress')api('analytics',{period:'1'}).then(renderExecutive).catch(()=>{});
   }else{
    await loadWorkspaceParallel();
   }
  }catch(e){if(e?.message==='UNAUTHORIZED'||e?.message==='SESSION_EXPIRED'){token=null;currentUser=null;saveToken(null);}find('#workspace').hidden=true;find('#login').hidden=false;if(feedback.textContent==='جارٍ استعادة الجلسة…')feedback.textContent='الدخول للحسابات المعتمدة فقط.';}
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
