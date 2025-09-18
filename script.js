// script.js (完全版)

// --- HTML要素の取得 ---
const timerDisplay = document.getElementById('timer-display');
const statusDisplay = document.getElementById('status');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const resetButton = document.getElementById('resetButton');
const cycleDisplay = document.getElementById('cycle-display');
const container = document.querySelector('.container');
const preSound = {
    low: new Audio('audio/lstart.wav'),
    high: new Audio('audio/hstart.wav')
};
const endSound = {
    low: new Audio('audio/lstop.wav'),
    high: new Audio('audio/hstop.wav')
};

// --- タイマー設定と状態管理 ---
let durationSettings = [7, 7, 7, 0, 0, 0, 0, 0];
const workColor = '#4CAF50';
const breakTime = 20;
let currentCycle = 1;
let isWorking = true;
let remainingTime = durationSettings[0] * 60;
let isTimerRunning = false;
let isPaused = false;
let isTimerEverStarted = false;

// --- Web WorkerとWake Lockの初期化 ---
let timerWorker = null;
if (window.Worker) {
    timerWorker = new Worker('timer-worker.js');
}
let wakeLock = null;

// --- Wake Lock API 関連の関数 ---
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock is active.');
            wakeLock.addEventListener('release', () => console.log('Wake Lock was released.'));
        } catch (err) {
            console.error(`${err.name}, ${err.message}`);
        }
    }
}

async function releaseWakeLock() {
    if (wakeLock !== null) {
        await wakeLock.release();
        wakeLock = null;
    }
}

// --- UI更新関数 ---
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

function updateUI() {
    if (!isTimerEverStarted) { statusDisplay.textContent = ''; } 
    else if (isPaused) { statusDisplay.textContent = '一時停止中'; } 
    else if (isWorking) { statusDisplay.textContent = '作業中'; } 
    else { statusDisplay.textContent = '準備中'; }

    timerDisplay.textContent = formatTime(remainingTime);
    
    const totalCycles = durationSettings.filter(d => d > 0).length;
    if (totalCycles > 0 && isTimerEverStarted) {
        cycleDisplay.textContent = `${currentCycle} / ${totalCycles}`;
    } else {
        cycleDisplay.textContent = '';
    }
}

// --- プレカウントダウン関数 ---
let precountInterval;
const precountTime = 3;
function startPrecountdown(callback) {
    clearInterval(precountInterval);
    let timeLeft = precountTime;
    timerDisplay.style.color = "#ff9800";
    timerDisplay.textContent = timeLeft;
    precountInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;
        if (timeLeft === 1) { preSound[selectedVoice].play(); }
        if (timeLeft <= 0) {
            clearInterval(precountInterval);
            precountInterval = null;
            if (callback) callback();
        }
    }, 1000);
}

// --- Workerからのメッセージ受信処理 ---
if (timerWorker) {
    timerWorker.onmessage = function(e) {
        const { type, remainingTime: workerTime } = e.data;
        if (type === 'tick') {
            remainingTime = workerTime;
            updateUI();
        } else if (type === 'complete') {
            handleCycleCompletion();
        }
    };
}

// --- サイクル完了時の処理 ---
function handleCycleCompletion() {
    isTimerRunning = false;
    const activeCycles = durationSettings.filter(d => d > 0).length;

    if (isWorking) {
        endSound[selectedVoice].play();
        isWorking = false;
        remainingTime = breakTime;
        timerDisplay.style.color = "#ff9800";
        updateUI();
        if (timerWorker) timerWorker.postMessage({ command: 'start', newDuration: breakTime });
        isTimerRunning = true;
    } else {
        currentCycle++;
        if (currentCycle <= activeCycles) {
            startPrecountdown(() => {
                isWorking = true;
                const activeDurations = durationSettings.filter(d => d > 0);
                const nextDuration = activeDurations[currentCycle - 1] * 60;
                remainingTime = nextDuration;
                timerDisplay.style.color = workColor;
                updateUI();
                if (timerWorker) timerWorker.postMessage({ command: 'start', newDuration: nextDuration });
                isTimerRunning = true;
            });
        } else {
            statusDisplay.textContent = "完了！";
            timerDisplay.textContent = "0:00";
            timerDisplay.style.color = "#333";
            releaseWakeLock();
        }
    }
}

// --- イベントリスナー (Workerにメッセージを送る) ---
startButton.addEventListener("click", () => {
    if (isTimerRunning) return;
    isTimerEverStarted = true;
    startButton.disabled = true;
    requestWakeLock();

    if (isPaused) {
        isPaused = false;
        isTimerRunning = true;
        if (timerWorker) timerWorker.postMessage({ command: 'resume' });
    } else {
        startPrecountdown(() => {
            isWorking = true;
            const activeDurations = durationSettings.filter(d => d > 0);
            const firstDuration = activeDurations[0] * 60;
            remainingTime = firstDuration;
            timerDisplay.style.color = workColor;
            updateUI();
            if (timerWorker) timerWorker.postMessage({ command: 'start', newDuration: firstDuration });
            isTimerRunning = true;
        });
    }
});

