let audioContext = null;
let analyser = null;
let dataArray = null;
let currentTuning = null;
let currentTuningName = null;
let currentTargetFreq = null;
let currentStringIndex = -1;
let manualSelection = false;
let microphone = null;

let lastValidFreq = null;
let lastValidNote = null;
let resetTimer = null;

let historyChart = null;

// Frequências de referência (Lá4 = 440Hz)
const noteFrequencies = {
  'C0': 16.35, 'C#0': 17.32, 'D0': 18.35, 'D#0': 19.45, 'E0': 20.60, 'F0': 21.83, 'F#0': 23.12, 'G0': 24.50, 'G#0': 25.96, 'A0': 27.50, 'A#0': 29.14, 'B0': 30.87,
  'C1': 32.70, 'C#1': 34.65, 'D1': 36.71, 'D#1': 38.89, 'E1': 41.20, 'F1': 43.65, 'F#1': 46.25, 'G1': 49.00, 'G#1': 51.91, 'A1': 55.00, 'A#1': 58.27, 'B1': 61.74,
  'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'B2': 123.47,
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
  'C6': 1046.50, 'C#6': 1108.73, 'D6': 1174.66, 'D#6': 1244.51, 'E6': 1318.51, 'F6': 1396.91, 'F#6': 1479.98, 'G6': 1567.98, 'G#6': 1661.22, 'A6': 1760.00, 'A#6': 1864.66, 'B6': 1975.53
};

const tunings = {
  standard: [noteFrequencies['E2'], noteFrequencies['A2'], noteFrequencies['D3'], noteFrequencies['G3'], noteFrequencies['B3'], noteFrequencies['E4']],
  dropd: [noteFrequencies['D2'], noteFrequencies['A2'], noteFrequencies['D3'], noteFrequencies['G3'], noteFrequencies['B3'], noteFrequencies['E4']],
  eb: [noteFrequencies['D#2'], noteFrequencies['G#2'], noteFrequencies['C#3'], noteFrequencies['F#3'], noteFrequencies['A#3'], noteFrequencies['D#4']],
  dstd: [noteFrequencies['D2'], noteFrequencies['G2'], noteFrequencies['C3'], noteFrequencies['F3'], noteFrequencies['A3'], noteFrequencies['D4']],
  openg: [noteFrequencies['D2'], noteFrequencies['G2'], noteFrequencies['D3'], noteFrequencies['G3'], noteFrequencies['B3'], noteFrequencies['D4']]
};

const stringNames = {
  standard: ['E', 'A', 'D', 'G', 'B', 'E'],
  dropd: ['D', 'A', 'D', 'G', 'B', 'E'],
  eb: ['D#', 'G#', 'C#', 'F#', 'A#', 'D#'],
  dstd: ['D', 'G', 'C', 'F', 'A', 'D'],
  openg: ['D', 'G', 'D', 'G', 'B', 'D']
};

const customTunings = {};

document.addEventListener('DOMContentLoaded', () => {
    initChart();
});

function initChart() {
    const ctx = document.getElementById('historyChart').getContext('2d');
    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Diferença da Frequência',
                data: [],
                borderColor: '#4cafef',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    display: false
                },
                y: {
                    min: -10,
                    max: 10,
                    ticks: {
                        callback: function(value, index, values) {
                            if (value === 0) return '0 Hz';
                            return '';
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    title: {
                        display: true,
                        text: 'Diferença (Hz)',
                        color: '#aaa'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            }
        }
    });
}

function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`.tab:nth-child(${tabName === 'preset' ? 1 : 2})`).classList.add('active');
    
    if (tabName === 'preset') {
        document.getElementById('preset-tunings').style.display = 'grid';
        document.getElementById('custom-tuning').style.display = 'none';
    } else {
        document.getElementById('preset-tunings').style.display = 'none';
        document.getElementById('custom-tuning').style.display = 'block';
    }
}

