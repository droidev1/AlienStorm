app.scenes.game = {
    canvasSize: undefined,
    stage: undefined,
    player: undefined,
    players: {},    // embeds cannonState, bulletsStates and score objects associated with player name to be sent to other players
    imageAtlas: 'images/alienStorm.json',
    soundFiles: {
        shoot: "sounds/shoot.mp3",
        explosion: "sounds/explosion.mp3"
    },
    sounds: {
        shoot: undefined,
        explosion: undefined
    },
    attributes: {
        cannon: {
            image: "cannon.png",
            speed: 0.2  // speed in pixels by milliseconds
        },
        bullet: {
            image: "bullet.png",
            speed: 0.1
        },
        alien: {
            images: ["alien.png", "explosion.png"],
            states: {normal: 0, destroyed: 1},
            textureArray: [],
            speed: 0.05,
            normalTint: 0x808080
        },
        control: {
            width: 80,
            height: 80,
            margin: 30,
            padding: 20
        }
    },
    sprites: {  // avoid adding sprites to messages !!!
        cannons: {},    // embeds cannon sprites associated with player name to be sent to other players
        aliens: {},     // embeds alien sprites associated with alien counter id
        bullets: {},    // embeds bullet sprites associated with bullet counter id inside player name object => bullets[playerName][bulletId] 
        scores: {},
        level: undefined,
        screenMsg: undefined
    },
    variables: {
        isAdmin: true,
        aliensPerMSec: 0.002,
        alienTints: [],
        lastTimeAliens: undefined,  // setup on setupStage function
        lastTimePlay: undefined,    // setup on setupStage function
        alienCount: 0,
        alienTintCount: 5,          // every alienTintCount one alien will be tinted with one of alienTints
        bulletCount: 0,
        playerCount: 0,             // used to position scores
        scoreNeededToWin: 5,
        level: 1,
        isEarthSaved: undefined,    // used to know who won
        screenMsg: "",
        playersNamesArray: []       // used to rotate player order in bulletsLoop
    }
};

/**
 * Game scene setup: msgManager, textures and sounds
 * @param canvasSize
 * @param stage
 * @param player
 */
