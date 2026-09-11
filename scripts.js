let use24HourFormat = localStorage.getItem("chronos-format") === "24";
let darkMode = localStorage.getItem("chronos-theme") !== "light";

const $ = (id) => document.getElementById(id);

function pad(n) { return String(n).padStart(2, "0"); }

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function percentOfDay(now) {
    return Math.round(((now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400) * 100);
}

function percentOfYear(now) {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear() + 1, 0, 1);
    return Math.round(((now - start) / (end - start)) * 100);
}

function refreshClock() {
    const now = new Date();
    let hours = now.getHours();

    if (use24HourFormat) {
        $("clock-ampm").style.display = "none";
    } else {
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        $("clock-ampm").textContent = ampm;
        $("clock-ampm").style.display = "inline";
    }

    $("clock-time").textContent = `${pad(hours)}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    $("clock-date").textContent = now.toLocaleDateString(undefined, {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
    $("today-label").textContent = now.toLocaleDateString(undefined, {
        month: "short", day: "numeric", year: "numeric"
    });
    $("day-progress").textContent = `${percentOfDay(now)}%`;
    $("week-number").textContent = `W${pad(getWeekNumber(now))}`;
    $("year-progress").textContent = `${percentOfYear(now)}%`;
    $("timezone-label").textContent = Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll("_", " ").toUpperCase();
    checkAlarm(now);
}

$("format-toggle").addEventListener("click", () => {
    use24HourFormat = !use24HourFormat;
    localStorage.setItem("chronos-format", use24HourFormat ? "24" : "12");
    $("format-toggle").textContent = use24HourFormat ? "12H" : "24H";
    refreshClock();
});

function applyTheme() {
    document.body.classList.toggle("light", !darkMode);
    $("theme-toggle").textContent = darkMode ? "☼" : "☾";
}
$("theme-toggle").addEventListener("click", () => {
    darkMode = !darkMode;
    localStorage.setItem("chronos-theme", darkMode ? "dark" : "light");
    applyTheme();
});
applyTheme();
$("format-toggle").textContent = use24HourFormat ? "12H" : "24H";

/* Stopwatch */
let stopwatchInterval = null, stopwatchElapsedTime = 0, stopwatchStart = 0, lapCount = 0;

function formatStopwatch(ms) {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${pad(min)}:${pad(sec)}.${pad(cs)}`;
}
function updateStopwatch() {
    stopwatchElapsedTime = Date.now() - stopwatchStart;
    $("stopwatch-display").textContent = formatStopwatch(stopwatchElapsedTime);
}
$("sw-start-btn").addEventListener("click", () => {
    if (stopwatchInterval) {
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
        $("sw-start-btn").textContent = "Resume";
        $("sw-status").textContent = "PAUSED";
        $("sw-lap-btn").disabled = true;
    } else {
        stopwatchStart = Date.now() - stopwatchElapsedTime;
        updateStopwatch();
        stopwatchInterval = setInterval(updateStopwatch, 20);
        $("sw-start-btn").textContent = "Pause";
        $("sw-status").textContent = "RUNNING";
        $("sw-lap-btn").disabled = false;
    }
});
$("sw-lap-btn").addEventListener("click", () => {
    if (!stopwatchInterval) return;
    lapCount++;
    const li = document.createElement("li");
    li.innerHTML = `<span>Lap ${lapCount}</span><strong>${formatStopwatch(stopwatchElapsedTime)}</strong>`;
    $("lap-list").prepend(li);
});
$("sw-reset-btn").addEventListener("click", () => {
    clearInterval(stopwatchInterval);
    stopwatchInterval = null; stopwatchElapsedTime = 0; lapCount = 0;
    $("stopwatch-display").textContent = "00:00.00";
    $("sw-start-btn").textContent = "Start";
    $("sw-lap-btn").disabled = true;
    $("sw-status").textContent = "READY";
    $("lap-list").innerHTML = "";
});