function selectTuning(card, tuning) {
    if (!audioContext) {
        alert("Por favor, ative o microfone primeiro!");
        return;
    }
    
    document.querySelectorAll('.tuning-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    currentTuning = tunings[tuning];
    currentTuningName = tuning;
    
    // Exibe todas as frequências de referência
    displayStrings(tuning);
    
    document.getElementById("currentFreq").innerText = "-- Hz";
    document.getElementById("targetFreq").innerText = "Alvo: -- Hz";
    document.getElementById("difference").innerText = "Diferença: -- Hz";
    document.getElementById("status").innerText = "Toque uma corda";
    document.getElementById("status").className = "status";
    document.getElementById("currentNote").innerText = "--";
    document.getElementById("noteDetails").innerText = "";
    
    // Limpa a corda ativa
    currentTargetFreq = null;
    currentStringIndex = -1;
    manualSelection = false;
    historyChart.data.labels = [];
    historyChart.data.datasets[0].data = [];
    historyChart.update();
    resetNeedle();
    
    document.querySelectorAll('.string').forEach(s => s.classList.remove('active'));
}

function saveCustomTuning() {
    const name = document.getElementById('customTuningName').value.trim();
    if (!name) {
        alert('Por favor, dê um nome à sua afinação personalizada');
        return;
    }
    
    const notes = [
        document.getElementById('string6').value,
        document.getElementById('string5').value,
        document.getElementById('string4').value,
        document.getElementById('string3').value,
        document.getElementById('string2').value,
        document.getElementById('string1').value
    ];
    
    const frequencies = notes.map(note => noteFrequencies[note]);
    const noteNames = notes.map(note => note.replace(/\d/g, ''));
    
    customTunings[name] = {
        frequencies: frequencies,
        noteNames: noteNames
    };
    
    const customCard = document.createElement('div');
    customCard.className = 'tuning-card';
    customCard.innerHTML = `${name}<span>Afinação personalizada</span>`;
    customCard.onclick = () => selectCustomTuning(customCard, name);
    document.getElementById('preset-tunings').appendChild(customCard);
    
    alert(`Afinação "${name}" salva com sucesso!`);
    showTab('preset');
}

function selectCustomTuning(card, name) {
    if (!audioContext) {
        alert("Por favor, ative o microfone primeiro!");
        return;
    }
    
    document.querySelectorAll('.tuning-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    
    currentTuning = customTunings[name].frequencies;
    currentTuningName = name;
    
    displayCustomStrings(name);
    
    document.getElementById("currentFreq").innerText = "-- Hz";
    document.getElementById("targetFreq").innerText = "Alvo: -- Hz";
    document.getElementById("difference").innerText = "Diferença: -- Hz";
    document.getElementById("status").innerText = "Toque uma corda";
    document.getElementById("status").className = "status";
    document.getElementById("currentNote").innerText = "--";
    document.getElementById("noteDetails").innerText = "";
    
    currentTargetFreq = null;
    currentStringIndex = -1;
    manualSelection = false;
    historyChart.data.labels = [];
    historyChart.data.datasets[0].data = [];
    historyChart.update();
    resetNeedle();
    
    document.querySelectorAll('.string').forEach(s => s.classList.remove('active'));
}

function displayCustomStrings(tuningName) {
    const container = document.getElementById("stringsContainer");
    container.innerHTML = '';
    
    const tuning = customTunings[tuningName];
    
    for (let i = 0; i < 6; i++) {
        const stringDiv = document.createElement('div');
        stringDiv.className = 'string';
        stringDiv.innerHTML = `
          <div class="string-name">${tuning.noteNames[i]}</div>
          <div class="string-freq">${tuning.frequencies[i].toFixed(2)} Hz</div>
        `;
        stringDiv.onclick = () => selectStringManually(i);
        container.appendChild(stringDiv);
    }
}

function displayStrings(tuning) {
    const container = document.getElementById("stringsContainer");
    container.innerHTML = '';
    
    for (let i = 0; i < 6; i++) {
        const stringDiv = document.createElement('div');
        stringDiv.className = 'string';
        stringDiv.innerHTML = `
          <div class="string-name">${stringNames[tuning][i]}</div>
          <div class="string-freq">${tunings[tuning][i].toFixed(2)} Hz</div>
        `;
        stringDiv.onclick = () => selectStringManually(i);
        container.appendChild(stringDiv);
    }
}

function selectStringManually(index) {
    if (!currentTuning) return;
    
    manualSelection = true;
    currentStringIndex = index;
    currentTargetFreq = currentTuning[index];
    
    document.querySelectorAll('.string').forEach((s, idx) => {
        if (idx === index) {
            s.classList.add('active');
        } else {
            s.classList.remove('active');
        }
    });
    
    document.getElementById("targetFreq").innerText = `Alvo: ${currentTargetFreq.toFixed(2)} Hz`;
    document.getElementById("status").innerText = "Afinando corda selecionada";
    document.getElementById("status").className = "status";
}

async function toggleMicrophone() {
    const permissionButton = document.getElementById("permissionButton");
    const statusMessage = document.getElementById("statusMessage");

    if (audioContext && audioContext.state === 'running') {
        // Stop the microphone
        if (microphone) {
            microphone.disconnect();
            microphone = null;
        }
        if (audioContext) {
            await audioContext.close();
            audioContext = null;
        }
        
        permissionButton.innerText = "Ativar Microfone";
        permissionButton.classList.remove('active');
        statusMessage.innerText = "Microfone desativado.";
        
        // Reset the UI
        selectTuning(document.querySelector('.tuning-card'), 'standard');
        
    } else {
        // Start the microphone
        permissionButton.innerText = "Ativando...";
        permissionButton.classList.add('loading');
        statusMessage.innerText = "Aguardando permissão do navegador...";

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            dataArray = new Float32Array(analyser.fftSize);
            microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyser);

            detectPitch();

            permissionButton.innerText = "Desativar Microfone";
            permissionButton.classList.remove('loading');
            permissionButton.classList.add('active');
            statusMessage.innerText = "Microfone ativado. Toque uma corda para começar.";
            
            // Auto-select standard tuning
            selectTuning(document.querySelector('.tuning-card'), 'standard');
            
        } catch (error) {
            alert("Erro ao acessar o microfone: " + error.message);
            console.error("Erro ao acessar microfone:", error);

            permissionButton.innerText = "Ativar Microfone";
            permissionButton.classList.remove('loading');
            permissionButton.classList.remove('active');
            statusMessage.innerText = "Erro ao acessar microfone. Verifique as permissões.";
        }
    }
}

