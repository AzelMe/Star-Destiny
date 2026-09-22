/*:
 * @plugindesc Control dinámico del fondo y barras cinematográficas de pantalla.
 * @author Custom
 *
 * @help
 * ============================================================================
 * FONDO
 * ============================================================================
 *
 * ScreenColor #RRGGBB [duracion]
 *
 * Ejemplo:
 * ScreenColor #18202B 60
 *
 *
 * ============================================================================
 * BARRAS CINEMATOGRÁFICAS
 * ============================================================================
 *
 * ScreenBars #RRGGBB altura [duracion]
 *
 * La altura puede ser en píxeles:
 *
 * ScreenBars #6A4C93 120 60
 *
 * O en porcentaje:
 *
 * ScreenBars #6A4C93 15% 60
 *
 *
 * ============================================================================
 * REINICIAR
 * ============================================================================
 *
 * ResetScreenColor [duracion]
 *
 * ResetScreenBars [duracion]
 *
 * ============================================================================
 */

(function() {

    "use strict";

    //=========================================================================
    // FONDO
    //=========================================================================

    var currentColor = "#000000";
    var targetColor = "#000000";
    var colorTransition = 0;


    //=========================================================================
    // BARRAS
    //=========================================================================

    var barsCurrentColor = "#000000";
    var barsTargetColor = "#000000";

    var barsCurrentHeight = 0;
    var barsTargetHeight = 0;

    var barsTransition = 0;

    var barsTop = null;
    var barsBottom = null;

    var barsScene = null;


    //=========================================================================
    // COLOR
    //=========================================================================

    function colorToNumber(color) {

        color = String(color || "")
            .replace("#", "")
            .trim();

        if (!/^[0-9a-fA-F]{6}$/.test(color)) {
            return 0x000000;
        }

        return parseInt(color, 16);
    }


    function normalizeColor(color) {

        color = String(color || "")
            .replace("#", "")
            .trim();

        if (!/^[0-9a-fA-F]{6}$/.test(color)) {
            return "#000000";
        }

        return "#" + color.toUpperCase();
    }


    function toHex(value) {

        var result = Math.round(value).toString(16);

        return result.length < 2
            ? "0" + result
            : result;
    }


    function interpolateColor(current, target, ratio) {

        var c1 = colorToNumber(current);
        var c2 = colorToNumber(target);

        var r1 = (c1 >> 16) & 255;
        var g1 = (c1 >> 8) & 255;
        var b1 = c1 & 255;

        var r2 = (c2 >> 16) & 255;
        var g2 = (c2 >> 8) & 255;
        var b2 = c2 & 255;

        var r = r1 + (r2 - r1) * ratio;
        var g = g1 + (g2 - g1) * ratio;
        var b = b1 + (b2 - b1) * ratio;

        return "#" +
            toHex(r) +
            toHex(g) +
            toHex(b);
    }


    //=========================================================================
    // FONDO DEL HTML Y DEL RENDERER
    //=========================================================================

    function applyBackgroundColor(color) {

        var normalizedColor = normalizeColor(color);
        var renderer = Graphics._renderer;

        if (document.documentElement) {
            document.documentElement.style.backgroundColor = normalizedColor;
            document.documentElement.style.background = normalizedColor;
            document.documentElement.style.margin = "0";
            document.documentElement.style.padding = "0";
            document.documentElement.style.overflow = "hidden";
        }

        if (document.body) {
            document.body.style.backgroundColor = normalizedColor;
            document.body.style.background = normalizedColor;
            document.body.style.margin = "0";
            document.body.style.padding = "0";
            document.body.style.overflow = "hidden";
        }

        if (!renderer) {
            return;
        }

        renderer.backgroundColor = colorToNumber(normalizedColor);

        if (renderer.backgroundColorString !== undefined) {
            renderer.backgroundColorString = normalizedColor;
        }

        if (Graphics._canvas) {
            Graphics._canvas.style.backgroundColor = normalizedColor;
            Graphics._canvas.style.display = "block";
        }
    }


    function startColorTransition(color, duration) {

        targetColor = normalizeColor(color);

        colorTransition = Math.max(
            0,
            Number(duration) || 0
        );

        if (colorTransition === 0) {

            currentColor = targetColor;

            applyBackgroundColor(currentColor);
        }
    }


    function updateBackgroundColor() {

        if (colorTransition <= 0) {
            return;
        }

        currentColor = interpolateColor(
            currentColor,
            targetColor,
            1 / colorTransition
        );

        colorTransition--;

        if (colorTransition <= 0) {
            currentColor = targetColor;
        }

        applyBackgroundColor(currentColor);
    }


    //=========================================================================
    // ALTURA DE LAS BARRAS
    //=========================================================================

    function parseBarHeight(value) {

        value = String(value || "").trim();

        if (/%$/.test(value)) {

            var percent = parseFloat(
                value.replace("%", "")
            );

            if (isNaN(percent)) {
                return 0;
            }

            return Graphics.height * percent / 100;
        }

        var pixels = parseFloat(value);

        if (isNaN(pixels)) {
            return 0;
        }

        return pixels;
    }


    //=========================================================================
    // CREAR BARRA
    //=========================================================================

    function createBarSprite() {

        var graphics = new PIXI.Graphics();

        graphics.x = 0;
        graphics.y = 0;

        graphics.visible = false;

        return graphics;
    }


    //=========================================================================
    // PREPARAR BARRAS PARA LA ESCENA
    //=========================================================================

    function setupBarsForScene() {

        var scene = SceneManager._scene;

        if (!scene) {
            return;
        }

        if (!barsTop || !barsBottom) {
            barsTop = createBarSprite();
            barsBottom = createBarSprite();
        }

        if (barsScene !== scene) {
            barsScene = scene;

            if (barsTop.parent) {
                barsTop.parent.removeChild(barsTop);
            }

            if (barsBottom.parent) {
                barsBottom.parent.removeChild(barsBottom);
            }

            scene.addChild(barsTop);
            scene.addChild(barsBottom);
        } else {
            if (barsTop.parent !== scene) {
                scene.addChild(barsTop);
            }

            if (barsBottom.parent !== scene) {
                scene.addChild(barsBottom);
            }
        }

        updateBarSprites();
    }


    //=========================================================================
    // DIBUJAR BARRAS
    //=========================================================================

    function updateBarSprites() {

        if (!barsTop || !barsBottom) {
            return;
        }

        var height = Math.max(
            0,
            Math.min(
                Graphics.height,
                barsCurrentHeight
            )
        );

        var color = colorToNumber(
            barsCurrentColor
        );


        //=====================================================================
        // BARRA SUPERIOR
        //=====================================================================

        barsTop.clear();

        if (height > 0) {

            barsTop.beginFill(
                color,
                1
            );

            barsTop.drawRect(
                0,
                0,
                Graphics.width,
                height
            );

            barsTop.endFill();
        }

        barsTop.x = 0;
        barsTop.y = 0;


        //=====================================================================
        // BARRA INFERIOR
        //=====================================================================

        barsBottom.clear();

        if (height > 0) {

            barsBottom.beginFill(
                color,
                1
            );

            barsBottom.drawRect(
                0,
                0,
                Graphics.width,
                height
            );

            barsBottom.endFill();
        }

        barsBottom.x = 0;

        barsBottom.y =
            Graphics.height - height;


        //=====================================================================
        // VISIBILIDAD
        //=====================================================================

        var visible = height > 0;

        barsTop.visible = visible;
        barsBottom.visible = visible;
    }


    //=========================================================================
    // TRANSICIÓN DE BARRAS
    //=========================================================================

    function startBarsTransition(
        color,
        height,
        duration
    ) {

        setupBarsForScene();

        barsTargetColor =
            normalizeColor(color);

        barsTargetHeight = Math.max(
            0,
            Math.min(
                Graphics.height,
                Number(height) || 0
            )
        );

        barsTransition = Math.max(
            0,
            Number(duration) || 0
        );

        if (barsTransition === 0) {

            barsCurrentColor =
                barsTargetColor;

            barsCurrentHeight =
                barsTargetHeight;

            updateBarSprites();
        }
    }


    //=========================================================================
    // ACTUALIZAR BARRAS
    //=========================================================================

    function updateBars() {

        setupBarsForScene();

        if (barsTransition <= 0) {

            updateBarSprites();

            return;
        }


        //=====================================================================
        // COLOR
        //=====================================================================

        barsCurrentColor =
            interpolateColor(
                barsCurrentColor,
                barsTargetColor,
                1 / barsTransition
            );


        //=====================================================================
        // ALTURA
        //=====================================================================

        barsCurrentHeight +=
            (barsTargetHeight - barsCurrentHeight) /
            barsTransition;


        barsTransition--;


        if (barsTransition <= 0) {

            barsCurrentColor =
                barsTargetColor;

            barsCurrentHeight =
                barsTargetHeight;
        }


        updateBarSprites();
    }


    //=========================================================================
    // SCENE MANAGER
    //=========================================================================

    var _SceneManager_updateMain =
        SceneManager.updateMain;

    SceneManager.updateMain = function() {

        _SceneManager_updateMain.apply(
            this,
            arguments
        );

        updateBackgroundColor();
        updateBars();
    };


    //=========================================================================
    // PLUGIN COMMAND
    //=========================================================================

    var _Game_Interpreter_pluginCommand =
        Game_Interpreter.prototype.pluginCommand;

    Game_Interpreter.prototype.pluginCommand =
        function(command, args) {

            _Game_Interpreter_pluginCommand.apply(
                this,
                arguments
            );

            var name = String(command || "")
                .trim()
                .toLowerCase();


            //=================================================================
            // SCREEN COLOR
            //=================================================================

            if (name === "screencolor") {

                startColorTransition(
                    args[0],
                    args[1]
                );

                return;
            }


            //=================================================================
            // SCREEN BARS
            //=================================================================

            if (name === "screenbars") {

                var color = args[0];

                var height =
                    parseBarHeight(args[1]);

                var duration = args[2];

                startBarsTransition(
                    color,
                    height,
                    duration
                );

                return;
            }


            //=================================================================
            // RESET SCREEN COLOR
            //=================================================================

            if (name === "resetscreencolor") {

                startColorTransition(
                    "#000000",
                    args[0]
                );

                return;
            }


            //=================================================================
            // RESET SCREEN BARS
            //=================================================================

            if (name === "resetscreenbars") {

                startBarsTransition(
                    barsCurrentColor,
                    0,
                    args[0]
                );

                return;
            }
        };


    //=========================================================================
    // INICIO
    //=========================================================================

    var _Graphics_createRenderer = Graphics._createRenderer;

    Graphics._createRenderer = function() {
        _Graphics_createRenderer.apply(this, arguments);
        applyBackgroundColor(currentColor);
    };

    applyBackgroundColor(
        currentColor
    );

})();