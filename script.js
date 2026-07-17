let players = [];
let nextId = 1;
let currentRound = 0;
let activeMatches = []; 

const addForm = document.getElementById('addForm');
const playerNameInput = document.getElementById('playerName');
const leaderboardBody = document.getElementById('leaderboardBody');
const pairingsList = document.getElementById('pairingsList');
const roundInfo = document.getElementById('roundInfo');

// --- SISTEMA DE AUTO-SAVE ---
function saveData() {
    const tournamentData = {
        players: players,
        nextId: nextId,
        currentRound: currentRound,
        activeMatches: activeMatches
    };
    localStorage.setItem('chessTournamentData', JSON.stringify(tournamentData));
    checkPodiumStatus();
}

function loadData() {
    const saved = localStorage.getItem('chessTournamentData');
    if (saved) {
        const data = JSON.parse(saved);
        players = data.players || [];
        nextId = data.nextId || 1;
        currentRound = data.currentRound || 0;
        activeMatches = data.activeMatches || [];
        
        if (currentRound > 0) {
            roundInfo.innerText = `Ronda: ${currentRound} / 5`;
        }
        
        renderLeaderboard();
        renderPairings();
    }
}

function resetTournament() {
    if (confirm("⚠️ AVISO: Tens a certeza que queres APAGAR todos os dados do torneio e começar de novo?")) {
        localStorage.removeItem('chessTournamentData');
        location.reload(); 
    }
}

// --- LÓGICA DE FIM DE TORNEIO (PÓDIO E DESEMPATE) ---
function getTiedTopPlayers() {
    let tied = new Set();
    
    // Verifica apenas se os jogadores no Top 3 (ou empatados com eles) têm Pontos e Buchholz idênticos
    for (let i = 0; i < 3; i++) {
        if (players[i] && players[i+1]) {
            if (players[i].points === players[i+1].points && getBuchholz(players[i]) === getBuchholz(players[i+1])) {
                tied.add(players[i]);
                tied.add(players[i+1]);
            }
        }
    }
    return Array.from(tied);
}

function checkPodiumStatus() {
    const podiumBtn = document.getElementById('podiumBtn');
    const tiebreakBtn = document.getElementById('tiebreakBtn');
    
    const allResolved = activeMatches.length > 0 && activeMatches.every(m => m.resolved);
    
    if (currentRound >= 5 && allResolved) {
        // Ordena os jogadores para ter a certeza da classificação atual
        players.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            const bucA = getBuchholz(a);
            const bucB = getBuchholz(b);
            if (bucB !== bucA) return bucB - bucA;
            return b.games - a.games; 
        });

        const tiedPlayers = getTiedTopPlayers();

        if (tiedPlayers.length > 0) {
            // Existe um empate no topo, mostra o botão de desempate
            podiumBtn.style.display = 'none';
            tiebreakBtn.style.display = 'block';
        } else {
            // Tudo limpo, mostra o pódio
            podiumBtn.style.display = 'block';
            tiebreakBtn.style.display = 'none';
        }
    } else {
        podiumBtn.style.display = 'none';
        if (tiebreakBtn) tiebreakBtn.style.display = 'none';
    }
}

let tiebreakHistory = []; // Substitui o currentTiebreakPlayers para guardar o histórico completo

function showTiebreak() {
    const tiedPlayers = getTiedTopPlayers();
    
    // Se for a primeira vez a abrir o desempate, inicializa a primeira partida relâmpago[cite: 4]
    if (tiebreakHistory.length === 0) {
        if (tiedPlayers.length < 2) return;
        tiebreakHistory.push({
            white: tiedPlayers[0],
            black: tiedPlayers[1],
            resolved: false
        });
    }

    renderTiebreakList();

    document.getElementById('mainLayout').style.display = 'none';
    document.getElementById('tiebreakView').style.display = 'flex';
}