function detectPitch() {
    if (!analyser || audioContext.state === 'closed') return;
    
    requestAnimationFrame(detectPitch);
    
    analyser.getFloatTimeDomainData(dataArray);
    
    let rms = 0;
    for (let i = 0; i < dataArray.length; i++) {
        rms += dataArray[i] * dataArray[i];
    }
    rms = Math.sqrt(rms / dataArray.length);
    
    const rmsThreshold = 0.015;
    
    if (rms < rmsThreshold) {
        if (lastValidFreq !== null && resetTimer === null) {
            resetTimer = setTimeout(() => {
                lastValidFreq = null;
                lastValidNote = null;
                resetTimer = null;
                document.getElementById("currentFreq").innerText = "-- Hz";
                document.getElementById("targetFreq").innerText = "Alvo: -- Hz";
                document.getElementById("difference").innerText = "Diferença: -- Hz";
                document.getElementById("status").innerText = "Toque uma corda";
                document.getElementById("status").className = "status";
                document.getElementById("currentNote").innerText = "--";
                document.getElementById("noteDetails").innerText = "";
                resetNeedle();
            }, 500); 
        }
        return;
    } else {
        if (resetTimer !== null) {
            clearTimeout(resetTimer);
            resetTimer = null;
        }
    }

    let freq = autoCorrelate(dataArray, audioContext.sampleRate);

    if (freq !== -1 && freq > 50 && freq < 500) {
        let closestNote = null;
        let closestDiff = Infinity;
        
        for (const [note, noteFreq] of Object.entries(noteFrequencies)) {
          const diff = Math.abs(freq - noteFreq);
          if (diff < closestDiff) {
            closestDiff = diff;
            closestNote = note;
          }
        }
        
        lastValidFreq = freq;
        lastValidNote = closestNote;
        
        updateTunerDisplay(freq, closestNote);
    } else {
        if (lastValidFreq !== null) {
            updateTunerDisplay(lastValidFreq, lastValidNote);
        }
    }
}

