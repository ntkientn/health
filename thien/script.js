// Global Data Cache for Quotes and Articles
let siteData = null;

// Audio context synthetic oscillator cues for Box Breathing
let audioCtx = null;
let breatheInterval = null;
let totalTimeRemaining = 0;
let totalTimerInterval = null;
let cycleTicks = 0; 
let isPracticing = false;

// Initialize when DOM content is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    fetchSiteData();
    renderSurveyHistory();
    
    // Tự động cập nhật nhãn số giây (4s, 5s, 6s) của các thanh tiến trình khi đổi option nhịp thở
    const paceSelect = document.getElementById("breath-pace");
    if (paceSelect) {
        updatePaceLabels(parseInt(paceSelect.value));
        paceSelect.addEventListener("change", (e) => {
            updatePaceLabels(parseInt(e.target.value));
        });
    }
});

// Hàm hỗ trợ cập nhật text hiển thị trên các thanh trạng thái dưới hình tròn
function updatePaceLabels(pace) {
    document.getElementById("phase-hit").innerText = `Hít vào (${pace}s)`;
    document.getElementById("phase-giu1").innerText = `Giữ hơi (${pace}s)`;
    document.getElementById("phase-tho").innerText = `Thở ra (${pace}s)`;
    document.getElementById("phase-giu2").innerText = `Nghỉ (${pace}s)`;
}

// Fetch Data from JSON safely
async function fetchSiteData() {
    try {
        const response = await fetch('data.json');
        siteData = await response.json();
        
        // Initial random selection
        loadRandomQuote();
        loadRandomArticle();
    } catch (error) {
        console.error("Error loading data.json file asset:", error);
    }
}

// Select a random life quote
function loadRandomQuote() {
    if (!siteData || !siteData.quotes.length) return;
    const randomIndex = Math.floor(Math.random() * siteData.quotes.length);
    const element = document.getElementById("daily-quote");
    element.classList.remove("animate-fade");
    void element.offsetWidth; // Trigger reflow to restart animation
    element.innerText = siteData.quotes[randomIndex];
    element.classList.add("animate-fade");
}

// Select a random article
function loadRandomArticle() {
    if (!siteData || !siteData.articles.length) return;
    const randomIndex = Math.floor(Math.random() * siteData.articles.length);
    const article = siteData.articles[randomIndex];
    
    const container = document.getElementById("featured-article-container");
    container.classList.remove("animate-fade");
    void container.offsetWidth;

    container.innerHTML = `
        <div class="article-img-box" style="background-image: url('${article.image || ''}')"></div>
        <div class="article-body">
            <span class="article-tag">${article.category}</span>
            <h3 class="article-title">${article.title}</h3>
            <p class="article-para" style="font-weight: 500; color: #2c4a3e;">${article.summary}</p>
            <p class="article-para">${article.content}</p>
        </div>
    `;
    container.classList.add("animate-fade");
}

// Tab switcher handler
function switchTab(tabIndex) {
    const buttons = document.querySelectorAll(".tab-button");
    buttons.forEach((btn, idx) => {
        if(idx + 1 === tabIndex) btn.classList.add("active");
        else btn.classList.remove("active");
    });

    const contents = document.querySelectorAll(".tab-content");
    contents.forEach((block, idx) => {
        if(idx + 1 === tabIndex) block.classList.add("active-content");
        else block.classList.remove("active-content");
    });

    if (tabIndex !== 2 && isPracticing) {
        togglePractice();
    }
}

/* ==========================================================================
   TAB 2: BOX BREATHING ENGINE WITH AUDIO BACKGROUND & DYNAMIC PACE
   ========================================================================== */