app.scenes.game.setup = function (canvasSize, stage, player) {
    const game = app.scenes.game;
    const attributes = game.attributes;
    const sprites = game.sprites;
    game.canvasSize = canvasSize;
    game.stage = stage;
    game.player = player;
    PIXI.loader.add([game.imageAtlas]).load(loaderCallback);

    function loaderCallback(loader, resources) {
        let images = resources[game.imageAtlas].textures;
        attributes.cannon.texture = images[attributes.cannon.image];
        attributes.cannon.halfWidth = attributes.cannon.texture.width / 2;
        attributes.cannon.height = attributes.cannon.texture.height;
        attributes.cannon.maxX = canvasSize.width - attributes.cannon.texture.width;

        attributes.bullet.texture = images[attributes.bullet.image];
        for (let i = 0; i < attributes.alien.images.length; i++) {
            let texture = new PIXI.Sprite(images[attributes.alien.images[i]]);
            attributes.alien.textureArray.push(texture);
        }
        attributes.alien.maxX = canvasSize.width - attributes.alien.textureArray[0].width;
        attributes.alien.height = attributes.alien.textureArray[0].height;

        let soundFiles = game.soundFiles;
        sounds.load([soundFiles.explosion, soundFiles.shoot]);
        sounds.whenLoaded = setupSounds;
    }

    function setupSounds() {
        game.sounds.explosion = sounds[game.soundFiles.explosion];
        game.sounds.shoot = sounds[game.soundFiles.shoot];

        setupPlayer();
        setupStage();
        app.renderScreen = game.adminPlay;
        app.msgManager.sendMsg({
            type: "join",
            from: game.player.name,
            fromPlayer: game.player
        });
        app.actionResume();
    }

    function setupPlayer() {
        player.cannonState = {  // used by app.utils.spriteAdd invoked by game.playerSpritesAdd and also by joined msg
            id: player.name,
            tint: player.tint,
            x: game.canvasSize.width / 2 - attributes.cannon.halfWidth,
            y: game.canvasSize.height - attributes.cannon.height,
            vx: 0,
            vy: 0
        };
        player.score = 0;
        player.bulletsStates = {};
        game.players[player.name] = player;
        game.variables.playersNamesArray.push(player.name);
    }

    function setupStage() {
        game.sprites.level = new PIXI.Text("L" + game.variables.level, {fill: "#00FF00", align: "center"});
        game.sprites.level.position.set(game.canvasSize.width - game.attributes.control.width, game.attributes.control.padding);
        game.stage.addChild(game.sprites.level);
        game.playerSpritesAdd(player, game);

        setupControls();
        setupColorButtons();

        game.variables.alienTints.push(player.tint);
        game.variables.lastTimeAliens = Date.now();
        game.variables.lastTimePlay = Date.now();
        game.sprites.screenMsg = new PIXI.Text("", {fill: "#00FF00", align: "center"});
        game.sprites.screenMsg.anchor.set(0.5, 0.5);
        game.sprites.screenMsg.position.set(game.canvasSize.width / 2, game.canvasSize.height / 2);

        // **************************
        // resourcesLoadedCallback inner functions
        // **************************
        function setupControls() {
            const yCoord = canvasSize.height - attributes.control.margin - attributes.control.height;
            const triangleVertexYCoord = canvasSize.height - attributes.control.margin - attributes.control.height / 2;

            stage.addChild(drawLeftControl());
            stage.addChild(drawRightControl());
            stage.addChild(setupShootControl());

            const leftArrow = app.utils.keyboard(37);
            const rightArrow = app.utils.keyboard(39);
            const spaceBar = app.utils.keyboard(32);
            leftArrow.press = leftPress;
            leftArrow.release = leftRelease;
            rightArrow.press = rightPress;
            rightArrow.release = rightRelease;
            spaceBar.press = shootPress;

            const CANNON_MOVE_MSG = {
                type: "cannonMove",
                from: player.name,
                cannonState: player.cannonState
            };
            const cannonSprite = sprites.cannons[player.name];

            function leftPress() {
                CANNON_MOVE_MSG.cannonState.x = cannonSprite.x;
                CANNON_MOVE_MSG.cannonState.vx = cannonSprite.vx = -attributes.cannon.speed;
                app.msgManager.sendMsg(CANNON_MOVE_MSG);
            }

            function rightPress() {
                CANNON_MOVE_MSG.cannonState.x = cannonSprite.x;
                CANNON_MOVE_MSG.cannonState.vx = cannonSprite.vx = attributes.cannon.speed;
                app.msgManager.sendMsg(CANNON_MOVE_MSG);
            }

            function leftRelease() {
                if (!rightArrow.isDown) {
                    CANNON_MOVE_MSG.cannonState.x = cannonSprite.x;
                    CANNON_MOVE_MSG.cannonState.vx = cannonSprite.vx = 0;
                    app.msgManager.sendMsg(CANNON_MOVE_MSG);
                }
            }

            function rightRelease() {
                if (!leftArrow.isDown) {
                    CANNON_MOVE_MSG.cannonState.x = cannonSprite.x;
                    CANNON_MOVE_MSG.cannonState.vx = cannonSprite.vx = 0;
                    app.msgManager.sendMsg(CANNON_MOVE_MSG);
                }
            }

            function shootPress() {
                const bulletAngle = 4.71;
                let bulletState = {
                    id: game.variables.bulletCount++,
                    tint: player.tint,
                    x: cannonSprite.x + attributes.cannon.halfWidth,
                    y: cannonSprite.y,
                    vx: Math.cos(bulletAngle) * attributes.bullet.speed,
                    vy: Math.sin(bulletAngle) * attributes.bullet.speed
                };
                let SHOOT_MSG = {
                    type: "shoot",
                    from: player.name,
                    bulletState: bulletState
                };
                app.msgManager.sendMsg(SHOOT_MSG);

                app.utils.spriteAdd(bulletState, sprites.bullets[player.name], stage,
                    function () {
                        return new PIXI.Sprite(attributes.bullet.texture);
                    });
                game.sounds.shoot.play();
            }

            function drawLeftControl() {
                const controlRectangle = new PIXI.RoundedRectangle(attributes.control.margin, yCoord, attributes.control.width, attributes.control.height, 15);
                const triangleVertexXCoord = attributes.control.margin + attributes.control.padding;
                const triangleBaseXCoord = attributes.control.margin + attributes.control.width - attributes.control.padding;
                return drawControlRectangle(controlRectangle, triangleVertexXCoord, triangleBaseXCoord, leftPress, leftRelease);
            }

            function drawRightControl() {
                const topLeftXCoord = attributes.control.width + 2 * attributes.control.margin;
                const controlRectangle = new PIXI.RoundedRectangle(topLeftXCoord, yCoord, attributes.control.width, attributes.control.height, 15);
                const triangleVertexXCoord = topLeftXCoord + attributes.control.width - attributes.control.padding;
                const triangleBaseXCoord = topLeftXCoord + attributes.control.padding;
                return drawControlRectangle(controlRectangle, triangleVertexXCoord, triangleBaseXCoord, rightPress, rightRelease);
            }

            function drawControlRectangle(controlRectangle, triangleVertexXCoord, triangleBaseXCoord, buttonPress, buttonRelease) {
                const graphics = new PIXI.Graphics();
                graphics.lineStyle(2, 0xFF00FF, 1);
                graphics.beginFill(0xFF00BB, 0.25);
                graphics.drawShape(controlRectangle);
                graphics.endFill();

                graphics.lineStyle(4, 0xFFD900, 1);
                graphics.beginFill(0xFF3300);
                graphics.moveTo(triangleVertexXCoord, triangleVertexYCoord);
                graphics.lineTo(triangleBaseXCoord, yCoord + attributes.control.padding);
                graphics.lineTo(triangleBaseXCoord, canvasSize.height - attributes.control.margin - attributes.control.padding);
                graphics.lineTo(triangleVertexXCoord, triangleVertexYCoord);
                graphics.endFill();

                graphics.interactive = true;
                graphics.buttonMode = true;
                graphics.hitArea = controlRectangle;
                graphics.mousedown = buttonPress;
                graphics.touchstart = buttonPress;
                graphics.mouseup = buttonRelease;
                graphics.touchend = buttonRelease;

                return graphics;
            }

            function setupShootControl() {
                const graphics = new PIXI.Graphics();
                const shootControlRadius = attributes.control.height / 2;
                const shootControlX = canvasSize.width - attributes.control.margin - shootControlRadius;
                const shootControlY = canvasSize.height - attributes.control.margin - shootControlRadius;
                const shootControlCircle = new PIXI.Circle(shootControlX, shootControlY, shootControlRadius);
                graphics.lineStyle(4, 0xFFD900, 1);
                graphics.beginFill(0xFF3300);
                graphics.drawCircle(shootControlX, shootControlY, shootControlRadius);
                graphics.endFill();

                graphics.interactive = true;
                graphics.buttonMode = true;
                graphics.hitArea = shootControlCircle;
                graphics.click = shootPress;
                graphics.tap = shootPress;

                return graphics;
            }
        }

        function setupColorButtons() {
            // const buttonYBegin = attributes.cannon.height + attributes.control.margin*2; // height of level sprite plus margins
            // const buttonHeight = (canvasSize.height - buttonYBegin - attributes.control.height - attributes.control.margin)/6 - attributes.control.margin;
            const buttonHeight = attributes.control.height - 10;
            const buttonRadius = buttonHeight / 2;
            const buttonYBegin = canvasSize.height / 2 - buttonHeight * 2;
            const buttonX2 = canvasSize.width - buttonRadius - attributes.control.margin;
            const buttonSeparation = attributes.control.margin + buttonHeight;
            let buttonX = attributes.control.margin + buttonRadius;
            let colorCounter = 0;

            for (let colorId in app.playerColors) {
                const graphics = new PIXI.Graphics();
                if (colorCounter === 3) {
                    buttonX = buttonX2;
                    colorCounter = 0;
                }
                const buttonY = buttonYBegin + buttonRadius + buttonSeparation * colorCounter;
                const buttonCircle = new PIXI.Circle(buttonX, buttonY, buttonRadius);
                graphics.lineStyle(4, 0x808080, 1);
                graphics.beginFill(app.playerColors[colorId]);
                graphics.drawCircle(buttonX, buttonY, buttonRadius);
                graphics.endFill();

                graphics.interactive = true;
                graphics.buttonMode = true;
                graphics.hitArea = buttonCircle;
                graphics.click = graphics.tap = function () {
                    const tint = app.playerColors[colorId];
                    game.player.tint = tint;
                    game.sprites.cannons[player.name].tint = tint;
                    game.sprites.scores[player.name].tint = tint;
                    const PLAYER_TINT_MSG = {
                        type: "playerTint",
                        from: player.name,
                        tint: tint
                    };
                    app.msgManager.sendMsg(PLAYER_TINT_MSG);

                };
                stage.addChild(graphics);
                ++colorCounter;
            }
        }
    }
};

