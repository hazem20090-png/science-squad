const state = { sets: [], set: null, answers: {}, current: 0 };
const arabic = { '10a':'العاشر متقدم', '11a':'الحادي عشر متقدم', '12g':'الثاني عشر عام' };
const root = document.querySelector('#app');
const storageKey = id => `science-squad-v2-${id}-progress`;

fetch('questions-rich.json').then(r => r.json()).then(sets => { state.sets = sets; renderCards(); }).catch(() => root.innerHTML = '<p class="section">تعذّر تحميل الأسئلة. أعد تحديث الصفحة.</p>');
document.querySelector('#theme').onclick = () => { document.body.classList.toggle('dark'); localStorage.setItem('science-squad-theme', document.body.classList.contains('dark') ? 'dark' : 'light'); };
if(localStorage.getItem('science-squad-theme') === 'dark') document.body.classList.add('dark');
document.querySelectorAll('.topbar a[href^="#"]').forEach(link => link.addEventListener('click', event => {
  const target = link.getAttribute('href');
  if(state.set){ event.preventDefault(); save(); window.location.href = `${window.location.pathname}${target}`; window.location.reload(); }
}));

function renderCards(){
  document.querySelector('#examCards').innerHTML = state.sets.map(s => `<article class="exam-card"><span class="num">${s.id.slice(0,2)}</span><h3>${arabic[s.id]}</h3><strong>${s.labelEn}</strong><p>${s.topic}<br>50 سؤالًا • محاولات غير محدودة</p><button class="button primary" data-start="${s.id}">ابدأ الاختبار</button></article>`).join('');
  document.querySelectorAll('[data-start]').forEach(b => b.onclick = () => startExam(b.dataset.start));
}
function safe(value=''){ return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function startExam(id, subset){
  state.set = state.sets.find(s => s.id === id); state.questions = subset || state.set.questions; state.answers = {}; state.current = 0;
  if(!subset){ try { const saved = JSON.parse(localStorage.getItem(storageKey(id))); if(saved?.answers && confirm('لديك تقدّم محفوظ. هل تريد المتابعة؟')) { state.answers=saved.answers; state.current=Math.min(saved.current||0,state.questions.length-1); } } catch{} }
  root.innerHTML = document.querySelector('#examTemplate').innerHTML;
  document.querySelector('.exam-name').textContent = `${arabic[id]} — ${state.set.labelEn}`;
  document.querySelector('.exit').onclick = () => { save(); window.location.href = `${window.location.pathname}#exams`; window.location.reload(); };
  document.querySelector('.next').onclick = () => move(1); document.querySelector('.previous').onclick = () => move(-1);
  document.querySelector('.submit').onclick = submit;
  const navigator = document.querySelector('.navigator'), backdrop = document.querySelector('.nav-backdrop');
  const toggleNavigator = open => { navigator.classList.toggle('open',open); backdrop.classList.toggle('open',open); navigator.setAttribute('aria-hidden',String(!open)); };
  document.querySelector('.toggle-nav').onclick = () => toggleNavigator(true);
  document.querySelector('.close-nav').onclick = () => toggleNavigator(false);
  backdrop.onclick = () => toggleNavigator(false);
  renderQuestion(); window.scrollTo({top:0,behavior:'smooth'});
}
function renderQuestion(){
  const q = state.questions[state.current], total = state.questions.length;
  document.querySelector('.prompt-en').textContent = q.promptEn;
  document.querySelector('.prompt-ar').textContent = q.promptAr;
  const context = Array.isArray(q.context) ? q.context : (typeof q.context === 'string' ? [q.context] : []);
  const figures = Array.isArray(q.figures) ? q.figures : (typeof q.figures === 'string' ? [q.figures] : []);
  document.querySelector('.question-context').innerHTML = context.map(x=>`<span>${safe(x)}</span>`).join('');
  document.querySelector('.question-figures').innerHTML = figures.map((src,i)=>`<img src="${safe(src)}" alt="صورة السؤال ${q.id}${i?` — ${i+1}`:''}">`).join('');
  document.querySelector('.rich-choices').innerHTML = ['A','B','C','D'].map(letter=>{const option=q.options[letter];return `<button class="choice-card ${state.answers[q.id]===letter?'selected':''}" data-choice="${letter}"><span class="choice-letter">${letter}</span><span class="choice-text"><b dir="ltr">${safe(option.en)}</b><small dir="rtl">${safe(option.ar)}</small></span></button>`}).join('');
  document.querySelector('.counter').textContent = `السؤال ${state.current+1} من ${total}`;
  document.querySelector('.progress i').style.width = `${((state.current+1)/total)*100}%`;
  document.querySelector('.dots').innerHTML = state.questions.map((x,i)=>`<button class="${i===state.current?'active':''} ${state.answers[x.id]?'answered':''}" data-i="${i}">${i+1}</button>`).join('');
  document.querySelectorAll('.dots button').forEach(b=>b.onclick=()=>{state.current=+b.dataset.i;document.querySelector('.navigator').classList.remove('open');document.querySelector('.nav-backdrop').classList.remove('open');renderQuestion();window.scrollTo({top:0,behavior:'smooth'});});
  document.querySelectorAll('.choice-card').forEach(b=>{ b.onclick=()=>{state.answers[q.id]=b.dataset.choice;save();renderQuestion();}; });
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