function renderTiebreakList() {
    const listContainer = document.getElementById('tiedPlayersList');
    listContainer.style.display = "flex";
    listContainer.style.flexDirection = "column";
    listContainer.style.gap = "15px";
    listContainer.innerHTML = '';

    tiebreakHistory.forEach((match, index) => {
        if (match.resolved) {
            // Cartão de empate passado (Cinza)
            listContainer.innerHTML += `
                <div class="pairing-card draw" style="box-shadow: none; border-color: var(--border); opacity: 0.6; padding: 15px;">
                    <div class="match-info" style="font-size: 1.2rem;">
                        <div class="pairing-player"><span class="color-indicator color-white"></span> ${match.white.name}</div>
                        <div class="vs">VS</div>
                        <div class="pairing-player right">${match.black.name} <span class="color-indicator color-black"></span></div>
                    </div>
                    <div class="match-actions" style="margin-top: 10px;">
                        <div class="status-text" style="font-size: 1rem;">Empate</div>
                    </div>
                </div>
            `;
        } else {
            // Cartão da partida ativa (Destacado e Maior)
            listContainer.innerHTML += `
                <div class="pairing-card" style="box-shadow: 0 4px 15px rgba(204, 51, 51, 0.3); border-color: var(--danger); padding: 20px;">
                    <div class="match-info" style="font-size: 1.4rem; margin-bottom: 15px;">
                        <div class="pairing-player"><span class="color-indicator color-white" style="width: 16px; height: 16px;"></span> ${match.white.name}</div>
                        <div class="vs">VS</div>
                        <div class="pairing-player right">${match.black.name} <span class="color-indicator color-black" style="width: 16px; height: 16px;"></span></div>
                    </div>
                    <div class="match-actions" style="gap: 12px; padding-top: 15px;">
                        <button class="result-btn" style="padding: 12px; font-size: 1.1rem;" onclick="resolveTiebreak(${index}, '1-0')" title="Brancas Ganham">1-0</button>
                        <button class="result-btn" style="padding: 12px; font-size: 1.1rem;" onclick="resolveTiebreak(${index}, '0.5-0.5')" title="Novo Empate">½-½</button>
                        <button class="result-btn" style="padding: 12px; font-size: 1.1rem;" onclick="resolveTiebreak(${index}, '0-1')" title="Pretas Ganham">0-1</button>
                    </div>
                </div>
            `;
        }
    });
}

function resolveTiebreak(matchIndex, result) {
    let match = tiebreakHistory[matchIndex];

    // Se houver um novo empate
    if (result === '0.5-0.5') {
        match.resolved = true;
        
        // Adiciona uma nova partida ao histórico invertendo as cores
        tiebreakHistory.push({
            white: match.black,
            black: match.white,
            resolved: false
        });
        
        renderTiebreakList();
        
        // Faz scroll automático para baixo para ver a nova partida
        window.scrollTo(0, document.body.scrollHeight);
        return;
    }

    // Se houver um vencedor, atribui o ponto decisivo
    if (result === '1-0') {
        updateStat(match.white.id, 'points', 1);
    } else if (result === '0-1') {
        updateStat(match.black.id, 'points', 1);
    }

    // Limpa a memória do desempate e volta ao Dashboard
    tiebreakHistory = [];
    document.getElementById('tiebreakView').style.display = 'none';
    document.getElementById('mainLayout').style.display = 'flex';
    
    // Atualiza o pódio
    checkPodiumStatus();
    saveData();
}

function showPodium() {
    // Garante que a lista está ordenada corretamente antes de extrair o top 3
    players.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const bucA = getBuchholz(a);
        const bucB = getBuchholz(b);
        if (bucB !== bucA) return bucB - bucA;
        return b.games - a.games; 
    });

    // Injeta os nomes nos lugares
    document.getElementById('podium-1-name').innerText = players[0] ? players[0].name : '-';
    document.getElementById('podium-2-name').innerText = players[1] ? players[1].name : '-';
    document.getElementById('podium-3-name').innerText = players[2] ? players[2].name : '-';

    // Troca de ecrã
    document.getElementById('mainLayout').style.display = 'none';
    document.getElementById('podiumView').style.display = 'flex';
}

function closePodium() {
    document.getElementById('mainLayout').style.display = 'flex';
    document.getElementById('podiumView').style.display = 'none';
}