app.scenes.game.playerSpritesAdd = function (playerToAdd, game) {
    app.utils.spriteAdd(playerToAdd.cannonState, game.sprites.cannons, game.stage,
        function () {
            return new PIXI.Sprite(game.attributes.cannon.texture);
        });

    game.sprites.scores[playerToAdd.name] = new PIXI.Text(playerToAdd.name + ": " + playerToAdd.score, {fill: 0xFFFFFF});
    game.sprites.scores[playerToAdd.name].position.set(game.attributes.control.padding + game.canvasSize.width * game.variables.playerCount++ / 4, game.attributes.control.padding);
    game.sprites.scores[playerToAdd.name].tint = playerToAdd.tint;
    game.stage.addChild(game.sprites.scores[playerToAdd.name]);

    game.sprites.bullets[playerToAdd.name] = {};
    for (let bulletId in playerToAdd.bulletsStates) {
        app.utils.spriteAdd(playerToAdd.bulletsStates[bulletId], game.sprites.bullets[playerToAdd.name], game.stage,
            function () {   // a function that returns the sprite that should be used to make each bulletSprite
                return new PIXI.Sprite(game.attributes.bullet.texture);
            });
    }
};

/**
 * adminPlay provides centralised shared game objects generation
 * this playing state is assigned only to the first room player
 * and subcalls the play function
 */
