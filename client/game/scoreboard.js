export class Scoreboard {
    constructor(app) {
        this.app = app;
        this.visible = false;
        
        // scoreboard is a div in the index.html file
        this.container = document.querySelector('#scoreboardContainer');
        this.tableBody = document.querySelector('#scoreboardContainer table tbody');
    }
    
    update(players) {
        // clear the table
        this.tableBody.innerHTML = '';

        // Sort players by kills (descending)
        const sortedPlayers = Array.from(players.values()).sort((a, b) => {
            // Handle undefined values by treating them as 0
            const aKills = a.kills || 0;
            const bKills = b.kills || 0;
            return bKills - aKills;
        });
        
        // Add player scores
        sortedPlayers.forEach((player) => {
            // Ensure values are not undefined
            const kills = player.kills || 0;
            const deaths = player.deaths || 0;
            const name = player.name || 'Unknown';
            
            // Create a table row element
            const row = document.createElement('tr');
            
            // Create a table cell for the player name
            const nameCell = document.createElement('td');
            nameCell.textContent = name;
            
            // Create a table cell for the kills
            const killsCell = document.createElement('td');
            killsCell.textContent = kills;
            
            // Create a table cell for the deaths
            const deathsCell = document.createElement('td');
            deathsCell.textContent = deaths;

            // Append the cells to the row
            row.appendChild(nameCell);
            row.appendChild(killsCell);
            row.appendChild(deathsCell);

            // Append the row to the table body
            this.tableBody.appendChild(row);
        });
    }
    
    show() {
        this.visible = true;
        this.container.style.display = 'block';
    }
    
    hide() {
        this.visible = false;
        this.container.style.display = 'none';
    }
    
    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }
} 