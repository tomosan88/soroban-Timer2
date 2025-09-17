// HTML要素を取得
const timerDisplay = document.getElementById('timer-display');
const statusDisplay = document.getElementById('status');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const resetButton = document.getElementById('resetButton');
const cycleList = document.getElementById('cycle-list');
const container = document.querySelector('.container');
const preSound = {
    low: new Audio('audio/lstart.wav'),
    high: new Audio('audio/hstart.wav')
};
// 上をバラバラに書いた場合
//const preSoundLow = new Audio('audio/lstart.wav');
//const preSoundHigh = new Audio('audio/hstart.wav');
const endSound = {
    low: new Audio('audio/lstop.wav'),
    high: new Audio('audio/hstop.wav')
};
// ★★★ タイマーの基本設定データ ★★★
let durationSettings = [7, 7, 7, 0, 0, 0, 0, 0]; // 各回の時間設定（0は「なし」）

// 初期設定
const workColor = '#4CAF50'; // 作業中のタイマーの色を定義
let timerInterval;
let precountInterval;
const breakTime = 20;     // 休憩時間 20秒
let currentCycle = 1;
let isWorking = true;
// ↓↓↓ ページ読み込み時に、設定の1回目の時間で初期化する ↓↓↓
let remainingTime = durationSettings[0] * 60;
let precountTime = 3;     // プレカウント 3秒
let isPaused = false
let isTimerEverStarted = false; // タイマーが一度でも開始されたか

// 時間表示をフォーマット
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// UI更新
// 【updateUI 関数をこれで差し替え】
function updateUI() {
    // --- ステータス表示の制御 ---
    if (!isTimerEverStarted) {
        statusDisplay.textContent = ''; 
    } else if (isPaused) {
        statusDisplay.textContent = '一時停止中';
    } else if (isWorking) {
        statusDisplay.textContent = '作業中';
    } else {
        statusDisplay.textContent = '準備中';
    }

    timerDisplay.textContent = formatTime(remainingTime);

    // --- サイクル表示の制御 (x / n 形式) ---
    // durationSettings配列から、0(なし)ではない要素の数を合計回数として取得
    const totalCycles = durationSettings.filter(d => d > 0).length;
    
    // HTML要素を（念のため）再取得
    const cycleDisplay = document.getElementById('cycle-display');

    if (totalCycles > 0 && isTimerEverStarted) {
        // 合計回数が1以上で、タイマーが開始されたら表示
        cycleDisplay.textContent = `${currentCycle} / ${totalCycles}`;
    } else {
        // それ以外の場合は非表示
        cycleDisplay.textContent = '';
    }
}

// プレカウントダウン
function startPrecountdown(callback) {
    clearInterval(precountInterval);
    let timeLeft = precountTime;

    //statusDisplay.textContent = "準備時間";
    timerDisplay.style.color = "#ff9800";
    timerDisplay.textContent = timeLeft;

    precountInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;

        if (timeLeft === 1) {
            preSound[selectedVoice].play();
        }

        if (timeLeft <= 0) {
            clearInterval(precountInterval);
            precountInterval = null;
            if (callback) callback();
        }
    }, 1000);
}

// カウントダウン関数
function countdown() {
    remainingTime--;
    updateUI();

    if (remainingTime <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;

        const activeCycles = durationSettings.filter(d => d > 0).length;

        if (isWorking) {
            endSound[selectedVoice].play();
            isWorking = false;
            remainingTime = breakTime;
            timerDisplay.style.color = "#ff9800";
            timerInterval = setInterval(countdown, 1000);
        } else {
            currentCycle++;
            if (currentCycle <= activeCycles) { 
                startPrecountdown(() => {
                    isWorking = true;
                    // 次のサイクルの時間を設定から取得（0ではないはず）
                    const activeDurations = durationSettings.filter(d => d > 0);
                    remainingTime = activeDurations[currentCycle - 1] * 60; 
                    timerDisplay.style.color = workColor;
                    updateUI();
                    timerInterval = setInterval(countdown, 1000);
                });
            } else {
                statusDisplay.textContent = "完了！";
                timerDisplay.textContent = "0:00";
                timerDisplay.style.color = "#333";
            }
        }
    }
}