function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// PHẦN CẬP NHẬT TĂNG ÂM LƯỢNG TIẾNG BEEP CHUYỂN PHA
function playPhaseSound(frequency, duration, type = 'sine') {
    if (!audioCtx) return;
    try {
        let osc = audioCtx.createOscillator();
        let gainNode = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.value = frequency;
        
        // Đã tăng từ 0.12 lên 0.45 giúp âm thanh hiệu lệnh nghe rõ ràng, sắc nét hơn
        gainNode.gain.setValueAtTime(0.45, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.log("Audio cue muted.");
    }
}

function togglePractice() {
    initAudioContext();
    const startBtn = document.getElementById("btn-start-practice");
    const durationSelect = document.getElementById("practice-duration");
    const paceSelect = document.getElementById("breath-pace");
    const audioSelect = document.getElementById("bg-music"); 
    const bgPlayer = document.getElementById("audio-bg-player");

    if (isPracticing) {
        // STOP MECHANISM
        clearInterval(breatheInterval);
        clearInterval(totalTimerInterval);
        isPracticing = false;
        
        startBtn.innerText = "🚀 Bắt Đầu Thiền";
        startBtn.classList.remove("active-stop");
        
        resetBreathingVisuals();
        
        // Mở khóa cấu hình khi dừng
        if(paceSelect) paceSelect.disabled = false;
        if(durationSelect) durationSelect.disabled = false;

        if (bgPlayer) {
            bgPlayer.pause();
            bgPlayer.currentTime = 0; 
        }
    } else {
        // START MECHANISM
        isPracticing = true;
        startBtn.innerText = "🛑 Dừng Thực Hành";
        startBtn.classList.add("active-stop");

        // Khóa cấu hình tránh xung đột khi đang thiền
        if(paceSelect) paceSelect.disabled = true;
        if(durationSelect) durationSelect.disabled = true;

        const chosenPace = parseInt(paceSelect.value) || 4;
        const totalCycleSeconds = chosenPace * 4; 

        totalTimeRemaining = parseInt(durationSelect.value);
        updateTimerDisplay(totalTimeRemaining);

        // Kích hoạt phát nhạc nền từ menu chọn nhạc bài hát
        if (bgPlayer && audioSelect && audioSelect.value !== "nature") {
            bgPlayer.src = audioSelect.value;
            bgPlayer.volume = 0.25; // Nhạc nền giữ mức 25% vừa phải dịu êm
            bgPlayer.loop = true;
            bgPlayer.play().catch(err => console.log("Audio play blocked:", err));
        }

        cycleTicks = 0;
        executeFixedBreathingStep(chosenPace);

        breatheInterval = setInterval(() => {
            cycleTicks = (cycleTicks + 1) % totalCycleSeconds;
            executeFixedBreathingStep(chosenPace);
        }, 1000);

        totalTimerInterval = setInterval(() => {
            totalTimeRemaining--;
            updateTimerDisplay(totalTimeRemaining);

            if(totalTimeRemaining <= 0) {
                playPhaseSound(528, 1.2, 'triangle');
                togglePractice();
                alert("Chúc mừng bạn đã hoàn thành bài thực hành thiền định nuôi dưỡng tâm an!");
            }
        }, 1000);
    }
}

function updateTimerDisplay(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    document.getElementById("timer-text").innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function resetBreathingVisuals() {
    const node = document.getElementById("breath-node");
    node.style.transition = "none";
    node.className = "breathing-circle rest-static state-small";
    
    document.getElementById("breath-status").innerText = "Sẵn Sàng";
    document.querySelectorAll(".pace-phase").forEach(p => p.classList.remove("active-phase"));
}

function executeFixedBreathingStep(pace) {
    const node = document.getElementById("breath-node");
    const statusText = document.getElementById("breath-status");
    
    const phases = [
        document.getElementById("phase-hit"),
        document.getElementById("phase-giu1"),
        document.getElementById("phase-tho"),
        document.getElementById("phase-giu2")
    ];

    phases.forEach(p => p.classList.remove("active-phase"));

    // PHA 1: HÍT VÀO
    if (cycleTicks === 0) {
        phases[0].classList.add("active-phase");
        statusText.innerText = `Hít Vào (${pace}s)...`;
        playPhaseSound(330, 0.4);

        node.style.transition = "none";
        node.className = "breathing-circle inhale-active state-small";
        
        void node.offsetWidth; 
        
        node.style.transition = `width ${pace}s linear, height ${pace}s linear, background-color ${pace}s linear`;
        node.className = "breathing-circle inhale-active state-large";
    } 
    else if (cycleTicks > 0 && cycleTicks < pace) {
        phases[0].classList.add("active-phase");
    }
    // PHA 2: GIỮ HƠI
    else if (cycleTicks === pace) {
        phases[1].classList.add("active-phase");
        statusText.innerText = `Giữ Hơi Thở (${pace}s)`;
        playPhaseSound(392, 0.3);

        node.style.transition = "none";
        node.className = "breathing-circle hold-static state-large"; 
    } 
    else if (cycleTicks > pace && cycleTicks < pace * 2) {
        phases[1].classList.add("active-phase");
    }
    // PHA 3: THỞ RA
    else if (cycleTicks === pace * 2) {
        phases[2].classList.add("active-phase");
        statusText.innerText = `Thở Ra Từ Từ (${pace}s)...`;
        playPhaseSound(261, 0.5);

        node.style.transition = "none";
        node.className = "breathing-circle exhale-active state-large";
        
        void node.offsetWidth; 
        
        node.style.transition = `width ${pace}s linear, height ${pace}s linear, background-color ${pace}s linear`;
        node.className = "breathing-circle exhale-active state-small";
    } 
    else if (cycleTicks > pace * 2 && cycleTicks < pace * 3) {
        phases[2].classList.add("active-phase");
    }
    // PHA 4: NGHỈ TĨNH LẶNG
    else if (cycleTicks === pace * 3) {
        phases[3].classList.add("active-phase");
        statusText.innerText = `Nghỉ Tĩnh Lặng (${pace}s)`;
        playPhaseSound(220, 0.2);

        node.style.transition = "none";
        node.className = "breathing-circle rest-static state-small"; 
    }
    else if (cycleTicks > pace * 3 && cycleTicks < pace * 4) {
        phases[3].classList.add("active-phase");
    }
}

/* ==========================================================================
   TAB 3: SURVEY SYSTEM
   ========================================================================== */
function processSurvey(event) {
    event.preventDefault();
    const formData = new FormData(document.getElementById("mindfulness-form"));
    
    let totalScore = 0;
    for (let i = 1; i <= 10; i++) {
        const val = formData.get(`q${i}`);
        if(val) totalScore += parseInt(val);
    }

    let state = "";
    let advice = "";

    if (totalScore <= 18) {
        state = "Tâm Trí Bình Ổn & An Nhiên";
        advice = "Tuyệt vời! Tâm trí bạn đang có khả năng tự cân bằng sâu sắc. Tiếp tục duy trì 5-10 phút thiền thở Box Breathing hàng ngày.";
    } else if (totalScore <= 28) {
        state = "Tâm Trí Bất An Nhẹ & Stress Tích Tụ";
        advice = "Cảnh báo nhẹ: Bạn có dấu hiệu mệt mỏi. Mở Tab 2 thực hành ngay bài thở sâu khi cảm thấy nóng giận.";
    } else {
        state = "Tâm Trí Quá Tải / Cần Chữa Lành";
        advice = "Báo động: Bạn đang lo âu sâu sắc. Cần ưu tiên thiền buông thư toàn thân (Tab 2) và đọc kỹ bài viết Tab 1.";
    }

    document.getElementById("score-number").innerText = `${totalScore} / 40`;
    document.getElementById("score-status-text").innerText = state;
    document.getElementById("advice-text").innerText = advice;
    document.getElementById("survey-result-box").classList.remove("hidden");

    saveToHistory(totalScore, state);
    document.getElementById("survey-result-box").scrollIntoView({ behavior: 'smooth' });
}

function saveToHistory(score, state) {
    let history = JSON.parse(localStorage.getItem("meditation_survey_history")) || [];
    history.unshift({
        date: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit' }),
        score: score,
        state: state
    });
    if(history.length > 7) history.pop();
    localStorage.setItem("meditation_survey_history", JSON.stringify(history));
    renderSurveyHistory();
}

function renderSurveyHistory() {
    const list = document.getElementById("history-list");
    let history = JSON.parse(localStorage.getItem("meditation_survey_history")) || [];
    if(history.length === 0) {
        list.innerHTML = `<li class="empty-history">Chưa có dữ liệu khảo sát.</li>`;
        return;
    }
    list.innerHTML = history.map(item => `<li><div><strong>${item.score}đ</strong> - ${item.state}</div><span style="font-size:11px;color:#999;">${item.date}</span></li>`).join('');
}

function clearSurveyHistory() {
    if(confirm("Xóa lịch sử khảo sát?")) {
        localStorage.removeItem("meditation_survey_history");
        renderSurveyHistory();
    }
}
