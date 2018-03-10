function $() {
    return document.getElementById(arguments[0]);
}

/**
 * App declaration
 * @type {{pixiApp: {}, canvasArea: {}, scenes: {}, utils: {}, renderScreen: undefined, playerColors: {orange: number, amber: number, lime: number, teal: number, blue: number, purple: number}, colorsNamesArray: string[], setup: app.setup, actionStart: app.actionStart, actionStop: app.actionStop, actionResume: app.actionResume, startGame: app.startGame}}
 */
const app = {
    pixiApp: {},
    canvasArea: {},
    scenes: {},
    utils: {},
    renderScreen: undefined,
    playerColors: {
        "orange": 0xFF5722,
        "amber": 0xFFC107,
        "lime": 0x8BC34A,
        "teal": 0x009688,
        "blue": 0x2196F3,
        "purple": 0x800080
    },
    colorsNamesArray: ["orange", "amber", "lime", "teal", "blue", "purple"],

    /** called from index.html play-button */
    setup: function () {
        /*
            function appendHtml(el, strHTML) {
                // var html = `<h2>Nom: ${$("player-name").value}</h2>`;
                // appendHtml($('start-form'), html);
                const fragment = document.createRange().createContextualFragment(strHTML);
                el.appendChild(fragment);
            }
        */
        app.msgManager.setup();
        // PIXI.settings.SPRITE_MAX_TEXTURES = Math.min(PIXI.settings.SPRITE_MAX_TEXTURES , 16); // https://github.com/pixijs/pixi.js/issues/4478
        this.pixiApp = new PIXI.Application({
                view: $("canvas")
            }
        );
        this.canvasArea = new PIXI.Rectangle(0, 0, this.pixiApp.renderer.width, this.pixiApp.renderer.height);
        this.scenes.start.setup(this.canvasArea, this.pixiApp.stage);
    },

    /** listener interface */
    actionStart: function () {
        this.pixiApp.ticker.add((delta) => {
            this.renderScreen(delta);
        });
    },
    actionStop: function () {
        this.pixiApp.ticker.stop();
    },
    actionResume: function () {
        this.pixiApp.ticker.start();
    },

    /** called from index.html play-button */
    startGame: function () {
        app.utils.fullScreenRequest();
        let player = {
            name: $('player-name').value,
            tint: app.playerColors[document.querySelector('input[name = "color"]:checked').value],
        };
        this.scenes.start.finish();
        this.actionStop();
        $("start-form").style.visibility = "hidden";
        this.scenes.game.setup(this.canvasArea, this.pixiApp.stage, player);
    }
};

/** Start scene: just a tiny earth rotating in the screen */
app.scenes.start = {
    assets: {},  // scene assets
    setup: function (canvasSize, stage) {
        const background = 'images/background.jpg';
        const earthImage = 'images/earth.png';
        this.stage = stage;         // setup scene stage for finish function
        let assets = this.assets;   // assets variable points to scene assets member

        PIXI.loader
            .add(background)
            .add(earthImage)
            .load(setupStage);

        function setupStage(loader, resources) {
            let backgroundSprite = new PIXI.Sprite(resources[background].texture);
            stage.addChild(backgroundSprite);
            let earthSprite = new PIXI.Sprite(resources[earthImage].texture);
            earthSprite.position.set(canvasSize.width / 2 - 40, canvasSize.height / 2);
            earthSprite.anchor.set(0.5, 0.5);
            stage.addChild(earthSprite);
            assets.earthSprite = earthSprite;
            app.renderScreen = rendering;
            app.actionStart();
        }

        function rendering(delta) {
            assets.earthSprite.rotation += 0.02 * delta;
        }
    },
    finish: function () {
        this.stage.removeChild(this.assets.earthSprite);
    }
};