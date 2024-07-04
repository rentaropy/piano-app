let audioContext;
const keys = document.querySelectorAll('.key');

const noteFrequencies = {
    'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13, 'E': 329.63,
    'F': 349.23, 'F#': 369.99, 'G': 392.00, 'G#': 415.30, 'A': 440.00,
    'A#': 466.16, 'B': 493.88, 'C2': 523.25
};

const adsr = {
    attack: 0.05,
    decay: 0.1,
    sustain: 0.7,
    release: 0.1
};

const defaultVolume = 0.7;

// Happy Birthday song notes (starting from C)
const bpm = 120; // Beats per minute
const beatDuration = 60 / bpm; // Duration of one beat in seconds

// Happy Birthday song notes (starting from C) with rests
const happyBirthdaySong = [
    { note: 'C', duration: 0.75 * beatDuration },
    { note: 'C', duration: 0.25 * beatDuration },
    { note: 'D', duration: 1 * beatDuration },
    { note: 'C', duration: 1 * beatDuration },
    { note: 'F', duration: 1 * beatDuration },
    { note: 'E', duration: 1 * beatDuration },
    { note: 'rest', duration: 1 * beatDuration },
    { note: 'C', duration: 0.75 * beatDuration },
    { note: 'C', duration: 0.25 * beatDuration },
    { note: 'D', duration: 1 * beatDuration },
    { note: 'C', duration: 1 * beatDuration },
    { note: 'G', duration: 1 * beatDuration },
    { note: 'F', duration: 1 * beatDuration },
    { note: 'rest', duration: 1 * beatDuration },
    { note: 'C', duration: 0.75 * beatDuration },
    { note: 'C', duration: 0.25 * beatDuration },
    { note: 'C2', duration: 1 * beatDuration },
    { note: 'A', duration: 1 * beatDuration },
    { note: 'F', duration: 1 * beatDuration },
    { note: 'E', duration: 1 * beatDuration },
    { note: 'D', duration: 1 * beatDuration },
    { note: 'rest', duration: 1 * beatDuration },
    { note: 'A#', duration: 0.75 * beatDuration },
    { note: 'A#', duration: 0.25 * beatDuration },
    { note: 'A', duration: 1 * beatDuration },
    { note: 'F', duration: 1 * beatDuration },
    { note: 'G', duration: 1 * beatDuration },
    { note: 'F', duration: 1 * beatDuration },
    { note: 'rest', duration: 1 * beatDuration },
];

function initAudioContext() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

function createNote(frequency, volume = defaultVolume) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const volumeNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    
    volumeNode.gain.setValueAtTime(volume, audioContext.currentTime);
    
    oscillator.connect(gainNode);
    gainNode.connect(volumeNode);
    volumeNode.connect(audioContext.destination);
    
    return { oscillator, gainNode, volumeNode };
}

function startNote(note) {
    const now = audioContext.currentTime;
    note.gainNode.gain.setValueAtTime(0, now);
    note.gainNode.gain.linearRampToValueAtTime(1, now + adsr.attack);
    note.gainNode.gain.linearRampToValueAtTime(adsr.sustain, now + adsr.attack + adsr.decay);
    note.oscillator.start(now);
}

function stopNote(note) {
    const now = audioContext.currentTime;
    const release = now + adsr.release;
    note.gainNode.gain.cancelScheduledValues(now);
    note.gainNode.gain.setValueAtTime(note.gainNode.gain.value, now);
    note.gainNode.gain.linearRampToValueAtTime(0, release);
    note.oscillator.stop(release);
}

function setNoteVolume(note, volume) {
    if (note && note.volumeNode) {
        note.volumeNode.gain.setValueAtTime(volume, audioContext.currentTime);
    }
}

const activeNotes = {};

keys.forEach(key => {
    const note = key.dataset.note;
    const frequency = noteFrequencies[note];
    let isPressed = false;

    const startNoteHandler = (e) => {
        if (!audioContext) {
            initAudioContext();
        }
        
        if (!isPressed) {
            isPressed = true;
            
            if (activeNotes[note]) {
                stopNote(activeNotes[note]);
            }
            
            activeNotes[note] = createNote(frequency, defaultVolume);
            startNote(activeNotes[note]);
            key.classList.add('active');
        }
    };

    const stopNoteHandler = () => {
        if (isPressed) {
            isPressed = false;
            
            if (activeNotes[note]) {
                stopNote(activeNotes[note]);
                delete activeNotes[note];
                key.classList.remove('active');
            }
        }
    };

    key.addEventListener('mousedown', startNoteHandler);
    key.addEventListener('mouseup', stopNoteHandler);
    key.addEventListener('mouseleave', stopNoteHandler);

    key.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startNoteHandler(e);
    }, { passive: false });

    key.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopNoteHandler();
    }, { passive: false });
});