stopButton.addEventListener("click", () => {
    if (!isTimerRunning && !isPaused) return;
    if (precountInterval) { // プレカウントダウン中に停止した場合
        clearInterval(precountInterval);
        precountInterval = null;
        resetButton.click(); // リセット処理を呼ぶのが簡単
        return;
    }
    isTimerRunning = false;
    isPaused = true;
    if (timerWorker) timerWorker.postMessage({ command: 'stop' });
    releaseWakeLock();
    updateUI();
    startButton.textContent = "再開";
    startButton.disabled = false;
});

resetButton.addEventListener("click", () => {
    if (timerWorker) timerWorker.postMessage({ command: 'reset' });
    isTimerRunning = false;
    isPaused = false;
    isTimerEverStarted = false;
    currentCycle = 1;
    isWorking = true;
    const activeDurations = durationSettings.filter(d => d > 0);
    remainingTime = (activeDurations.length > 0 ? activeDurations[0] : 0) * 60;
    timerDisplay.style.color = workColor;
    updateUI();
    startButton.textContent = "スタート";
    startButton.disabled = false;
    releaseWakeLock();
});

// --- 初期表示 ---
updateUI();

// --- ここから下は元のコードにあった設定関連のロジック ---

// --- 設定メニュー関連のコード ---
const menuIcon = document.getElementById('menu-icon');
const settingsModal = document.getElementById('settings-modal');
const closeButton = document.getElementById('close-button');
menuIcon.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeButton.addEventListener('click', () => settingsModal.classList.add('hidden'));

// --- 背景色の設定 ---
const bgColorRadios = document.querySelectorAll('input[name="background-color"]');
const h1 = document.querySelector('h1');
const menuIconDots = document.querySelectorAll('#menu-icon .dot');
bgColorRadios.forEach(radio => {
    radio.addEventListener('change', (event) => {
        const color = event.target.value;
        container.style.backgroundColor = color === 'black' ? '#222' : color === 'gray' ? '#cccccc' : '#fff';
        const textColor = color === 'black' ? '#fff' : '';
        h1.style.color = textColor;
        statusDisplay.style.color = textColor;
        menuIconDots.forEach(dot => dot.style.backgroundColor = textColor);
    });
});

// --- 音声の設定 ---
const voiceTypeRadios = document.querySelectorAll('input[name="voice-type"]');
let selectedVoice = 'low';
voiceTypeRadios.forEach(radio => {
    radio.addEventListener('change', (event) => selectedVoice = event.target.value);
});

// --- タイマー設定機能のコード ---
const durationSettingsDiv = document.getElementById('duration-settings');
const timeOptions = [0, 2, 3, 5, 7, 10];
const defaultWorkTime = 7;

function createDurationInputs() {
    durationSettingsDiv.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        const row = document.createElement('div');
        const label = document.createElement('label');
        label.textContent = `${i + 1}回目: `;
        row.appendChild(label);
        
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        const select = document.createElement('select');
        select.dataset.cycleIndex = i;
        
        const currentOptions = (i === 0) ? timeOptions.filter(t => t > 0) : timeOptions;
        currentOptions.forEach(time => {
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time === 0 ? 'なし' : `${time}分`;
            if (time === durationSettings[i]) option.selected = true;
            select.appendChild(option);
        });

        select.addEventListener('change', (event) => {
            const index = parseInt(event.target.dataset.cycleIndex, 10);
            const value = parseInt(event.target.value, 10);
            durationSettings[index] = value;

            if (value === 0) {
                for (let j = index + 1; j < 8; j++) durationSettings[j] = 0;
            } else {
                for (let j = 0; j < index; j++) {
                    if (durationSettings[j] === 0) durationSettings[j] = defaultWorkTime;
                }
            }
            if (!isTimerEverStarted) {
                const activeDurations = durationSettings.filter(d => d > 0);
                remainingTime = (activeDurations.length > 0 ? activeDurations[0] : 0) * 60;
            }
            createDurationInputs();
            updateUI();
        });

        wrapper.appendChild(select);
        row.appendChild(wrapper);
        durationSettingsDiv.appendChild(row);
    }
}
createDurationInputs();

// --- Service Workerの登録 ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => console.log('ServiceWorker registration successful:', reg.scope))
      .catch(err => console.log('ServiceWorker registration failed:', err));
  });
}

// --- カスタムインストールボタンのロジック ---
const installButton = document.getElementById('install-button');
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installButton.classList.remove('hidden');
});
installButton.addEventListener('click', async () => {
    installButton.classList.add('hidden');
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    deferredPrompt = null;
});
window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    console.log('PWA was installed');
});