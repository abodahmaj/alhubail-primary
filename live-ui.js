(function(){'use strict';
 const find=s=>document.querySelector(s),feedback=find('#login-feedback');let connection=null,token=null,currentUser=null,school=null;
 const configured=typeof window.SCHOOL_BACKEND_URL==='string'&&window.SCHOOL_BACKEND_URL.length>0;
 if(configured){find('.environment').textContent='اتصال مهيأ · تسجيل الدخول مطلوب';find('#username').disabled=false;find('#username').required=true;find('#password').disabled=false;find('#password').required=true;find('#login-submit').disabled=false;feedback.textContent='الدخول للحسابات المعتمدة فقط. الجلسة تنتهي بعد 30 دقيقة من عدم النشاط.';connect().ready.catch(()=>{if(connection){connection.close();connection=null;}});}
 try{const note=sessionStorage.getItem('alhubail-logout-note');if(note){feedback.textContent=note;sessionStorage.removeItem('alhubail-logout-note');}}catch(_){}
 function connect(){if(!connection)connection=window.createSchoolConnection(window.SCHOOL_BACKEND_URL);return connection;}
 async function api(action,payload){const result=await connect().request({action,payload,token});if(!result||!result.ok){if(result?.error?.code==='UNAUTHORIZED'){token=null;currentUser=null;find('#live-school')?.remove();find('#live-reports')?.remove();find('#workspace').hidden=true;find('#login').hidden=false;feedback.textContent='انتهت الجلسة. يرجى تسجيل الدخول مجددًا.';}throw Error(result?.error?.code||'SERVICE_UNAVAILABLE');}return result.data;}
 function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
 function populate(select,list,label){select.replaceChildren();select.append(new Option(label,''));for(const x of list)select.append(new Option(x.label,x.value));}
 function liveSummary(data){
  school=data;const director=currentUser.role==='headmistress';find('.environment').textContent='جلسة موثقة · '+(director?'مديرة المدرسة':'معلمة');find('.toolbar .pill').textContent=currentUser.display_name;
  find('#overview .heading h1').textContent=director?'متابعة أداء المدرسة':'متابعة فصولي وموادي';find('#overview .heading p').textContent='البيانات من قاعدة المدرسة. لا تُحسب الدرجة غير المرصودة صفرًا.';
  const stats=find('#overview .stats');stats.replaceChildren();const comp=data.completion||{};const pct=comp.completionRate!==null&&comp.completionRate!==undefined?Math.round(comp.completionRate*100)+'%':'—';const recNote=data.recordedSuppressed?'حماية خصوصية المجموعات الصغيرة':comp.expectedEligible?'اكتمال الرصد: '+pct+' ('+comp.recordedEligible+' / '+comp.expectedEligible+')':'لا تقييمات معتمدة حتى إضافتها';const clsNote=comp.deferredClasses?comp.deferredClasses+' فصول (الأول والثاني) مؤجلة':'حسب توزيع المدرسة';for(const [title,value,note] of [['الطلاب والطالبات',data.students,'مؤشر عام للمدرسة دون أسماء'],['الفصول',data.classes,clsNote],['الدرجات المرصودة',data.recordedSuppressed?'محجوب':data.recorded,recNote]]){const a=node('article');a.append(node('span',title),node('strong',String(value)),node('small',note));stats.append(a);}
  const empty=find('#overview .overview-grid .panel .empty');empty.replaceChildren(node('h3',director?'جميع فصول المدرسة':'الفصول المسندة إليكِ'),node('p',director?'التفاصيل الفردية متاحة للمديرة. المعلمات لم تُضف حساباتهن بعد.':data.accessibleClasses.length?'التفاصيل الفردية تخص موادك وفصولك فقط.':'لا يوجد إسناد حتى الآن؛ ستتولى الإدارة ربط المواد والفصول.'));
  find('#overview .panel-title .pill').textContent='متصل';find('#exit').textContent='تسجيل الخروج';find('#preview').hidden=true;
  const account=find('#account .empty');account.replaceChildren(node('h2',currentUser.display_name),node('p',director?'الصلاحية: مديرة المدرسة — جميع الفصول. إدارة المعلمات والإسناد ستفعّل عند توفير بياناتهن.':'الصلاحية: معلمة — التفاصيل الفردية لفصولك وموادك فقط، والمؤشرات العامة للمدرسة دون أسماء بقية الطلاب.'));
  find('#live-school')?.remove();const panel=node('section',undefined,'panel');panel.id='live-school';panel.style.marginTop='24px';const title=node('div',undefined,'panel-title');title.append(node('h2','استعراض الطلاب والطالبات حسب الصلاحية'));panel.append(title);
  const filters=node('div',undefined,'filters'),classLabel=node('label','الفصل والقسم'),classes=node('select'),subjectLabel=node('label','المادة'),subjects=node('select'),button=node('button','عرض القائمة','primary');classes.id='live-class';subjects.id='live-subject';populate(classes,data.accessibleClasses.map(c=>({value:c.class_id,label:[c.grade,c.class_name,c.section].join(' — ')})),'اختاري الفصل');populate(subjects,[],'اختاري الفصل أولًا');classLabel.append(classes);subjectLabel.append(subjects);filters.append(classLabel,subjectLabel,button);panel.append(filters);const result=node('div',undefined,'empty');result.setAttribute('aria-live','polite');result.textContent='لا تظهر أسماء قبل اختيار فصل ومادة مصرحين.';panel.append(result);find('#overview').append(panel);
  classes.addEventListener('change',()=>{const allowed=director?data.subjectList:data.subjectList.filter(s=>data.assignments.some(a=>a.class_id===classes.value&&a.subject_id===s.subject_id));populate(subjects,allowed.map(s=>({value:s.subject_id,label:s.name})),'اختاري المادة');result.replaceChildren(node('p','اختاري المادة ثم اعرضي القائمة.'));});
  button.addEventListener('click',async()=>{if(!classes.value||!subjects.value){result.textContent='اختاري الفصل والمادة أولًا.';return;}button.disabled=true;result.textContent='جارٍ تحميل القائمة…';try{const r=await api('roster',{class_id:classes.value,subject_id:subjects.value});const wrap=node('div',undefined,'table-wrap'),table=node('table'),head=node('thead'),tr=node('tr');tr.append(node('th','م'),node('th','الاسم'));head.append(tr);table.append(head);const body=node('tbody');r.students.forEach((s,i)=>{const row=node('tr');row.append(node('td',String(i+1)),node('td',s.name));body.append(row);});table.append(body);wrap.append(table);result.replaceChildren(node('p','عدد السجلات: '+r.students.length),wrap);}catch(e){result.textContent='تعذر عرض القائمة. تحققي من الجلسة والصلاحيات.';}finally{button.disabled=false;}});
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
     go.disabled=true;out.textContent='جارٍ تحميل البطاقة…';
     try{
      const card=await api('studentCard',{student_id:sSel.value});
      if(!card.student){out.textContent='لم يُعثر على السجل.';return;}
      const info=node('p',[card.student.name,card.student.grade,card.student.class_name,card.student.section].join(' — '));
      const wrap=node('div',undefined,'table-wrap'),tbl=node('table'),hd=node('thead'),hr=node('tr');
      for(const h of ['المادة','الفترة','الدرجة','الحالة'])hr.append(node('th',h));hd.append(hr);tbl.append(hd);
      const bd=node('tbody');
      for(const sc of card.scores){const tr=node('tr');tr.append(node('td',sc.subject_name),node('td','الفترة '+sc.period),node('td',fmtScore(sc.score,sc.max_score)),node('td',sc.score===null?'غير مرصود':'مرصود'));bd.append(tr);}
      tbl.append(bd);wrap.append(tbl);out.replaceChildren(info,wrap,node('p','حدود تصنيف الأداء بانتظار اعتماد المدرسة.','notice'));
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
   const rows=data.classSubjectsSummary;
   const f=node('div',undefined,'filters'),gLbl=node('label','الصف'),gSel=node('select'),mLbl=node('label','المادة'),mSel=node('select');
   const grades=[...new Set(rows.map(r=>r.grade))],subjs=[...new Set(rows.map(r=>r.subject_id))];
   populate(gSel,grades.map(g=>({value:g,label:g})),'جميع الصفوف');
   populate(mSel,subjs.map(id=>({value:id,label:rows.find(r=>r.subject_id===id)?.subject_name||id})),'جميع المواد');
   gLbl.append(gSel);mLbl.append(mSel);f.append(gLbl,mLbl);host.append(f);
   const wrap=node('div',undefined,'table-wrap'),tbl=node('table'),hd=node('thead'),hr=node('tr');
   for(const h of ['الصف','الفصل','القسم','المادة','المرصود','الاكتمال','المتوسط','الأدنى–الأعلى','كشف'])hr.append(node('th',h));
   hd.append(hr);tbl.append(hd);const bd=node('tbody');tbl.append(bd);wrap.append(tbl);host.append(wrap);
   const detail=node('div');detail.setAttribute('aria-live','polite');detail.style.marginTop='16px';host.append(detail);
   function renderRows(){
    bd.replaceChildren();
    const filtered=rows.filter(r=>(!gSel.value||r.grade===gSel.value)&&(!mSel.value||r.subject_id===mSel.value));
    for(const r of filtered){
     const tr=node('tr'),btn=node('button','عرض الكشف','secondary');
     btn.addEventListener('click',async()=>{
      btn.disabled=true;detail.textContent='جارٍ تحميل كشف '+r.grade+' '+r.class_name+' — '+r.subject_name+'…';
      try{
       const rep=await api('report',{class_id:r.class_id,subject_id:r.subject_id});
       const dWrap=node('div',undefined,'table-wrap'),dTbl=node('table'),dHd=node('thead'),dHr=node('tr');
       for(const h of ['م','الاسم','الدرجة','الحالة'])dHr.append(node('th',h));dHd.append(dHr);dTbl.append(dHd);
       const dBd=node('tbody');
       rep.students.forEach((st,idx)=>{const sr=node('tr');sr.append(node('td',String(idx+1)),node('td',st.name),node('td',fmtScore(st.score,st.max_score)),node('td',st.score===null?'غير مرصود':'مرصود'));dBd.append(sr);});
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
 find('#login-form').addEventListener('submit',async e=>{e.preventDefault();if(!configured)return;const button=find('#login-submit');button.disabled=true;feedback.textContent='جارٍ التحقق من الاتصال والحساب…';let success=false;try{const username=find('#username').value,password=find('#password').value;const r=await connect().request({action:'login',payload:{username,password}});find('#password').value='';if(!r?.ok){feedback.textContent=r?.error?.code==='NOT_READY'?'حساب المديرة لم يُهيأ بعد. أكملي إعداد الحساب من ملف القاعدة.':'تعذر تسجيل الدخول. تحققي من البيانات أو حاولي لاحقًا.';return;}token=r.data.token;currentUser=r.data.user;const summary=await api('summary');liveSummary(summary);find('#login').hidden=true;find('#workspace').hidden=false;find('.skip').href='#workspace-main';page('overview');success=true;}catch(e){const code=e?.message||'';feedback.textContent=code==='BACKEND_TIMEOUT'?'تعذر تهيئة جسر الاتصال بالخدمة (BACKEND_TIMEOUT). تأكدي من السماح للإطارات وملفات الارتباط أو حدّثي الصفحة.':code==='REQUEST_TIMEOUT'?'انتهت مهلة الرد من الخادم (REQUEST_TIMEOUT). أعيدي المحاولة بعد لحظات.':'تعذر الاتصال بالخدمة'+(code?' ('+code+')':'')+'. لم يتم تسجيل الدخول.';if(connection){connection.close();connection=null;}token=null;currentUser=null;}finally{find('#password').value='';button.disabled=false;if(!success)find('#login').hidden=false;}});
 find('#exit').addEventListener('click',async e=>{if(!token)return;e.stopImmediatePropagation();const oldToken=token;token=null;currentUser=null;school=null;find('#live-school')?.remove();find('#live-reports')?.remove();find('#workspace').hidden=true;find('#login').hidden=false;feedback.textContent='جارٍ إنهاء الجلسة…';try{const r=await connection.request({action:'logout',token:oldToken});if(!r?.ok)feedback.textContent='أُغلقت الجلسة محليًا؛ تعذر تأكيد إلغائها في الخادم.';else feedback.textContent='تم تسجيل الخروج.';}catch(_){feedback.textContent='أُغلقت الجلسة محليًا؛ تعذر تأكيد إلغائها في الخادم.';}finally{if(connection)connection.close();connection=null;try{sessionStorage.setItem('alhubail-logout-note',feedback.textContent);}catch(_){}location.reload();}},true);
})();
