/**
 * GAME ENGINE: FORCA MEMORIOSA - PREMIUM EDITION
 * Lógica baseada em Redimensionamento Interno para nitidez absoluta e conformação do prompt.
 */

// == CONFIGURAÇÃO INICIAL E ESTADO ==
const state = {
    scale: 1.0,
    sound: true,
    mistakes: 0,
    maxMistakes: 13,
    selectedWord: "",
    selectedHint: "",
    guessedLetters: [],
    wordBank: [],
    lastWord: ""
};

// == ELEMENTOS DOM ==
const startScreen = document.getElementById('start-screen');
const gameplayScreen = document.getElementById('gameplay-screen');
const modalHelp = document.getElementById('modal-help');
const modalSettings = document.getElementById('modal-settings');
const modalGameOver = document.getElementById('modal-game-over');
const gameImage = document.getElementById('game-image');
const virtualKeyboard = document.getElementById('virtual-keyboard');
const wordDisplay = document.getElementById('word-display');
const hintText = document.getElementById('hint-text');
const attemptsCountEl = document.getElementById('attempts-count');
const scaleSlider = document.getElementById('scale-slider');
const scaleLabel = document.getElementById('scale-label');
const soundToggle = document.getElementById('sound-toggle');
const helpText = document.getElementById('help-text-content');
const toastEl = document.getElementById('toast');

// Áudios
const audios = {
    hit: document.getElementById('audio-hit'),
    miss: document.getElementById('audio-miss')
};

// == SISTEMA DE ESCALA INTERNA (NOVO) ==
/**
 * Em vez de transform: scale(), recalculamos as dimensões reais dos elementos para nitidez.
 * Afeta: Fontes, tamanhos dos botões, canvas e padding.
 */
function applyInternalScale(scale) {
    state.scale = scale;
    scaleLabel.textContent = scale.toFixed(1) + 'x';
    scaleSlider.value = scale;

    // 1. Ajustar Root Font Size (Cascata)
    const baseFontSize = 16 * scale;
    document.documentElement.style.fontSize = baseFontSize + "px";

    // 2. Ajustar Teclado (tamanhos nominais)
    const keySize = 56 * scale;
    document.documentElement.style.setProperty('--key-size', keySize + "px");

    // 3. Re-renderizar Teclado para aplicar novas dimensões se estiver ativo
    if (!gameplayScreen.classList.contains('hidden')) {
        renderKeyboard();
    }

    // 4. Ajustar Elemento Gráfico
    // Opcional: ajustar tamanho da imagem via escala se necessário
    if (gameImage) {
        gameImage.style.maxHeight = (400 * scale) + "px";
    }
    updateGameDisplay('start');

    // 5. Ajustar Word Display
    wordDisplay.style.fontSize = (2.5 * scale) + "rem";
    wordDisplay.style.letterSpacing = (0.5 * scale) + "rem";
}

// == CORE ENGINE ==

async function init() {
    loadPreferences();
    setupListeners();
    await loadWords();
    preloadImages();
    // Aplicar escala inicial antes de mostrar a tela
    applyInternalScale(state.scale);
}

function preloadImages() {
    ['acerto.png', 'erro.png', 'erro13.png'].forEach(file => {
        const img = new Image();
        img.src = 'images/' + file;
    });
}

function loadPreferences() {
    const s = localStorage.getItem('forca_scale');
    if (s) state.scale = parseFloat(s);

    const vol = localStorage.getItem('forca_sound');
    if (vol !== null) state.sound = vol === 'true';

    soundToggle.checked = state.sound;
}

async function loadWords() {
    // Agora o jogo usa DIRETAMENTE o que estiver no data/words.js (carregado via script no index.html)
    if (typeof WORLD_BANK_DATA !== 'undefined') {
        state.wordBank = WORLD_BANK_DATA;
        console.log("Palavras carregadas com sucesso via words.js:", state.wordBank.length, "itens.");
    } else {
        console.error("ERRO: O arquivo data/words.js não foi carregado corretamente ou a variável WORLD_BANK_DATA não existe.");
        // Fallback de emergência caso o arquivo falhe completamente
        state.wordBank = [
            { word: "AMOR", hint: "Sentimento de afeto e carinho" },
            { word: "CASA", hint: "Lugar onde moramos" }
        ];
    }
}

function savePreferences(showMsg = true) {
    localStorage.setItem('forca_scale', state.scale);
    localStorage.setItem('forca_sound', state.sound);
    if (showMsg) showToast("Preferência salva");
}

function startNewGame() {
    if (state.wordBank.length === 0) {
        showToast("Carregando palavras, tente novamente em instantes.");
        return;
    }
    let item;
    // Tenta pegar uma palavra diferente da anterior para aumentar a percepção de aleatoriedade
    do {
        item = state.wordBank[Math.floor(Math.random() * state.wordBank.length)];
    } while (state.wordBank.length > 1 && item.word === state.lastWord);

    state.lastWord = item.word;
    state.selectedWord = item.word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    state.selectedHint = item.hint;
    state.guessedLetters = [];
    state.mistakes = 0;
    
    // Adaptabilidade: Limite de erros é 50% do tamanho da palavra
    state.maxMistakes = Math.max(1, Math.ceil(state.selectedWord.length * 0.5));

    hintText.textContent = state.selectedHint;
    modalGameOver.classList.add('hidden');
    renderWord();
    renderKeyboard();
    updateGameDisplay('start');
    updateAttemptsUI();

    startScreen.classList.add('hidden');
    gameplayScreen.classList.remove('hidden');
}

