app.msgManager = {
    ws: undefined,     // websocket connection
    setup: function () {
        const game = app.scenes.game;
        if (!window.WebSocket) {
            alert("WebSocket not supported by this browser");
            return;
        }
        let location = document.location.toString().replace('http://', 'ws://').replace('https://', 'wss://');
        this.ws = new WebSocket(location, "astorm");
        this.ws.onmessage = function (evt) {
            const msg = JSON.parse(evt.data);
            if (msg.from === game.player.name) return;  // discard own messages
            app.msgManager[msg.type](msg);
        };
    },
    sendMsg: function (msg) {
        app.msgManager.ws.send(JSON.stringify(msg));
    },
    join: function (msg) {
        const game = app.scenes.game;
        if (!game.variables.isAdmin) return;
        let newMsg = {
            from: game.player.name,
            playerJoining: msg.fromPlayer
        };
        if (game.players.hasOwnProperty(msg.from)) {    // check that the joining player has not the same name as another already joined, two players with same name should never join
            newMsg.type = "rejected";
        } else {
            // already joined players' cannonState and bulletsStates are compiled to be sent on joined message
            for (let playerName in game.players) {   // update already existing players cannonState to send them
                game.players[playerName].cannonState.x = game.sprites.cannons[playerName].x;
                game.players[playerName].cannonState.vx = game.sprites.cannons[playerName].vx;
                const bulletSprites = game.sprites.bullets[game.player.name];
                for (let bulletId in bulletSprites) {
                    const bulletSprite = bulletSprites[bulletId];
                    game.players[playerName].bulletsStates[bulletId] = {
                        id: bulletId,
                        tint: bulletSprite.tint,
                        x: bulletSprite.x,
                        y: bulletSprite.y,
                        vx: bulletSprite.vx,
                        vy: bulletSprite.vy
                    }
                }
            }
            let alienStates = {};
            for (let alienId in game.sprites.aliens) {
                let alienSprite = game.sprites.aliens[alienId];
                alienStates[alienId] = {
                    tint: alienSprite.tint,
                    x: alienSprite.x,
                    y: alienSprite.y,
                    vx: alienSprite.vx,
                    vy: alienSprite.vy
                };
            }
            newMsg.type = "joined";             // complete newMsg
            newMsg.players = game.players;
            newMsg.aliens = alienStates;
            newMsg.level = game.variables.level;
            newMsg.aliensPerMSec = game.variables.aliensPerMSec;
            newMsg.alienSpeed = game.attributes.alien.speed;
            newMsg.cannonSpeed = game.attributes.cannon.speed;
            newMsg.bulletSpeed = game.attributes.bullet.speed;

            game.players[msg.from] = msg.fromPlayer;    // the joining player is added now to isAdmin
            game.playerSpritesAdd(msg.fromPlayer, game);// ... and also its sprites
            game.variables.alienTints.push(msg.fromPlayer.tint);
            game.variables.playersNamesArray.push(msg.fromPlayer.name);
        }
        this.sendMsg(newMsg);
    },
    joined: function (msg) {
        const game = app.scenes.game;
        if (game.player.name === msg.playerJoining.name) {
            game.players = msg.players;
            for (let playerOtherName in game.players) {
                if (playerOtherName === game.player.name) continue;   // don't add again own cannon
                game.playerSpritesAdd(game.players[playerOtherName], game);
                game.variables.playersNamesArray.push(playerOtherName);
            }
            for (let alienId in msg.aliens) {
                msg.aliens[alienId].id = alienId;
                app.utils.spriteAdd(msg.aliens[alienId], game.sprites.aliens, game.stage,
                    function () {
                        return new PIXI.extras.AnimatedSprite(game.attributes.alien.textureArray);
                    });
            }
            game.variables.level = msg.level;
            game.sprites.level.text = "L" + msg.level;
            game.variables.aliensPerMSec = msg.aliensPerMSec;
            game.attributes.alien.speed = msg.alienSpeed;
            game.attributes.cannon.speed = msg.cannonSpeed;
            game.attributes.bullet.speed = msg.bulletSpeed;

            game.variables.isAdmin = false; // joined message can only be sent from the isAdmin (first player)
            app.renderScreen = game.play; // replace renderScreen adminPlay for play
        } else {
            game.players[msg.playerJoining.name] = msg.playerJoining;
            game.playerSpritesAdd(msg.playerJoining, game);
            game.variables.playersNamesArray.push(msg.playerJoining.name);
        }
    },
    rejected: function (msg) {
        console.log("Rejected " + msg.playerJoining + " from " + msg.from);
    },
    cannonMove: function (msg) {
        let cannonSprite = app.scenes.game.sprites.cannons[msg.from];
        cannonSprite.x = msg.cannonState.x;
        cannonSprite.vx = msg.cannonState.vx;
    },
    alienAdd: function (msg) {
        const game = app.scenes.game;
        app.utils.spriteAdd(msg.alienState, game.sprites.aliens, game.stage,
            function () {
                return new PIXI.extras.AnimatedSprite(game.attributes.alien.textureArray);
            });
    },
    shoot: function (msg) { // this msg sends only one new bulletState
        const game = app.scenes.game;
        app.utils.spriteAdd(msg.bulletState, game.sprites.bullets[msg.from], game.stage,
            function () {   // a function that returns the sprite that should be used to make each bulletSprite
                return new PIXI.Sprite(game.attributes.bullet.texture);
            });
        game.sounds.shoot.play();
    },
    endLevel: function (msg) {
        const game = app.scenes.game;
        game.variables.isEarthSaved = msg.isEarthSaved;
        game.variables.screenMsg = msg.screenMsg;
        game.variables.level = msg.level;
        app.renderScreen = game.stopLevel;
    },
    playerTint: function (msg) {
        const game = app.scenes.game;
        game.players[msg.from].tint = msg.tint;
        game.sprites.cannons[msg.from].tint = msg.tint;
        game.sprites.scores[msg.from].tint = msg.tint;
    }
};