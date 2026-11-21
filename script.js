// Imagine City: ต่อจาก HTML 3 หน้าเดิมให้เล่นครบ 25 หน้า
const pages = ['cover','story','howToPlay',...Array.from({length:22},(_,i)=>`page${i+4}`)];
const game = document.querySelector('.game');
const journeyProgress = document.querySelector('.journey-progress');
const scores = [0,0,0,0,0]; // ผู้กล้า, ราชินี, นักเวทย์, จอมมาร, นักเยียวยา
const answers = {}; // เก็บคำตอบแยกตามหมายเลขหน้า เพื่อย้อนกลับแก้ได้
let currentPage = 1;
let transitioning = false;
let answerPending = false;
const roles = [
  {name:'ผู้กล้า',symbol:'⚔',major:'IGD — Interactive and Game Design',description:'คุณกล้าเผชิญความท้าทายและชอบลงมือสร้างเส้นทางใหม่'},
  {name:'ราชินี',symbol:'♛',major:'DGD — Digital Graphic Design',description:'คุณมองภาพรวมเป็น วางแผนเก่ง และทำให้ผู้คนร่วมมือกัน'},
  {name:'นักเวทย์',symbol:'✧',major:'DGA — Digital Arts',description:'คุณช่างสังเกต รักการเรียนรู้ และมองเห็นความเป็นไปได้ที่ซ่อนอยู่'},
  {name:'จอมมาร',symbol:'◆',major:'AFX — Computer Animation and Visual Effects',description:'คุณมีความคิดสร้างสรรค์ กล้าทดลอง และไม่ยึดติดกับวิธีเดิม'},
  {name:'นักเยียวยา',symbol:'♡',major:'DEN — Digital Entertainment',description:'คุณเข้าใจความรู้สึกผู้อื่น และอยากสร้างความสุขให้คนรอบตัว'}
];
// การจับคู่บทบาทกับสาขาเป็นตัวอย่างสำหรับทดสอบ ปรับได้ภายหลัง
function updateProgress(page, screen){
  const progress=Math.max(0,Math.min(1,(page-1)/22));
  game.style.setProperty('--progress',progress.toFixed(3));
  document.documentElement.style.setProperty('--world-progress',progress.toFixed(3));
  game.style.setProperty('--journey', ((page-1)/24*100).toFixed(2)+'%');
  if(journeyProgress) journeyProgress.hidden = page===1;
  game.dataset.stage=String(Math.min(5,Math.floor(progress*5)));
  // Brighten only the lower background, not the whole screen.
  game.style.setProperty('--bottom-light',progress.toFixed(3));
  game.classList.toggle('city-restored',page>=23);
  game.style.setProperty('--scene-light',(progress * .68).toFixed(3));
  // ประตูใช้ภาพเดียวต่อฉาก ป้องกันเงาซ้อนจากสองภาพคนละรูปทรง
  const stage = Math.min(5, Math.floor(progress * 5 + 0.001));
  game.style.setProperty('--portal-glow',progress.toFixed(3));
  screen.querySelectorAll('.portal-layers').forEach(layers=>{
    const base=layers.querySelector('.portal-base');
    const next=layers.querySelector('.portal-next');
    const url=`images/portal-${stage}.png`;
    if(base.getAttribute('src')!==url) base.src=url;
    if(next) next.style.display='none';
  });
}
function renderResult(){
  let winner=0;
  for(let i=1;i<scores.length;i++) if(scores[i]>scores[winner]) winner=i;
  const result=roles[winner];
  document.getElementById('page25').dataset.role = winner;
  document.getElementById('resultRole').textContent=result.name;
  document.getElementById('resultEmblem').textContent=result.symbol;
  document.getElementById('resultDescription').textContent=result.description;
  document.getElementById('resultMajor').textContent=result.major;
}
function restoreSelections(){
  document.querySelectorAll('[data-page]').forEach(section=>{
    const page=Number(section.dataset.page);
    section.querySelectorAll('[data-choice]').forEach(button=>{
      button.classList.toggle('selected',answers[page]===Number(button.dataset.choice));
    });
  });
}
async function showPage(page) {
  if (transitioning || answerPending || page < 1 || page > pages.length || page === currentPage) return;
  const previous = document.getElementById(pages[currentPage - 1]);
  const incoming = document.getElementById(pages[page - 1]);
  if (!previous || !incoming) return;
  transitioning = true;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const previousScroll = window.scrollY;
  const moveFocus = previous.contains(document.activeElement);

  updateProgress(page, incoming);
  if (page === 25) renderResult();

  const animations = [];
  try {
    if (!reduceMotion) {
      previous.inert = true;
      incoming.inert = true;
      previous.style.top = `-${previousScroll}px`;
      previous.classList.add('motion-leaving');
      incoming.classList.add('motion-entering');
      game.classList.add('is-transitioning');
    } else {
      previous.classList.add('hidden');
    }

    incoming.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'instant' });

    if (!reduceMotion) {
      const timing = { duration: 700, fill: 'both' };
      // Fade out, hold the background briefly, then fade in.
      animations.push(previous.animate([
        { opacity: 1, easing: 'ease-in-out' },
        { opacity: 0, offset: .4 },
        { opacity: 0 }
      ], timing));
      animations.push(incoming.animate([
        { opacity: 0 },
        { opacity: 0, offset: .49, easing: 'ease-in-out' },
        { opacity: 1 }
      ], timing));
      await Promise.allSettled(animations.map(animation => animation.finished));
    }
  } finally {
    previous.classList.add('hidden');
    previous.classList.remove('motion-leaving');
    incoming.classList.remove('motion-entering');
    game.classList.remove('is-transitioning');
    previous.style.top = '';
    previous.inert = false;
    incoming.inert = false;
    animations.forEach(animation => animation.cancel());
    currentPage = page;
    transitioning = false;

    if (moveFocus) {
      incoming.tabIndex = -1;
      incoming.focus({ preventScroll: true });
    }
  }
}