app.scenes.game.adminPlay = function () {
    const game = app.scenes.game;
    let delta = Date.now() - game.variables.lastTimeAliens;
    game.variables.aliensToAdd = delta * game.variables.aliensPerMSec;
    if (1 <= game.variables.aliensToAdd) {
        game.variables.lastTimeAliens = Date.now();
        let aliensToAdd = Math.trunc(game.variables.aliensToAdd);
        game.variables.aliensToAdd -= aliensToAdd;
        for (let i = 0; i < aliensToAdd; i++) {
            alienAdd();
        }
    }
    game.play();

    function alienAdd() {
        let alienTint = ((game.variables.alienCount % game.variables.alienTintCount) === (game.variables.alienTintCount - 1)) ?
            app.playerColors[app.colorsNamesArray[app.utils.randomInt(0, app.colorsNamesArray.length - 1)]] :
            game.attributes.alien.normalTint;
        let alienState = {
            id: game.variables.alienCount++,
            tint: alienTint,
            x: app.utils.randomInt(0, game.attributes.alien.maxX),
            y: 0 - game.attributes.alien.height,
            vx: 0,
            vy: game.attributes.alien.speed,
        };
        app.utils.spriteAdd(alienState, game.sprites.aliens, game.stage,
            function () {
                return new PIXI.extras.AnimatedSprite(game.attributes.alien.textureArray);
            });
        let ALIEN_ADD_MSG = {
            type: "alienAdd",
            from: game.player.name,
            alienState: alienState
        };
        app.msgManager.sendMsg(ALIEN_ADD_MSG);
    }
};

/**
 * play function contains all the game logic and runs in a loop
 */
