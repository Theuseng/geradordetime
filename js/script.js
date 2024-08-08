$(document).ready(function () {
    const players = [];
    const eloPoints = {
        'ferro': 1,
        'bronze': 2,
        'prata': 3,
        'ouro': 4,
        'platina': 5,
        'esmeralda': 6,
        'diamante': 7,
        'mestre': 8,
        'grao_mestre': 9,
        'challenger': 10
    };

    $('#themeToggle').click(function () {
        if ($('body').hasClass('light-theme')) {
            $('body').removeClass('light-theme').addClass('dark-theme');
            $('#themeToggle').text('☀️');
        } else {
            $('body').removeClass('dark-theme').addClass('light-theme');
            $('#themeToggle').text('🌙');
        }
    });

    $('#addPlayer').click(function () {
        const nick = $('#nick').val();
        const elo = $('#elo').val();
        const rota = $('#rota').val();

        if (nick && elo && rota) {
            players.push({ nick, elo, rota, points: eloPoints[elo] });
            $('#playersList').append(`<div>${nick} - ${elo} - ${rota}</div>`);
            $('#nick').val('');
            $('#elo').val('');
            $('#rota').val('');
        } else {
            alert('Por favor, preencha todos os campos.');
        }
    });

    $('.player-list-title').click(function () {
        const list = $('.player-list');
        list.toggle();
        const arrow = list.is(':visible') ? '&#9650;' : '&#9660;';
        $('.player-list-title span').html(arrow);
    });

    $('#generateTeams').click(function () {
        if (players.length < 5 || players.length % 5 !== 0) {
            alert('Adicione jogadores em múltiplos de 5 para gerar times.');
            return;
        }

        const numTeams = players.length / 5;
        const teams = generateBalancedTeams(players, numTeams);

        $('#teamsContainer').empty();
        let resultText = '';

        teams.forEach((team, index) => {
            const teamDiv = $('<div>').addClass('team').css('width', '70%');
            teamDiv.append(`<h3>Time ${index + 1}</h3>`);
            resultText += `Time ${index + 1}:\n`;

            const roles = ['top', 'jg', 'mid', 'adc', 'sup'];
            roles.forEach(role => {
                const player = team.find(p => p.rota === role);
                if (player) {
                    teamDiv.append(`<p>${player.nick} - ${player.elo} - ${player.rota}</p>`);
                    resultText += `${player.nick} - ${player.elo} - ${player.rota}\n`;
                }
            });
            resultText += '\n';
            $('#teamsContainer').append(teamDiv);
        });

        $('#downloadTeams').show().off('click').click(function () {
            download('times.txt', resultText);
        });

        displayBalanceGraph(teams);
        displayEloAndLaneGraph(players);
    });

    function generateBalancedTeams(players, numTeams) {
        const roles = {
            'top': [],
            'jg': [],
            'mid': [],
            'adc': [],
            'sup': []
        };

        players.forEach(player => {
            roles[player.rota].push(player);
        });

        // Sort players within each role by their points (descending)
        Object.keys(roles).forEach(role => {
            roles[role].sort((a, b) => b.points - a.points);
        });

        const teams = Array.from({ length: numTeams }, () => []);
        const teamPoints = Array.from({ length: numTeams }, () => 0);

        function addPlayerToTeam(player, teamIndex) {
            teams[teamIndex].push(player);
            teamPoints[teamIndex] += player.points;
        }

        // Distribute players to teams
        ['top', 'jg', 'mid', 'adc', 'sup'].forEach(role => {
            const rolePlayers = roles[role];
            rolePlayers.forEach((player, index) => {
                addPlayerToTeam(player, index % numTeams);
            });
        });

        // Balance teams by swapping players across all teams
        balanceTeams(teams, teamPoints);

        return teams;
    }

    function balanceTeams(teams, teamPoints) {
        let maxDiff = Math.max(...teamPoints) - Math.min(...teamPoints);
        while (maxDiff > 1) {
            for (let i = 0; i < teams.length; i++) {
                for (let j = i + 1; j < teams.length; j++) {
                    const teamA = teams[i];
                    const teamB = teams[j];

                    ['top', 'jg', 'mid', 'adc', 'sup'].forEach(role => {
                        const playerA = teamA.find(p => p.rota === role);
                        const playerB = teamB.find(p => p.rota === role);
                        if (playerA && playerB) {
                            const currentDiff = Math.abs(teamPoints[i] - teamPoints[j]);
                            const newDiff = Math.abs((teamPoints[i] - playerA.points + playerB.points) - (teamPoints[j] - playerB.points + playerA.points));

                            if (newDiff < currentDiff) {
                                // Swap players
                                teamA.splice(teamA.indexOf(playerA), 1);
                                teamB.splice(teamB.indexOf(playerB), 1);
                                teamA.push(playerB);
                                teamB.push(playerA);
                                teamPoints[i] = teamPoints[i] - playerA.points + playerB.points;
                                teamPoints[j] = teamPoints[j] - playerB.points + playerA.points;
                                maxDiff = Math.max(...teamPoints) - Math.min(...teamPoints);
                            }
                        }
                    });
                }
            }
        }
    }

    function displayBalanceGraph(teams) {
        const ctx = $('#balanceGraph')[0].getContext('2d');
        const labels = teams.map((_, index) => `Time ${index + 1}`);
        const teamPoints = teams.map(team => team.reduce((sum, player) => sum + player.points, 0));

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pontos Elo por Time',
                    data: teamPoints,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function displayEloAndLaneGraph(players) {
        const ctx = $('#eloAndLaneGraph')[0].getContext('2d');
        const eloCounts = {};
        const laneCounts = {};

        players.forEach(player => {
            eloCounts[player.elo] = (eloCounts[player.elo] || 0) + 1;
            laneCounts[player.rota] = (laneCounts[player.rota] || 0) + 1;
        });

        const data = {
            labels: Object.keys(eloCounts).concat(Object.keys(laneCounts)),
            datasets: [{
                label: 'Quantidade',
                data: Object.values(eloCounts).concat(Object.values(laneCounts)),
                backgroundColor: ['rgba(255, 99, 132, 0.2)', 'rgba(255, 159, 64, 0.2)', 'rgba(255, 205, 86, 0.2)', 'rgba(75, 192, 192, 0.2)', 'rgba(54, 162, 235, 0.2)', 'rgba(153, 102, 255, 0.2)', 'rgba(201, 203, 207, 0.2)'],
                borderColor: ['rgba(255, 99, 132, 1)', 'rgba(255, 159, 64, 1)', 'rgba(255, 205, 86, 1)', 'rgba(75, 192, 192, 1)', 'rgba(54, 162, 235, 1)', 'rgba(153, 102, 255, 1)', 'rgba(201, 203, 207, 1)'],
                borderWidth: 1
            }]
        };

        new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(tooltipItem) {
                                return tooltipItem.label + ': ' + tooltipItem.raw;
                            }
                        }
                    }
                }
            }
        });
    }

    function download(filename, text) {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
});