// イベントリスナー
startButton.addEventListener("click", () => {
    if (timerInterval || precountInterval) return;
    
    isTimerEverStarted = true; // ★★★ これを追加: スタートが押された！
    startButton.disabled = true;

    if (isPaused) {
        isPaused = false;
        timerInterval = setInterval(countdown, 1000);
    } else {
        startPrecountdown(() => {
            isWorking = true;
            const activeDurations = durationSettings.filter(d => d > 0);
            remainingTime = activeDurations[0] * 60;
            timerDisplay.style.color = workColor;
            updateUI();
            timerInterval = setInterval(countdown, 1000);
        });
    }
});

stopButton.addEventListener("click", () => {
    clearInterval(timerInterval);
    clearInterval(precountInterval);
    timerInterval = null;
    precountInterval = null;
    isPaused = true;
    updateUI(); // 「一時停止中」と表示
    startButton.textContent = "再開";
    startButton.disabled = false;
});

// 【resetButton のイベントリスナーをこれで差し替え】
resetButton.addEventListener("click", () => {
    clearInterval(timerInterval);
    clearInterval(precountInterval);
    timerInterval = null;
    precountInterval = null;

    currentCycle = 1;
    isWorking = true;
    isPaused = false;
    isTimerEverStarted = false; // ★★★ これを追加: 初期状態に戻す！

    const activeDurations = durationSettings.filter(d => d > 0);
    remainingTime = (activeDurations.length > 0 ? activeDurations[0] : 0) * 60;
    timerDisplay.style.color = workColor;
    
    updateUI(); 
    
    startButton.textContent = "スタート";
    startButton.disabled = false;
});

// 初期表示
updateUI();


// --- 設定メニュー関連のコード ---
const menuIcon = document.getElementById('menu-icon');
const settingsModal = document.getElementById('settings-modal');
const closeButton = document.getElementById('close-button');

menuIcon.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

closeButton.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

// --- 背景色の設定 ---
const bgColorRadios = document.querySelectorAll('input[name="background-color"]');
const h1 = document.querySelector('h1');
const menuIconDots = document.querySelectorAll('#menu-icon .dot');

bgColorRadios.forEach(radio => {
    radio.addEventListener('change', (event) => {
        if (event.target.value === 'black') {
            container.style.backgroundColor = '#222';
            h1.style.color = '#fff';
            statusDisplay.style.color = '#fff';
            cycleList.style.color = '#aaa';
            menuIconDots.forEach(dot => dot.style.backgroundColor = '#fff');
        } else if (event.target.value === 'gray') {
            container.style.backgroundColor = '#cccccc';
            h1.style.color = '';
            statusDisplay.style.color = '';
            cycleList.style.color = '';
            menuIconDots.forEach(dot => dot.style.backgroundColor = '');
        } else {
            container.style.backgroundColor = '#fff';
            h1.style.color = '';
            statusDisplay.style.color = '';
            cycleList.style.color = '';
            menuIconDots.forEach(dot => dot.style.backgroundColor = '');
        }
    });
});

// --- 音声の設定 ---
const voiceTypeRadios = document.querySelectorAll('input[name="voice-type"]');
let selectedVoice = 'low';

voiceTypeRadios.forEach(radio => {
    radio.addEventListener('change', (event) => {
        selectedVoice = event.target.value;
        console.log('選択された音声:', selectedVoice);
    });
});

// --- ▼▼▼ 新しいタイマー設定機能のコード ▼▼▼ ---

// 設定画面のHTML要素を取得
const durationSettingsDiv = document.getElementById('duration-settings');

// 時間設定の選択肢（0を「なし」として追加）
const timeOptions = [0, 3, 5, 7, 10];
const defaultWorkTime = 7; // 「なし」から時間アリに戻す際のデフォルト値