// --- LÓGICA DO JOGO ---
addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (players.length >= 20) {
        alert("O torneio está limitado a um máximo de 20 participantes.");
        return;
    }
    
    const name = playerNameInput.value.trim();
    if (name) {
        players.push({
            id: nextId++,
            name: name,
            points: 0,
            games: 0,
            opponents: [], 
            hasBye: false
        });
        playerNameInput.value = '';
        renderLeaderboard();
        saveData();
    }
});

function editName(id) {
    const player = players.find(p => p.id === id);
    if (player) {
        const newName = prompt("Editar nome do jogador:", player.name);
        if (newName && newName.trim() !== "") {
            player.name = newName.trim();
            renderLeaderboard();
            renderPairings(); 
            saveData();
        }
    }
}

function deletePlayer(id) {
    const player = players.find(p => p.id === id);
    if (player && confirm(`Tens a certeza que queres remover "${player.name}" do torneio?`)) {
        players = players.filter(p => p.id !== id);
        renderLeaderboard();
        saveData();
    }
}

function updateStat(id, stat, amount) {
    const player = players.find(p => p.id === id);
    if (player) {
        player[stat] += amount;
        if (player[stat] < 0) player[stat] = 0;
        renderLeaderboard();
        saveData();
    }
}

function getBuchholz(player) {
    return player.opponents.reduce((sum, oppId) => {
        const opp = players.find(p => p.id === oppId);
        return sum + (opp ? opp.points : 0);
    }, 0);
}

function renderLeaderboard() {
    players.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const bucA = getBuchholz(a);
        const bucB = getBuchholz(b);
        if (bucB !== bucA) return bucB - bucA;
        return b.games - a.games; 
    });

    leaderboardBody.innerHTML = '';

    players.forEach((player, index) => {
        const tr = document.createElement('tr');
        const buchholzScore = getBuchholz(player);
        
        tr.innerHTML = `
            <td class="rank">${index + 1}</td>
            <td style="font-weight: 500;">
                ${player.name}
            </td>
            <td class="points">${player.points}</td>
            <td style="color: var(--text-muted);">${buchholzScore}</td>
            <td>${player.games}</td>
            <td>
                <div class="controls">
                    <button class="action-btn" onclick="updateStat(${player.id}, 'points', 1)">+1</button>
                    <button class="action-btn" onclick="updateStat(${player.id}, 'points', 0.5)">+½</button>
                    <button class="action-btn" onclick="updateStat(${player.id}, 'points', -0.5)">-½</button>
                </div>
            </td>
            <td>
                <div class="controls">
                    <button class="action-btn" onclick="updateStat(${player.id}, 'games', 1)">+1</button>
                    <button class="action-btn" onclick="updateStat(${player.id}, 'games', -1)">-1</button>
                </div>
            </td>
            <td>
                <div class="controls">
                    <button class="action-btn" onclick="editName(${player.id})" title="Editar Nome">✏️</button>
                    <button class="action-btn btn-danger" onclick="deletePlayer(${player.id})" title="Remover Jogador">🗑️</button>
                </div>
            </td>
        `;
        leaderboardBody.appendChild(tr);
    });
}

function resolveMatch(matchId, result) {
    const match = activeMatches.find(m => m.id === matchId);
    if (!match || match.resolved) return;

    if (result === '1-0') {
        updateStat(match.white.id, 'points', 1); 
    } else if (result === '0-1') {
        updateStat(match.black.id, 'points', 1); 
    } else if (result === '0.5-0.5') {
        updateStat(match.white.id, 'points', 0.5); 
        updateStat(match.black.id, 'points', 0.5); 
    }

    updateStat(match.white.id, 'games', 1);
    updateStat(match.black.id, 'games', 1);

    match.resolved = true;
    match.resultCode = result; 
    
    renderPairings(); 
    saveData();
}

