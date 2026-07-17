let players = [];
let nextId = 1;
let currentRound = 0;
let activeMatches = []; 

const addForm = document.getElementById('addForm');
const playerNameInput = document.getElementById('playerName');
const leaderboardBody = document.getElementById('leaderboardBody');
const pairingsList = document.getElementById('pairingsList');
const roundInfo = document.getElementById('roundInfo');

// Adicionar novo jogador
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
    }
});

// Editar nome do jogador
function editName(id) {
    const player = players.find(p => p.id === id);
    if (player) {
        const newName = prompt("Editar nome do jogador:", player.name);
        if (newName && newName.trim() !== "") {
            player.name = newName.trim();
            renderLeaderboard();
            renderPairings(); 
        }
    }
}

// Eliminar jogador
function deletePlayer(id) {
    const player = players.find(p => p.id === id);
    if (player && confirm(`Tens a certeza que queres remover "${player.name}" do torneio?`)) {
        players = players.filter(p => p.id !== id);
        renderLeaderboard();
    }
}

// Atualizar estatísticas manualmente
function updateStat(id, stat, amount) {
    const player = players.find(p => p.id === id);
    if (player) {
        player[stat] += amount;
        if (player[stat] < 0) player[stat] = 0;
        renderLeaderboard();
    }
}

// Calcular Pontuação Buchholz
function getBuchholz(player) {
    return player.opponents.reduce((sum, oppId) => {
        const opp = players.find(p => p.id === oppId);
        return sum + (opp ? opp.points : 0);
    }, 0);
}

// Renderizar a tabela
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
            <td>
                <div class="name-container">
                    ${player.name}
                    <button class="action-btn" onclick="editName(${player.id})" title="Editar Nome">✏️</button>
                    <button class="action-btn btn-danger" onclick="deletePlayer(${player.id})" title="Remover Jogador">🗑️</button>
                </div>
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
        `;
        leaderboardBody.appendChild(tr);
    });
}

// Atribuir resultado a uma partida
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
    match.resultCode = result; // Guardamos o código do resultado para o UI saber a cor
    renderPairings(); 
}

// Renderizar Emparelhamentos
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
            // Lógica para injetar a classe CSS correta dependendo do resultado guardado
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
}

// Lógica de Emparelhamento
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
}