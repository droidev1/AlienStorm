app.scenes.play = function (canvasSize, stage) {
    const imageAtlas = 'images/alienStorm.json';
    const alienImages = ["alien.png", "explosion.png"];
    const alienStates = {normal: 0, destroyed: 1};
    const explosionSoundFile = "sounds/explosion.mp3";
    const shootSoundFile = "sounds/shoot.mp3";
    const controlWidth = 200, controlHeight = 100,
        controlMargin = 50, controlPadding = 20;
    const controlYCoord = canvasSize.height - controlMargin - controlHeight;
    const controlTriangleVertexYCoord = canvasSize.height - controlMargin - controlHeight / 2;


    let images = undefined,
        cannon = undefined,
        maxCannonXPos = undefined,
        cannonPositionY = undefined,
        cannonHalfWidth = undefined,
        scoreDisplay = undefined,
        bullets = undefined,
        winner = undefined,
        shootSound = undefined,
        explosionSound = undefined,
        aliens = undefined,
        score = undefined,
        scoreNeededToWin = undefined,
        alienFrequency = undefined,
        alienTimer = undefined,
        gameOverMessage = undefined;
    let alientTextureArray = [];

    let alienSpeed = 5, cannonSpeed = 20,
        bulletSpeed = 10, alienDropFrequency = 20;

    let leftArrow = undefined, rightArrow = undefined,
        spaceBar = undefined;

    PIXI.loader
        .add([imageAtlas, "fonts/emulogic.ttf"])
        .load(setupStage);

    sounds.load([explosionSoundFile, shootSoundFile]);
    sounds.whenLoaded = setupSounds;

    function setupStage(loader, resources) {
        images = PIXI.loader.resources[imageAtlas].textures;
        cannon = new PIXI.Sprite(images["cannon.png"]);
        cannonPositionY = canvasSize.height - cannon.height;
        cannonHalfWidth = cannon.width / 2;
        cannon.position.set(canvasSize.width / 2 - cannonHalfWidth, cannonPositionY);
        cannon.vx = cannon.vy = 0;
        maxCannonXPos = canvasSize.width - cannon.width;
        // scoreDisplay = hexi.text("0", "20px emulogic", "#00FF00", 400, 10);
        for (let i = 0; i < alienImages.length; i++) {
            let texture = new PIXI.Sprite(images[alienImages[i]]);
            alientTextureArray.push(texture);
        }

        setupControls();
        stage.addChild(cannon);

        initVariables();
        //Set the game rendering to `play`
        app.renderScene = play;
        app.actionStart();

        function setupControls() {
            leftArrow = app.utils.keyboard(37), rightArrow = app.utils.keyboard(39), spaceBar = app.utils.keyboard(32);
            leftArrow.press = leftPress, leftArrow.release = leftRelease;
            rightArrow.press = rightPress, rightArrow.release = rightRelease;
            spaceBar.press = shootPress;

            stage.addChild(setupCanvasControl());
            stage.addChild(drawLeftControl());
            stage.addChild(drawRightControl());

            function leftPress() {
                cannon.vx = -cannonSpeed;
            }

            function rightPress() {
                cannon.vx = cannonSpeed;
            }

            function leftRelease() {
                if (!rightArrow.isDown) cannon.vx = 0;
            }

            function rightRelease() {
                if (!leftArrow.isDown) cannon.vx = 0;
            }

            function shootPress() {
                app.utils.shoot(cannon, 4.71, //The angle at which to shoot (4.71 is up)
                    cannon.position.x + cannonHalfWidth, //Bullet's x position on the cannon
                    cannonPositionY, //Bullet's y position on the canon
                    stage, //The container to which the bullet should be added
                    bulletSpeed, //The bullet's speed (pixels per frame)
                    bullets, //The array used to store the bullets
                    function () {     //A function that returns the sprite that should be used to make each bullet
                        return new PIXI.Sprite(images["bullet.png"]);
                    });
                shootSound.play();     //Play the shoot sound.
            }

            function drawLeftControl() {
                const controlRectangle = new PIXI.RoundedRectangle(controlMargin, controlYCoord, controlWidth, controlHeight, 15);
                const triangleVertexXCoord = controlMargin + controlPadding;
                const triangleBaseXCoord = controlMargin + controlWidth - controlPadding;
                return drawControlRectangle(controlRectangle, triangleVertexXCoord, triangleBaseXCoord, leftPress, leftRelease);
            }

            function drawRightControl() {
                const topLeftXCoord = canvasSize.width - controlMargin - controlWidth;
                const controlRectangle = new PIXI.RoundedRectangle(topLeftXCoord, controlYCoord, controlWidth, controlHeight, 15);
                const triangleVertexXCoord = canvasSize.width - controlMargin - controlPadding;
                const triangleBaseXCoord = topLeftXCoord + controlPadding;
                return drawControlRectangle(controlRectangle, triangleVertexXCoord, triangleBaseXCoord, rightPress, rightRelease);
            }

            function drawControlRectangle(controlRectangle, triangleVertexXCoord, triangleBaseXCoord, buttonPress, buttonRelease) {
                const graphics = new PIXI.Graphics();
                graphics.interactive = true;
                graphics.buttonMode = true;
                graphics.hitArea = controlRectangle;
                graphics.mousedown = buttonPress;
                graphics.touchstart = buttonPress;
                graphics.mouseup = buttonRelease;
                graphics.touchend = buttonRelease;

                graphics.lineStyle(2, 0xFF00FF, 1);
                graphics.beginFill(0xFF00BB, 0.25);
                graphics.drawShape(controlRectangle);
                graphics.endFill();

                graphics.lineStyle(4, 0xffd900, 1);
                graphics.beginFill(0xFF3300);
                graphics.moveTo(triangleVertexXCoord, controlTriangleVertexYCoord);
                graphics.lineTo(triangleBaseXCoord, controlYCoord + controlPadding);
                graphics.lineTo(triangleBaseXCoord, canvasSize.height - controlMargin - controlPadding);
                graphics.lineTo(triangleVertexXCoord, controlTriangleVertexYCoord);
                graphics.endFill();

                return graphics;
            }

            function setupCanvasControl() {
                const backgroundColor = 0x061639;
                const canvasControl = new PIXI.Graphics();
                const canvasRectangle = new PIXI.Rectangle(0, 0, canvasSize.width, canvasSize.height);
                canvasControl.interactive = true;
                canvasControl.hitArea = canvasRectangle;
                canvasControl.click = shootPress;
                canvasControl.tap = shootPress;
                canvasControl.lineStyle(0, backgroundColor, 1);
                canvasControl.beginFill(backgroundColor, 1);
                canvasControl.drawShape(canvasRectangle);
                canvasControl.endFill();
                return canvasControl;
            }
        }
    }

    function setupSounds() {
        explosionSound = sounds[explosionSoundFile];
        shootSound = sounds[shootSoundFile];
    }

    function initVariables() {
        bullets = [];
        aliens = [];
        score = 0;
        scoreNeededToWin = 30;
        alienTimer = 0;
        alienFrequency = alienDropFrequency;
        winner = "";
    }

    //The `play` function contains all the game logic and runs in a loop
    function play(delta) {
        app.utils.move(cannon);
        if (cannon.x > maxCannonXPos) cannon.x = maxCannonXPos;
        if (cannon.x < 0) cannon.x = 0;
        app.utils.move(bullets);

        alienTimer++;
        if (alienTimer === alienFrequency) {
            let alien = new PIXI.extras.AnimatedSprite(alientTextureArray);
            alien.y = 0 - alien.height;
            alien.x = app.utils.randomInt(0, 40) * alien.width;
            alien.vx = 0;
            alien.vy = alienSpeed;
            aliens.push(alien);
            stage.addChild(alien);
            alienTimer = 0;
            if (alienFrequency > 2) {
                alienFrequency--;
            }
        }
        app.utils.move(aliens);
        aliens = aliens.filter(function (alien) {
            let alienIsAlive = true;
            bullets = bullets.filter(function (bullet) {
                if (app.utils.hitTestRectangle(alien, bullet)) {
                    stage.removeChild(bullet);
                    alien.gotoAndStop(alienStates.destroyed);
                    explosionSound.play();
                    alien.vy = 0;
                    alienIsAlive = false;
                    setTimeout(function () {
                        if (alien) stage.removeChild(alien);
                    }, 1000);
                    score += 1;
                    return false;
                } else {
                    return true;
                }
            });
            return alienIsAlive;
        });

        // scoreDisplay.content = score;
        if (score === scoreNeededToWin) {
            winner = "player";
            app.renderScene = end;
        }

        //The aliens win if one of them reaches the bottom of the stage.
        aliens.forEach(function (alien) {
            if (alien.y > canvasSize.height) {
                winner = "aliens";
                // app.renderScene = end;
            }
        });
    }

    function end() {
        app.actionStop();
        gameOverMessage = hexi.text("", "20px emulogic", "#00FF00", 90, 120);

        // Display "Earth Saved!" if the player wins.
        if (winner === "player") {
            gameOverMessage.content = "Earth Saved!";
            gameOverMessage.x = 120;
        }

        //Display "Earth Destroyed!" if the aliens win.
        if (winner === "aliens") {
            gameOverMessage.content = "Earth Destroyed!";
        }

        // Run `reset` function after 3 seconds
        setTimeout(reset, 2000);
    }

    //The `reset` function resets all the game variables.
    function reset() {
        //Remove any remaining alien and bullet sprites.
        app.utils.removeSprites(stage, aliens);
        app.utils.removeSprites(stage, bullets);
        app.utils.removeSprites(stage, gameOverMessage);
        initVariables();
        //Re-center the cannon.
        cannon.position.set(canvasSize.width / 2 - cannonHalfWidth, cannonPositionY);
        //Change the game state back to `play`.
        app.renderScene = play;
        app.actionResume();
    }
};