/* Countdown timer */
let timerInterval = null, timerRemaining = 300;
function getTimerInput() {
    const min = Math.max(0, Math.min(999, Number($("timer-min").value) || 0));
    const sec = Math.max(0, Math.min(59, Number($("timer-sec").value) || 0));
    return min * 60 + sec;
}
function renderTimer() {
    $("timer-display").textContent = `${pad(Math.floor(timerRemaining / 60))}:${pad(timerRemaining % 60)}`;
}
$("timer-start").addEventListener("click", () => {
    if (timerInterval) {
        clearInterval(timerInterval); timerInterval = null;
        $("timer-start").textContent = "Resume";
        $("timer-status").textContent = "PAUSED";
        return;
    }
    if (timerRemaining <= 0) timerRemaining = getTimerInput();
    if (timerRemaining <= 0) return showToast("Set a timer duration first.");
    $("timer-start").textContent = "Pause";
    $("timer-status").textContent = "RUNNING";
    timerInterval = setInterval(() => {
        timerRemaining--;
        renderTimer();
        if (timerRemaining <= 0) {
            clearInterval(timerInterval); timerInterval = null;
            $("timer-start").textContent = "Start";
            $("timer-status").textContent = "DONE";
            showToast("⏰ Timer finished!");
            document.title = "⏰ Timer finished — Chronos Core";
            setTimeout(() => document.title = "Chronos Core — Smart Time Dashboard", 3000);
        }
    }, 1000);
});
$("timer-reset").addEventListener("click", () => {
    clearInterval(timerInterval); timerInterval = null;
    timerRemaining = getTimerInput() || 300;
    renderTimer();
    $("timer-start").textContent = "Start";
    $("timer-status").textContent = "READY";
});
$("timer-min").addEventListener("input", () => {
    if (!timerInterval) { timerRemaining = getTimerInput(); renderTimer(); }
});
$("timer-sec").addEventListener("input", () => {
    if (!timerInterval) { timerRemaining = getTimerInput(); renderTimer(); }
});
renderTimer();

/* Alarm */
let alarmTime = localStorage.getItem("chronos-alarm") || "";
let alarmTriggeredKey = "";
function renderAlarm() {
    $("alarm-time").value = alarmTime;
    $("alarm-status").textContent = alarmTime ? "ON" : "OFF";
    $("alarm-label").textContent = alarmTime ? `Daily at ${alarmTime}` : "No alarm scheduled";
    $("alarm-toggle").textContent = alarmTime ? "Clear Alarm" : "Set Alarm";
}
$("alarm-toggle").addEventListener("click", () => {
    if (alarmTime) {
        alarmTime = "";
        localStorage.removeItem("chronos-alarm");
        showToast("Alarm cleared.");
    } else {
        const value = $("alarm-time").value;
        if (!value) return showToast("Choose an alarm time first.");
        alarmTime = value;
        localStorage.setItem("chronos-alarm", alarmTime);
        showToast(`Alarm set for ${alarmTime}.`);
    }
    renderAlarm();
});
function checkAlarm(now) {
    if (!alarmTime) return;
    const current = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const key = `${now.toDateString()}-${current}`;
    if (current === alarmTime && alarmTriggeredKey !== key) {
        alarmTriggeredKey = key;
        showToast("🔔 Alarm time!");
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator(), gain = ctx.createGain();
            osc.frequency.value = 880; gain.gain.value = 0.08;
            osc.connect(gain); gain.connect(ctx.destination); osc.start();
            setTimeout(() => { osc.stop(); ctx.close(); }, 700);
        } catch (_) {}
    }
}
renderAlarm();

function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => toast.classList.remove("show"), 2800);
}

refreshClock();
setInterval(refreshClock, 1000);


/* Holiday & Calendar */
const GHANA_HOLIDAYS_2026 = {
  "2026-01-01": ["New Year's Day", "public"],
  "2026-01-07": ["Constitution Day", "public"],
  "2026-01-09": ["Constitution Day — Day off", "public"],
  "2026-02-19": ["Ramadan Start", "observe"],
  "2026-03-06": ["Independence Day", "public"],
  "2026-03-20": ["Eid ul-Fitr", "public"],
  "2026-03-21": ["Eid ul-Fitr Holiday", "public"],
  "2026-03-23": ["Eid ul-Fitr Holiday — Day off", "public"],
  "2026-04-03": ["Good Friday", "public"],
  "2026-04-04": ["Holy Saturday", "observe"],
  "2026-04-05": ["Easter Sunday", "observe"],
  "2026-04-06": ["Easter Monday", "public"],
  "2026-05-01": ["Workers' Day / May Day", "public"],
  "2026-05-10": ["Mother's Day", "observe"],
  "2026-05-25": ["African Union Day", "observe"],
  "2026-05-27": ["Eid al-Adha", "public"],
  "2026-06-21": ["Father's Day", "observe"],
  "2026-07-01": ["Republic Day — Commemorative", "observe"],
  "2026-07-03": ["Republic Day — Public Holiday", "public"],
  "2026-09-21": ["Founders' Day / Kwame Nkrumah Memorial Day", "public"],
  "2026-12-04": ["Farmers' Day", "public"],
  "2026-12-24": ["Christmas Eve", "observe"],
  "2026-12-25": ["Christmas Day", "public"],
  "2026-12-26": ["Boxing Day", "public"],
  "2026-12-28": ["Boxing Day — Day off", "public"],
  "2026-12-31": ["New Year's Eve", "observe"]
};