app.scenes.game.play = function () {
    const game = app.scenes.game;
    let sprites = game.sprites;
    let delta = Date.now() - game.variables.lastTimePlay;
    game.variables.lastTimePlay = Date.now();

    bulletsLoop(bulletSpriteMove);
    aliensMoveAndBulletHitTest();

    for (let playerName in sprites.cannons) {
        let cannonSprite = sprites.cannons[playerName];
        if (cannonSprite.vx !== 0) {
            app.utils.move(cannonSprite, delta);
            if (cannonSprite.x > game.attributes.cannon.maxX) cannonSprite.x = game.attributes.cannon.maxX;
            if (cannonSprite.x < 0) cannonSprite.x = 0;
        }
        sprites.scores[playerName].text = playerName + ": " + game.players[playerName].score;
        if (game.players[playerName].score >= game.variables.scoreNeededToWin && game.variables.isAdmin) {
            game.variables.isEarthSaved = true;
            game.variables.screenMsg = "Earth Saved! " + playerName + " won!";
            game.end();
        }
    }

    function bulletsLoop(paramFunc, alienSprite) {
        const namesArray = game.variables.playersNamesArray;
        for (let playerId in namesArray) {
            const bulletSprites = sprites.bullets[namesArray[playerId]];
            for (let bulletId in bulletSprites) {
                if (paramFunc(bulletSprites[bulletId], namesArray[playerId], alienSprite)) {
                    return true;
                }
            }
        }
        namesArray.push(namesArray.shift());
        return false;
    }

    function bulletSpriteMove(bulletSprite) {
        app.utils.move(bulletSprite, delta);
        if (bulletSprite.y < -bulletSprite.height) {
            game.stage.removeChild(bulletSprite);
            delete bulletSprite;
        }
        return false;
    }

    function aliensMoveAndBulletHitTest() {
        for (let alienId in sprites.aliens) {
            const alienSprite = sprites.aliens[alienId];
            if (alienSprite.isDead) continue;
            app.utils.move(alienSprite, delta);
            if (bulletsLoop(alienBulletHitTest, alienSprite)) continue;
            if (alienSprite.y > game.canvasSize.height && game.variables.isAdmin) {
                game.variables.isEarthSaved = false;
                game.variables.screenMsg = "Earth Destroyed!";
                game.end();
                break;
            }
        }
    }

    function alienBulletHitTest(bulletSprite, playerName, alienSprite) {
        if (alienSprite.tint !== game.attributes.alien.normalTint && alienSprite.tint !== bulletSprite.tint) return;
        if (app.utils.hitTestRectangle(alienSprite, bulletSprite)) {
            alienSprite.tint = bulletSprite.tint;
            game.sounds.explosion.play();
            alienSprite.isDead = true;
            game.stage.removeChild(bulletSprite);
            delete bulletSprite;
            alienSprite.gotoAndStop(game.attributes.alien.states.destroyed);
            setTimeout(function () {
                game.stage.removeChild(alienSprite);
                delete alienSprite;
            }, 1000);
            game.players[playerName].score += 1;
        }
    }
};

app.scenes.game.end = function () {
    const game = app.scenes.game;
    let endLevelMsg = {
        type: "endLevel",
        from: game.player.name,
        isEarthSaved: game.variables.isEarthSaved,
        screenMsg: game.variables.screenMsg,
        level: game.variables.level
    };
    app.msgManager.sendMsg(endLevelMsg);
    app.renderScreen = game.stopLevel;
};

app.scenes.game.stopLevel = function () {
    const game = app.scenes.game;
    game.sprites.screenMsg.text = game.variables.screenMsg;
    game.stage.addChild(game.sprites.screenMsg);
    app.actionStop();
    setTimeout(game.reset, 2000);   // run `reset` function after 2 seconds
};

app.scenes.game.reset = function () {
    const game = app.scenes.game;
    removeSprites();
    resetVariables();
    if (game.variables.isEarthSaved) {
        game.sprites.level.text = "L" + (++game.variables.level);
        game.variables.scoreNeededToWin += 5;
        game.variables.aliensPerMSec *= 1.05;
        game.attributes.alien.speed *= 1.05;
        game.attributes.cannon.speed *= 1.05;
        game.attributes.bullet.speed *= 1.05;
    }
    app.renderScreen = game.variables.isAdmin ? game.adminPlay : game.play;
    app.actionResume();

    function removeSprites() {
        app.utils.removeSprites(game.stage, game.sprites.aliens);
        for (let playerName in game.players) {
            app.utils.removeSprites(game.stage, game.sprites.bullets[playerName]);
        }
        game.stage.removeChild(game.sprites.screenMsg);
    }

    function resetVariables() {
        game.variables.alienCount = 0;
        game.variables.bulletCount = 0;
        game.variables.lastTimeAliens = Date.now();
        game.variables.lastTimePlay = Date.now();

        for (let playerName in game.players) {
            game.players[playerName].bulletSprites = {};
            game.players[playerName].score = 0;
        }
    }
};