function renderWord() {
    let displayStr = "";
    let won = true;
    for (let char of state.selectedWord) {
        if (state.guessedLetters.includes(char)) {
            displayStr += char + " ";
        } else {
            displayStr += "_ ";
            won = false;
        }
    }
    wordDisplay.textContent = displayStr.trim();
    if (won && state.selectedWord.length > 0) endGame(true);
}

function renderKeyboard() {
    virtualKeyboard.innerHTML = "";
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

    alphabet.forEach(letter => {
        const btn = document.createElement('button');
        btn.textContent = letter;
        btn.className = "key-btn scale-internal-text";

        // Estilo inline para garantir conformidade com escala interna milimétrica
        btn.style.width = (60 * state.scale) + "px";
        btn.style.height = (60 * state.scale) + "px";
        btn.style.fontSize = (1.4 * state.scale) + "rem";

        if (state.guessedLetters.includes(letter)) {
            btn.classList.add('used');
        }

        btn.onclick = () => handleGuess(letter, btn);
        virtualKeyboard.appendChild(btn);
    });
}

function handleGuess(letter, btn) {
    if (state.guessedLetters.includes(letter)) return;

    state.guessedLetters.push(letter);
    btn.classList.add('used');

    if (state.selectedWord.includes(letter)) {
        playSound('hit');
        renderWord();
        updateGameDisplay('hit');
    } else {
        state.mistakes++;
        playSound('miss');
        updateGameDisplay('miss');
        updateAttemptsUI();

        if (state.mistakes >= state.maxMistakes) {
            // Pequeno delay para o jogador ver a imagem erro13.png antes do modal aparecer
            setTimeout(() => endGame(false), 600);
        }
    }
}

function updateGameDisplay(type) {
    if (!gameImage) return;

    if (type === 'start' || type === 'hit') {
        gameImage.src = 'images/acerto.png';
    } else if (type === 'miss') {
        // Se for o último erro permitido, mostra a imagem de erro fatal
        if (state.mistakes >= state.maxMistakes) {
            gameImage.src = 'images/erro13.png';
        } else {
            gameImage.src = 'images/erro.png';
        }
    }
}

function updateAttemptsUI() {
    if (!attemptsCountEl) return;
    const remaining = Math.max(0, state.maxMistakes - state.mistakes);
    attemptsCountEl.textContent = remaining;
}

function endGame(won) {
    modalGameOver.classList.remove('hidden');
    const title = document.getElementById('game-over-title');
    const msg = document.getElementById('game-over-msg');

    if (won) {
        title.textContent = "MEMÓRIA DE ELEFANTE!";
        title.style.color = "var(--secondary-color)";
        msg.textContent = "Você acertou a palavra sem titubear.";
    } else {
        title.textContent = "NÃO FOI DESSA VEZ";
        title.style.color = "var(--danger-color)";
        msg.textContent = "A palavra era: " + state.selectedWord;
    }
}

// == UTILITÁRIOS ==

async function fetchHelp() {
    try {
        helpText.textContent = "Carregando instruções...";
        const response = await fetch('fontes/README.TXT');

        // trocar para API nativa do Antigravity aqui
        if (!response.ok) throw new Error();

        const raw = await response.text();
        helpText.textContent = raw.replace(/\r\n/g, '\n');
    } catch {
        helpText.innerHTML = `<p style="color:var(--danger-color); font-weight:bold;">Não foi possível carregar o README.</p>
        <p>Rode o jogo via servidor HTTP local ou verifique se o arquivo /fontes/README.TXT existe.</p>`;
    }
}

function playSound(type) {
    if (!state.sound) return;
    const a = audios[type];
    if (a) {
        a.currentTime = 0;
        a.play().catch(() => { });
    }
}

function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    // Forçar reflow para reiniciar animação
    toastEl.style.animation = 'none';
    toastEl.offsetHeight;
    toastEl.style.animation = null;

    setTimeout(() => toastEl.classList.add('hidden'), 2500);
}

// == LISTENERS ==

function setupListeners() {
    // Menu
    document.getElementById('btn-start').onclick = startNewGame;
    document.getElementById('btn-back-menu').onclick = () => {
        gameplayScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
    };

    // Ajuda
    document.getElementById('btn-help').onclick = () => {
        modalHelp.classList.remove('hidden');
        fetchHelp();
    };
    document.getElementById('btn-close-help').onclick = () => modalHelp.classList.add('hidden');
    document.getElementById('btn-copy-help').onclick = () => {
        navigator.clipboard.writeText(helpText.textContent);
        showToast("Texto copiado!");
    };

    // Configurações
    document.getElementById('btn-settings').onclick = () => modalSettings.classList.remove('hidden');
    document.getElementById('btn-close-settings').onclick = () => modalSettings.classList.add('hidden');

    scaleSlider.oninput = (e) => applyInternalScale(parseFloat(e.target.value));
    scaleSlider.onchange = () => savePreferences();

    document.getElementById('btn-scale-up').onclick = () => {
        let val = Math.min(1.6, state.scale + 0.1);
        applyInternalScale(val);
        savePreferences();
    };
    document.getElementById('btn-scale-down').onclick = () => {
        let val = Math.max(0.7, state.scale - 0.1);
        applyInternalScale(val);
        savePreferences();
    };

    soundToggle.onchange = (e) => {
        state.sound = e.target.checked;
        savePreferences();
    };

    document.getElementById('btn-restore-defaults').onclick = () => {
        applyInternalScale(1.0);
        state.sound = true;
        soundToggle.checked = true;
        savePreferences(false);
        showToast("Padrões restaurados");
    };

    // Fim de Jogo
    document.getElementById('btn-next-word').onclick = startNewGame;
    document.getElementById('btn-exit-game').onclick = () => {
        modalGameOver.classList.add('hidden');
        gameplayScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
    };
}

window.onload = init;