const GENERAL_OBSERVANCES = {
  "01-24":"International Day of Education",
  "02-14":"Valentine's Day",
  "02-21":"International Mother Language Day",
  "03-08":"International Women's Day",
  "03-22":"World Water Day",
  "04-07":"World Health Day",
  "04-22":"Earth Day",
  "05-17":"World Telecommunication and Information Society Day",
  "06-05":"World Environment Day",
  "06-20":"World Refugee Day",
  "07-30":"International Day of Friendship",
  "08-12":"International Youth Day",
  "09-08":"International Literacy Day",
  "09-21":"International Day of Peace",
  "10-05":"World Teachers' Day",
  "10-10":"World Mental Health Day",
  "10-31":"Halloween",
  "11-19":"International Men's Day",
  "11-20":"World Children's Day",
  "12-01":"World AIDS Day",
  "12-03":"International Day of Persons with Disabilities",
  "12-10":"Human Rights Day"
};

let calendarDate = new Date();
calendarDate.setDate(1);

function dateKey(y,m,d) {
    return `${y}-${pad(m+1)}-${pad(d)}`;
}
function holidayFor(y,m,d) {
    const key = dateKey(y,m,d);
    if (GHANA_HOLIDAYS_2026[key]) return GHANA_HOLIDAYS_2026[key];
    const obs = GENERAL_OBSERVANCES[`${pad(m+1)}-${pad(d)}`];
    return obs ? [obs, "observe"] : null;
}
function renderCalendar() {
    const y = calendarDate.getFullYear(), m = calendarDate.getMonth();
    $("calendar-month-year").textContent = new Date(y,m,1).toLocaleDateString(undefined,{month:"long",year:"numeric"});
    const grid = $("calendar-grid");
    grid.innerHTML = "";
    ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(day => {
        const el=document.createElement("div"); el.className="cal-weekday"; el.textContent=day; grid.appendChild(el);
    });
    const first = new Date(y,m,1).getDay();
    const days = new Date(y,m+1,0).getDate();
    for(let i=0;i<first;i++){ const e=document.createElement("div"); e.className="cal-day empty"; grid.appendChild(e); }
    const now = new Date();
    for(let d=1;d<=days;d++){
        const e=document.createElement("div"); e.className="cal-day";
        const key=dateKey(y,m,d), holiday=holidayFor(y,m,d);
        if(now.getFullYear()===y && now.getMonth()===m && now.getDate()===d) e.classList.add("today");
        if(holiday) e.classList.add(holiday[1]);
        e.innerHTML=`<span class="num">${d}</span>${holiday?`<span class="event-mark">${holiday[0]}</span>`:""}`;
        if(holiday) e.title=holiday[0];
        e.addEventListener("click",()=> holiday ? showToast(`${new Date(y,m,d).toLocaleDateString(undefined,{month:"short",day:"numeric"})}: ${holiday[0]}`) : showToast(new Date(y,m,d).toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"})));
        grid.appendChild(e);
    }
    renderHolidayList(y,m);
}
function renderHolidayList(y,m){
    const list=$("holiday-list"); list.innerHTML="";
    let items=[];
    const days=new Date(y,m+1,0).getDate();
    for(let d=1;d<=days;d++){ const h=holidayFor(y,m,d); if(h) items.push([d,h]); }
    if(!items.length){
        list.innerHTML='<div class="holiday-item"><span>No listed holidays</span><strong>Enjoy the month!</strong></div>';
        return;
    }
    items.forEach(([d,h])=>{
        const e=document.createElement("div"); e.className=`holiday-item ${h[1]}`;
        e.innerHTML=`<span>${new Date(y,m,d).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})}</span><strong>${h[0]}</strong>`;
        list.appendChild(e);
    });
}
$("prev-month").addEventListener("click",()=>{calendarDate.setMonth(calendarDate.getMonth()-1);renderCalendar();});
$("next-month").addEventListener("click",()=>{calendarDate.setMonth(calendarDate.getMonth()+1);renderCalendar();});
$("prev-year").addEventListener("click",()=>{calendarDate.setFullYear(calendarDate.getFullYear()-1);renderCalendar();});
$("next-year").addEventListener("click",()=>{calendarDate.setFullYear(calendarDate.getFullYear()+1);renderCalendar();});
$("today-month").addEventListener("click",()=>{calendarDate=new Date();calendarDate.setDate(1);renderCalendar();});
renderCalendar();

/* Smart Holiday Hub */
const favorites = new Set(JSON.parse(localStorage.getItem('chronos-favorites') || '[]'));
let selectedHoliday = null;
let deferredPrompt = null;
const holidayDescription = 'Plan ahead, save this date, or add it to your personal calendar.';

function allHolidayEntries(year = new Date().getFullYear()) {
  const out = [];
  if ($('country-select').value === 'GH') {
    Object.entries(GHANA_HOLIDAYS_2026).forEach(([date, v]) => out.push({date, name:v[0], type:v[1]}));
  }
  Object.entries(GENERAL_OBSERVANCES).forEach(([md,name]) => out.push({date:`${year}-${md}`,name,type:'observe'}));
  return out.sort((a,b)=>a.date.localeCompare(b.date));
}
function formatHolidayDate(date){ return new Date(date+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}); }
function updateNextHoliday(){
  const now=new Date(); now.setHours(0,0,0,0);
  let entries=allHolidayEntries(now.getFullYear()).concat(allHolidayEntries(now.getFullYear()+1));
  const next=entries.find(h=>new Date(h.date+'T12:00:00')>=now);
  if(!next) return;
  $('next-holiday-name').textContent=next.name;
  $('next-holiday-date').textContent=formatHolidayDate(next.date);
  const days=Math.ceil((new Date(next.date+'T12:00:00')-now)/86400000);
  $('holiday-countdown').textContent=days===0?'Today!':`${days} day${days===1?'':'s'} left`;
}
function saveFavorites(){localStorage.setItem('chronos-favorites',JSON.stringify([...favorites]));}
function showHolidayDetails(h){
  selectedHoliday=h;
  $('modal-title').textContent=h.name; $('modal-date').textContent=formatHolidayDate(h.date); $('modal-description').textContent=holidayDescription;
  $('modal-favorite').textContent=favorites.has(h.date+'|'+h.name)?'♥ Saved':'♡ Save';
  $('holiday-modal').classList.add('show');
}
function renderSearch(query=''){
  const box=$('search-results'); const q=query.trim().toLowerCase();
  if(!q){box.innerHTML='';return;}
  const results=allHolidayEntries(new Date().getFullYear()).filter(h=>h.name.toLowerCase().includes(q)).slice(0,8);
  box.innerHTML='';
  if(!results.length){box.innerHTML='<div class="search-result">No matching holidays found.</div>';return;}
  results.forEach(h=>{const el=document.createElement('button');el.className='search-result';el.innerHTML=`<span>${h.name}</span><strong>${h.date}</strong>`;el.addEventListener('click',()=>showHolidayDetails(h));box.appendChild(el);});
}
$('holiday-search').addEventListener('input',e=>renderSearch(e.target.value));
$('country-select').addEventListener('change',()=>{localStorage.setItem('chronos-country',$('country-select').value);updateNextHoliday();renderSearch($('holiday-search').value);showToast('Holiday region updated.');});
$('country-select').value=localStorage.getItem('chronos-country')||'GH';
$('favorites-filter').addEventListener('click',()=>{const saved=allHolidayEntries(new Date().getFullYear()).filter(h=>favorites.has(h.date+'|'+h.name));const box=$('search-results');box.innerHTML='';if(!saved.length){box.innerHTML='<div class="search-result">No saved holidays yet. Tap a holiday and choose Save.</div>';return;}saved.forEach(h=>{const el=document.createElement('button');el.className='search-result';el.innerHTML=`<span>♥ ${h.name}</span><strong>${h.date}</strong>`;el.onclick=()=>showHolidayDetails(h);box.appendChild(el);});$('home').scrollIntoView({behavior:'smooth'});});
$('modal-close').onclick=()=>$('holiday-modal').classList.remove('show');
$('holiday-modal').addEventListener('click',e=>{if(e.target===$('holiday-modal'))$('holiday-modal').classList.remove('show');});
$('modal-favorite').onclick=()=>{if(!selectedHoliday)return;const key=selectedHoliday.date+'|'+selectedHoliday.name;if(favorites.has(key))favorites.delete(key);else favorites.add(key);saveFavorites();$('modal-favorite').textContent=favorites.has(key)?'♥ Saved':'♡ Save';showToast(favorites.has(key)?'Saved to favorites.':'Removed from saved holidays.');};
$('modal-calendar').onclick=()=>{if(!selectedHoliday)return;const h=selectedHoliday;const stamp=h.date.replaceAll('-','');const next=new Date(h.date+'T12:00:00');next.setDate(next.getDate()+1);const end=next.toISOString().slice(0,10).replaceAll('-','');const ics=`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:${stamp}\nDTEND;VALUE=DATE:${end}\nSUMMARY:${h.name}\nDESCRIPTION:${holidayDescription}\nEND:VEVENT\nEND:VCALENDAR`;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([ics],{type:'text/calendar'}));a.download=h.name.replace(/[^a-z0-9]+/gi,'-')+'.ics';a.click();URL.revokeObjectURL(a.href);showToast('Calendar file created.');};
$('reminder-btn').onclick=async()=>{if(!('Notification'in window))return showToast('Notifications are not supported here.');const p=await Notification.requestPermission();showToast(p==='granted'?'Reminders enabled.':'Notification permission was not granted.');};

