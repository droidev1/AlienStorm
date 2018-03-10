/** start scene */
app.scenes.start = function (canvasSize, stage) {
    const earthImage = 'images/earth.png';
    let earthSprite = undefined;

    PIXI.loader
        .add(earthImage)
        .load(setupStage);

    function setupStage(loader, resources) {
        earthSprite = new PIXI.Sprite(resources[earthImage].texture);
        earthSprite.position.set(canvasSize.width / 2, canvasSize.height / 2);
        earthSprite.anchor.set(0.5, 0.5);
        stage.addChild(earthSprite);
        app.renderScene = rendering;
        app.actionStart();
    }

    function rendering(delta) {
        earthSprite.rotation += 0.02 * delta;
    }

    app.scenes.start.actionStop = function () {
        stage.removeChild(earthSprite);
    };
};