function choose(page,index){
  if(transitioning || answerPending)return;
  answerPending=true;
  const picked=document.querySelector(`[data-page="${page}"] [data-choice="${index}"]`);
  if(picked){picked.classList.add('just-chosen');setTimeout(()=>picked.classList.remove('just-chosen'),330);}
  if(Object.hasOwn(answers,page))scores[answers[page]]--;
  answers[page]=index;
  scores[index]++;
  restoreSelections();
  window.setTimeout(() => {
    answerPending = false;
    showPage(page + 1);
  }, 120);
}
function resetGame(){
  if(transitioning)return;
  scores.fill(0);
  Object.keys(answers).forEach(key=>delete answers[key]);
  restoreSelections();
  showPage(1);
}
document.getElementById('startButton').addEventListener('click',()=>showPage(2));
document.getElementById('nextButton').addEventListener('click',()=>showPage(3));
document.getElementById('backButton').addEventListener('click',()=>showPage(1));
document.getElementById('playButton').addEventListener('click',()=>showPage(4));
document.getElementById('backToStory').addEventListener('click',()=>showPage(2));
document.querySelectorAll('[data-next]').forEach(button=>button.addEventListener('click',()=>showPage(currentPage+1)));
document.querySelectorAll('[data-back]').forEach(button=>button.addEventListener('click',()=>showPage(currentPage-1)));
document.querySelectorAll('[data-choice]').forEach(button=>button.addEventListener('click',()=>choose(Number(button.closest('[data-page]').dataset.page),Number(button.dataset.choice))));
// บัตรผ่านนักเดินทาง: เก็บข้อมูลเฉพาะในหน้านี้ ไม่ส่งออกไปที่ใด
const travelerForm = document.getElementById('travelerForm');
travelerForm.addEventListener('submit', event => {
  event.preventDefault();
  showPage(25);
});
const priorityBoxes = [...travelerForm.querySelectorAll('input[name="priority"]')];
priorityBoxes.forEach(box => box.addEventListener('change', () => {
  const selected = priorityBoxes.filter(input => input.checked);
  if (selected.length > 2) {
    box.checked = false;
    document.getElementById('priorityHint').textContent = 'เลือกได้สูงสุด 2 ข้อ';
  } else {
    document.getElementById('priorityHint').textContent = '';
  }
}));
document.getElementById('restartButton').addEventListener('click',()=>{
  travelerForm.reset();
  document.getElementById('priorityHint').textContent='';
  resetGame();
});
updateProgress(1, document.getElementById(pages[0]));

// เตรียมภาพทั้ง 6 ระดับล่วงหน้า ลดอาการกระตุกระหว่างเปลี่ยนฉาก
for (let i = 0; i <= 5; i++) {
  const image = new Image();
  image.src = `images/portal-${i}.png`;
  image.decode().catch(() => {});
}
