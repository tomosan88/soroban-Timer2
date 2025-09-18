// timer-worker.js

let timerInterval = null;
let startTime = 0;
let duration = 0; // ミリ秒単位
let isPaused = false;
let pausedTime = 0;

// メインスレッドからのメッセージを受け取るためのイベントリスナー
self.onmessage = function(e) {
    const { command, newDuration } = e.data;

    switch (command) {
        case 'start':
            if (timerInterval) clearInterval(timerInterval);
            startTime = Date.now();
            duration = newDuration * 1000;
            isPaused = false;
            timerInterval = setInterval(tick, 100);
            break;

        case 'stop':
            if (!isPaused) {
                clearInterval(timerInterval);
                timerInterval = null;
                isPaused = true;
                pausedTime = Date.now();
            }
            break;
            
        case 'resume':
            if (isPaused) {
                const pausedDuration = Date.now() - pausedTime;
                startTime += pausedDuration;
                isPaused = false;
                timerInterval = setInterval(tick, 100);
            }
            break;

        case 'reset':
            clearInterval(timerInterval);
            timerInterval = null;
            startTime = 0;
            duration = 0;
            isPaused = false;
            break;
    }
};

// 時間を計算してメインスレッドに送信する関数
function tick() {
    if (isPaused) return;

    const elapsedTime = Date.now() - startTime;
    const remainingMilliseconds = duration - elapsedTime;
    const remainingSeconds = Math.round(remainingMilliseconds / 1000);

    if (remainingSeconds >= 0) {
        self.postMessage({ type: 'tick', remainingTime: remainingSeconds });
    }

    if (remainingMilliseconds <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        self.postMessage({ type: 'complete' });
    }
}