// 時間設定のUIを生成・再描画する関数
function createDurationInputs() {
    // まず中身を空っぽにする
    durationSettingsDiv.innerHTML = '';

    // 8回分のUIをループで生成
    for (let i = 0; i < 8; i++) {
        // 各回ごとの設定（ラベル + プルダウン）を囲むdiv
        const row = document.createElement('div');
        
        // 「1回目:」などのラベル
        const label = document.createElement('label');
        label.textContent = `${i + 1}回目: `;
        row.appendChild(label);

        // --- ここからがプルダウン本体 ---

        // 1. select要素を囲むラッパーを作り、CSS用のクラス名を付ける
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';

        // 2. select要素を作る
        const select = document.createElement('select');
        select.dataset.cycleIndex = i;

// このプルダウンで使う選択肢の配列を決める
        // 1回目(iが0)なら、0を除いた配列を使い、それ以外は元の配列を使う
        const currentOptions = (i === 0) ? timeOptions.filter(t => t > 0) : timeOptions;

        // 3. 決定した選択肢の配列を使ってoption要素を追加していく
        currentOptions.forEach(time => {
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time === 0 ? 'なし' : `${time}分`;
            if (time === durationSettings[i]) {
                option.selected = true;
            }
            select.appendChild(option);
        })

        // 4. selectの値が変更されたときのイベント処理
        select.addEventListener('change', (event) => {
            const index = parseInt(event.target.dataset.cycleIndex, 10);
            const value = parseInt(event.target.value, 10);
            durationSettings[index] = value;

            if (value === 0) {
                for (let j = index + 1; j < 8; j++) {
                    durationSettings[j] = 0;
                }
            } else {
                for (let j = 0; j < index; j++) {
                    if (durationSettings[j] === 0) {
                        durationSettings[j] = defaultWorkTime;
                    }
                }
            }
            
            createDurationInputs();
            updateUI();
        });

        // 5. 組み立てたselectをラッパーの中に入れる
        wrapper.appendChild(select);

        // 6. ラッパーごと行に追加する
        row.appendChild(wrapper);

        // --- プルダウン本体ここまで ---

        // 7. 出来上がった行を、設定画面の要素に追加する
        durationSettingsDiv.appendChild(row);
    }
}

// 最初に設定画面を開いたときのために、一度UIを生成しておく
createDurationInputs();

// --- ▲▲▲ ここまで ▲▲▲ ---

// --- ▼▼▼ Service Workerの登録 ▼▼▼ ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}
// --- ▲▲▲ ここまで ▲▲▲ ---

// --- ▼▼▼ カスタムインストールボタンのロジック ▼▼▼ ---

const installButton = document.getElementById('install-button');
let deferredPrompt; // インストールのためのイベントを保存しておく変数

// 1. ブラウザが「インストールできますよ」と知らせてきた時の処理
window.addEventListener('beforeinstallprompt', (e) => {
  // ブラウザが自動で出すポップアップをキャンセルする
  e.preventDefault();
  
  // あとで使うために、イベントを保存しておく
  deferredPrompt = e;
  
  // 自前のインストールボタンを表示する
  installButton.classList.remove('hidden');
  console.log('`beforeinstallprompt` event was fired.');
});

// 2. 自前のインストールボタンがクリックされた時の処理
installButton.addEventListener('click', async () => {
  // ボタンを非表示にする（一度インストールしたら不要なので）
  installButton.classList.add('hidden');
  
  // 保存しておいたイベントを使って、インストールのポップアップを表示する
  deferredPrompt.prompt();
  
  // ユーザーが「追加」か「キャンセル」を選んだ結果を待つ
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to the install prompt: ${outcome}`);
  
  // 結果を受け取ったので、もうイベントは不要
  deferredPrompt = null;
});

// 3. アプリがインストールされた後の処理
window.addEventListener('appinstalled', () => {
  // インストールされたら、もうイベントは不要
  deferredPrompt = null;
  console.log('PWA was installed');
});

// --- ▲▲▲ ここまで ▲▲▲ ---