/* Mobile navigation and swipe */
document.querySelectorAll('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.nav;if(id==='saved')$('favorites-filter').click();else $(id).scrollIntoView({behavior:'smooth',block:'start'});}));
let touchX=0; $('calendar-grid').addEventListener('touchstart',e=>touchX=e.changedTouches[0].screenX,{passive:true});$('calendar-grid').addEventListener('touchend',e=>{const dx=e.changedTouches[0].screenX-touchX;if(Math.abs(dx)>60){calendarDate.setMonth(calendarDate.getMonth()+(dx<0?1:-1));renderCalendar();}},{passive:true});

/* PWA install support */
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('install-btn').style.display='grid';});
$('install-btn').onclick=async()=>{if(!deferredPrompt)return showToast('Use your browser menu to install this app.');deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;};
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));

updateNextHoliday();
setInterval(updateNextHoliday,60000);


/* Clock Designer */
const designDefaults={style:'digital',color:'#6d8cff',glow:'#8b5cf6',size:1};
let clockDesign=JSON.parse(localStorage.getItem('chronos-clock-design')||'null')||designDefaults;
function hexToRgba(hex,a=.22){const v=hex.replace('#','');const n=parseInt(v.length===3?v.split('').map(x=>x+x).join(''):v,16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;}
function applyClockDesign(){document.body.classList.remove('clock-digital','clock-minimal','clock-neon','clock-classic');document.body.classList.add('clock-'+clockDesign.style);document.documentElement.style.setProperty('--clock-color',clockDesign.color);document.documentElement.style.setProperty('--clock-glow',hexToRgba(clockDesign.glow,.25));document.documentElement.style.setProperty('--clock-scale',clockDesign.size);$('clock-color').value=clockDesign.color;$('glow-color').value=clockDesign.glow;$('clock-size').value=clockDesign.size;$('clock-size-value').textContent=Math.round(clockDesign.size*100)+'%';const preview=$('design-preview-clock');preview.className='preview-clock '+clockDesign.style;preview.style.color=clockDesign.color;preview.style.setProperty('--clock-color',clockDesign.color);document.querySelectorAll('.style-option').forEach(b=>b.classList.toggle('active',b.dataset.clockStyle===clockDesign.style));}
function saveClockDesign(){localStorage.setItem('chronos-clock-design',JSON.stringify(clockDesign));applyClockDesign();}
document.querySelectorAll('.style-option').forEach(b=>b.addEventListener('click',()=>{clockDesign.style=b.dataset.clockStyle;saveClockDesign();}));
$('clock-color').addEventListener('input',e=>{clockDesign.color=e.target.value;saveClockDesign();});$('glow-color').addEventListener('input',e=>{clockDesign.glow=e.target.value;saveClockDesign();});$('clock-size').addEventListener('input',e=>{clockDesign.size=Number(e.target.value);saveClockDesign();});$('reset-design').addEventListener('click',()=>{clockDesign={...designDefaults};saveClockDesign();showToast('Clock design reset.');});applyClockDesign();