function updateTunerDisplay(freq, closestNote) {
    const noteFreq = noteFrequencies[closestNote];
    const cents = Math.round(1200 * Math.log2(freq / noteFreq));
    
    if (!manualSelection && currentTuning) {
        let minDiff = Infinity;
        let minIndex = -1;
        
        for (let i = 0; i < currentTuning.length; i++) {
            const diff = Math.abs(currentTuning[i] - freq);
            if (diff < minDiff) {
                minDiff = diff;
                minIndex = i;
            }
        }
        
        if (minDiff < 10) {
            currentTargetFreq = currentTuning[minIndex];
            currentStringIndex = minIndex;
            
            document.querySelectorAll('.string').forEach((s, idx) => {
                if (idx === minIndex) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        }
    }
    
    if (currentTargetFreq !== null) {
        const diff = (freq - currentTargetFreq);
        const diffAbs = Math.abs(diff);
        const diffDisplay = diff.toFixed(2);
        
        updateNeedle(diff);
        
        const historyData = historyChart.data.datasets[0].data;
        const labels = historyChart.data.labels;
        
        if (historyData.length >= 20) {
            historyData.shift();
            labels.shift();
        }
        historyData.push(diff);
        labels.push('');
        historyChart.update();
        
        let status = "";
        let statusClass = "";
        if (diffAbs < 0.5) {
            status = "✓ Perfeito!";
            statusClass = "perfect";
        } else if (diff < 0) {
            status = "Muito baixa ↑";
            statusClass = "too-low";
        } else {
            status = "Muito alta ↓";
            statusClass = "too-high";
        }
        
        document.getElementById("currentFreq").innerText = `${freq.toFixed(2)} Hz`;
        document.getElementById("targetFreq").innerText = `Alvo: ${currentTargetFreq.toFixed(2)} Hz`;
        document.getElementById("difference").innerText = `Diferença: ${diffDisplay} Hz`;
        document.getElementById("status").innerText = status;
        document.getElementById("status").className = `status ${statusClass}`;
        
        document.getElementById("currentNote").innerText = closestNote;
        if (Math.abs(cents) < 5) {
            document.getElementById("noteDetails").innerText = "✓ Afinado";
            document.getElementById("noteDetails").style.color = "#4caf50";
        } else if (cents < 0) {
            document.getElementById("noteDetails").innerText = `${Math.abs(cents)} cents abaixo`;
            document.getElementById("noteDetails").style.color = "#ff9800";
        } else {
            document.getElementById("noteDetails").innerText = `${cents} cents acima`;
            document.getElementById("noteDetails").style.color = "#f44336";
        }
    }
}

function updateNeedle(diff) {
    const needle = document.getElementById("needle");
    const limitedDiff = Math.max(-10, Math.min(10, diff));
    const angle = limitedDiff * 3;
    needle.style.transform = `translateX(-50%) rotate(${angle}deg)`;
}

function resetNeedle() {
    const needle = document.getElementById("needle");
    needle.style.transform = `translateX(-50%) rotate(0deg)`;
}

function autoCorrelate(buf, sampleRate) {
    let SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
        let val = buf[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;

    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE/2; i++) {
        if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE/2; i++) {
        if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    }

    buf = buf.slice(r1, r2);
    SIZE = buf.length;

    let c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++)
        for (let j = 0; j < SIZE - i; j++)
            c[i] = c[i] + buf[j] * buf[j+i];

    let d = 0; while (c[d] > c[d+1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) {
        if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
    }
    let T0 = maxpos;

    return sampleRate/T0;
}

function updateHistoryGraph() {
    // This function is no longer needed as Chart.js handles the updates directly.
    // It's kept here as a placeholder in case you decide to add other logic.
}