const state = { sets: [], set: null, answers: {}, current: 0 };
const arabic = { '10a':'العاشر متقدم', '11a':'الحادي عشر متقدم', '12g':'الثاني عشر عام' };
const root = document.querySelector('#app');
const storageKey = id => `science-squad-${id}-progress`;

fetch('questions.json').then(r => r.json()).then(sets => { state.sets = sets; renderCards(); }).catch(() => root.innerHTML = '<p class="section">تعذّر تحميل الأسئلة. أعد تحديث الصفحة.</p>');
document.querySelector('#theme').onclick = () => { document.body.classList.toggle('dark'); localStorage.setItem('science-squad-theme', document.body.classList.contains('dark') ? 'dark' : 'light'); };
if(localStorage.getItem('science-squad-theme') === 'dark') document.body.classList.add('dark');

function renderCards(){
  document.querySelector('#examCards').innerHTML = state.sets.map(s => `<article class="exam-card"><span class="num">${s.id.slice(0,2)}</span><h3>${arabic[s.id]}</h3><strong>${s.labelEn}</strong><p>${s.topic}<br>50 سؤالًا • محاولات غير محدودة</p><button class="button primary" data-start="${s.id}">ابدأ الاختبار</button></article>`).join('');
  document.querySelectorAll('[data-start]').forEach(b => b.onclick = () => startExam(b.dataset.start));
}
function startExam(id, subset){
  state.set = state.sets.find(s => s.id === id); state.questions = subset || state.set.questions; state.answers = {}; state.current = 0;
  if(!subset){ try { const saved = JSON.parse(localStorage.getItem(storageKey(id))); if(saved?.answers && confirm('لديك تقدّم محفوظ. هل تريد المتابعة؟')) { state.answers=saved.answers; state.current=Math.min(saved.current||0,state.questions.length-1); } } catch{} }
  root.innerHTML = document.querySelector('#examTemplate').innerHTML;
  document.querySelector('.exam-name').textContent = `${arabic[id]} — ${state.set.labelEn}`;
  document.querySelector('.exit').onclick = () => { save(); location.hash = 'exams'; location.reload(); };
  document.querySelector('.next').onclick = () => move(1); document.querySelector('.previous').onclick = () => move(-1);
  document.querySelector('.submit').onclick = submit; document.querySelector('.review').onclick = () => document.querySelector('.navigator').scrollIntoView({behavior:'smooth'});
  renderQuestion(); window.scrollTo({top:0,behavior:'smooth'});
}
function renderQuestion(){
  const q = state.questions[state.current], total = state.questions.length;
  document.querySelector('.question-slide').src = q.questionImage;
  document.querySelector('.counter').textContent = `السؤال ${state.current+1} من ${total}`;
  document.querySelector('.progress i').style.width = `${((state.current+1)/total)*100}%`;
  document.querySelector('.dots').innerHTML = state.questions.map((x,i)=>`<button class="${i===state.current?'active':''} ${state.answers[x.id]?'answered':''}" data-i="${i}">${i+1}</button>`).join('');
  document.querySelectorAll('.dots button').forEach(b=>b.onclick=()=>{state.current=+b.dataset.i;renderQuestion();});
  document.querySelectorAll('.choices button').forEach(b=>{ b.classList.toggle('selected',state.answers[q.id]===b.textContent); b.onclick=()=>{state.answers[q.id]=b.textContent;save();renderQuestion();}; });
  document.querySelector('.previous').classList.toggle('hidden',state.current===0);
  document.querySelector('.next').textContent = state.current===total-1 ? 'مراجعة وتسليم' : 'التالي';
}
function move(delta){ if(delta>0 && state.current===state.questions.length-1) submit(); else { state.current=Math.max(0,Math.min(state.questions.length-1,state.current+delta)); renderQuestion(); } }
function save(){ if(state.set) localStorage.setItem(storageKey(state.set.id),JSON.stringify({answers:state.answers,current:state.current})); }
function submit(){
  const unanswered = state.questions.filter(q=>!state.answers[q.id]).length;
  if(unanswered && !confirm(`ما زال لديك ${unanswered} سؤالًا دون إجابة. هل تريد التسليم؟`)) return;
  const correct = state.questions.filter(q=>state.answers[q.id]===q.answer).length, wrong=state.questions.filter(q=>state.answers[q.id]!==q.answer);
  localStorage.removeItem(storageKey(state.set.id));
  root.innerHTML = `<section class="results"><div class="result-hero"><p>نتيجتك في ${arabic[state.set.id]}</p><div class="score">${correct} / ${state.questions.length}</div><h2>${Math.round(correct/state.questions.length*100)}%</h2><p>${correct>=40?'ممتاز جدًا! استمر بهذا الأداء.':'مراجعة الأخطاء ستقوّي نتيجتك في المحاولة القادمة.'}</p></div><div class="result-actions"><button class="button primary" id="retryWrong" ${wrong.length?'':'disabled'}>أعد الأسئلة الخاطئة (${wrong.length})</button><button class="button ghost" id="retryAll">أعد الاختبار كاملًا</button><a class="button ghost" href="#videos" onclick="location.reload()">شاهد المراجعة</a></div>${wrong.length?`<section class="wrong-list"><h2>مراجعة الأخطاء والحلول الأصلية</h2>${wrong.map(q=>`<article class="wrong"><h3>السؤال ${q.id} — إجابتك: ${state.answers[q.id]||'لم تُجب'} | الصحيحة: ${q.answer}</h3><img class="slide solution" loading="lazy" src="${q.solutionImage}" alt="الحل الأصلي للسؤال ${q.id}"></article>`).join('')}</section>`:'<p style="text-align:center">إجابات كاملة وصحيحة — أحسنت!</p>'}</section>`;
  document.querySelector('#retryAll').onclick=()=>startExam(state.set.id); if(wrong.length) document.querySelector('#retryWrong').onclick=()=>startExam(state.set.id,wrong);
  window.scrollTo({top:0,behavior:'smooth'});
}