document.body.addEventListener('click', initAudioContext, { once: true });

function cleanupAllNotes() {
    Object.values(activeNotes).forEach(note => {
        stopNote(note);
    });
    Object.keys(activeNotes).forEach(key => delete activeNotes[key]);
    keys.forEach(key => key.classList.remove('active'));
}

window.addEventListener('unload', cleanupAllNotes);

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        cleanupAllNotes();
    }
});

function setOverallVolume(volume) {
    Object.values(activeNotes).forEach(note => {
        setNoteVolume(note, volume);
    });
}

function playNote(noteName, duration) {
    return new Promise(resolve => {
        if (noteName === 'rest') {
            // For rests, we just wait for the duration without playing a note
            setTimeout(resolve, duration * 1000);
        } else {
            const key = document.querySelector(`.key[data-note="${noteName}"]`);
            if (key) {
                key.dispatchEvent(new MouseEvent('mousedown'));
                setTimeout(() => {
                    key.dispatchEvent(new MouseEvent('mouseup'));
                    resolve();
                }, duration * 1000);
            } else {
                console.warn(`Key not found for note: ${noteName}`);
                resolve();
            }
        }
    });
}

async function autoPlaySong(song) {
    const autoPlayBtn = document.getElementById('auto-play');
    const assistedPlayBtn = document.getElementById('assisted-play');
    autoPlayBtn.disabled = true;
    assistedPlayBtn.disabled = true;

    for (const { note, duration } of song) {
        await playNote(note, duration);
    }
    document.getElementById('message').textContent = 'Performance completed!';

    autoPlayBtn.disabled = false;
    assistedPlayBtn.disabled = false;
}

async function assistedPlaySong(song) {
    const autoPlayBtn = document.getElementById('auto-play');
    const assistedPlayBtn = document.getElementById('assisted-play');
    autoPlayBtn.disabled = true;
    assistedPlayBtn.disabled = true;

    const messageElement = document.getElementById('message');
    let currentIndex = 0;

    const highlightNextKey = () => {
        while (currentIndex < song.length && song[currentIndex].note === 'rest') {
            currentIndex++;
        }

        if (currentIndex < song.length) {
            const { note } = song[currentIndex];
            const key = document.querySelector(`.key[data-note="${note}"]`);
            if (key) {
                key.classList.add('highlight');
                messageElement.textContent = `Play the highlighted key (${note})`;
            } else {
                console.warn(`Key not found for note: ${note}`);
                currentIndex++;
                highlightNextKey();
            }
        } else {
            endPerformance();
        }
    };

    const handleKeyPress = (event) => {
        if (currentIndex < song.length) {
            const { note, duration } = song[currentIndex];
            const key = document.querySelector(`.key[data-note="${note}"]`);
            
            if (event.target === key) {
                playNote(note, duration);
                key.classList.remove('highlight');
                currentIndex++;
                highlightNextKey();
            }
        }
    };

    const endPerformance = () => {
        document.removeEventListener('mousedown', handleKeyPress);
        document.removeEventListener('touchstart', handleKeyPress);
        messageElement.textContent = 'Performance completed!';
        autoPlayBtn.disabled = false;
        assistedPlayBtn.disabled = false;
    };

    document.addEventListener('mousedown', handleKeyPress);
    document.addEventListener('touchstart', handleKeyPress);

    highlightNextKey();
}

document.getElementById('auto-play').addEventListener('click', () => {
    const selectedSong = document.getElementById('song-select').value;
    if (selectedSong === 'happy-birthday') {
        autoPlaySong(happyBirthdaySong);
    }
});

document.getElementById('assisted-play').addEventListener('click', () => {
    const selectedSong = document.getElementById('song-select').value;
    if (selectedSong === 'happy-birthday') {
        assistedPlaySong(happyBirthdaySong);
    }
});