function renderPairings() {
    pairingsList.innerHTML = '';
    
    if (activeMatches.length === 0) {
        pairingsList.innerHTML = `<p style="text-align: center; color: var(--text-muted); margin-top: 20px;">Sem partidas ativas.</p>`;
        return;
    }

    activeMatches.forEach(match => {
        if (match.isBye) {
            pairingsList.innerHTML += `
                <div class="pairing-card win-white">
                    <div class="match-info">
                        <div class="pairing-player"><span class="color-indicator color-white"></span> ${match.white.name}</div>
                        <div class="vs">BYE (+1)</div>
                        <div class="pairing-player right" style="color: var(--text-muted);">---</div>
                    </div>
                </div>
            `;
        } else {
            let resultClass = '';
            let statusMessage = '';

            if (match.resolved) {
                if (match.resultCode === '1-0') {
                    resultClass = 'win-white';
                    statusMessage = 'Brancas Venceram';
                } else if (match.resultCode === '0-1') {
                    resultClass = 'win-black';
                    statusMessage = 'Pretas Venceram';
                } else {
                    resultClass = 'draw';
                    statusMessage = 'Empate';
                }
            }

            pairingsList.innerHTML += `
                <div class="pairing-card ${resultClass}">
                    <div class="match-info">
                        <div class="pairing-player"><span class="color-indicator color-white"></span> ${match.white.name}</div>
                        <div class="vs">VS</div>
                        <div class="pairing-player right">${match.black.name} <span class="color-indicator color-black"></span></div>
                    </div>
                    ${!match.resolved ? `
                    <div class="match-actions">
                        <button class="result-btn" onclick="resolveMatch(${match.id}, '1-0')" title="Brancas Ganham">1-0</button>
                        <button class="result-btn" onclick="resolveMatch(${match.id}, '0.5-0.5')" title="Empate">½-½</button>
                        <button class="result-btn" onclick="resolveMatch(${match.id}, '0-1')" title="Pretas Ganham">0-1</button>
                    </div>
                    ` : `<div class="match-actions"><div class="status-text">${statusMessage}</div></div>`}
                </div>
            `;
        }
    });
    
    checkPodiumStatus();
}

function generatePairings() {
    if (players.length < 6) {
        alert("O torneio necessita de um número mínimo de 6 participantes.");
        return;
    }
    if (currentRound >= 5) {
        alert("O torneio já terminou (Máximo de 5 rondas).");
        return;
    }

    currentRound++;
    roundInfo.innerText = `Ronda: ${currentRound} / 5`;
    
    let pool = [...players];
    activeMatches = []; 

    if (currentRound === 1) {
        pool.sort(() => Math.random() - 0.5);
    } else {
        pool.sort((a, b) => b.points - a.points);
    }

    if (pool.length % 2 !== 0) {
        let byeIndex = -1;
        for (let i = pool.length - 1; i >= 0; i--) {
            if (!pool[i].hasBye) {
                byeIndex = i;
                break;
            }
        }
        
        if (byeIndex !== -1) {
            let byePlayer = pool.splice(byeIndex, 1)[0];
            let realPlayer = players.find(p => p.id === byePlayer.id);
            realPlayer.hasBye = true;
            
            updateStat(realPlayer.id, 'points', 1);
            updateStat(realPlayer.id, 'games', 1);

            activeMatches.push({ id: Date.now() + Math.random(), white: realPlayer, black: null, isBye: true, resolved: true, resultCode: '1-0' });
        }
    }

    while (pool.length > 1) {
        let p1 = pool.shift();
        let p2Index = 0;
        
        for (let i = 0; i < pool.length; i++) {
            if (!p1.opponents.includes(pool[i].id)) {
                p2Index = i;
                break;
            }
        }
        
        let p2 = pool.splice(p2Index, 1)[0];
        let realP1 = players.find(p => p.id === p1.id);
        let realP2 = players.find(p => p.id === p2.id);
        
        realP1.opponents.push(realP2.id);
        realP2.opponents.push(realP1.id);

        let matchId = Date.now() + Math.random();

        if (Math.random() > 0.5) {
            activeMatches.push({ id: matchId, white: realP1, black: realP2, isBye: false, resolved: false, resultCode: null });
        } else {
            activeMatches.push({ id: matchId, white: realP2, black: realP1, isBye: false, resolved: false, resultCode: null });
        }
    }

    renderPairings();
    renderLeaderboard();
    saveData();
}

// Inicializar a aplicação a tentar carregar os dados guardados
window.onload = loadData;