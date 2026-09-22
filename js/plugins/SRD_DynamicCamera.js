/*:
 * @plugindesc Encuadra al jugador y un evento con zoom dinámico.
 * @author Amber
 *
 * @help
 * Comandos:
 *
 * DynamicCamera event [id] [zoomCerca] [zoomLejos] [distanciaMaxima]
 * StopDynamicCamera
 *
 * Ejemplo:
 * DynamicCamera event 2 1.6 0.8 6
 *
 * Cerca del evento 2: zoom 1.6
 * A 6 o más casillas: zoom 0.8, limitado para que ambos sigan visibles.
 */

var SRD = SRD || {};
SRD.DynamicCamera = SRD.DynamicCamera || {};

(function(_) {
    "use strict";

    _.enabled = false;
    _.eventId = 0;
    _.nearZoom = 1.6;
    _.farZoom = 0.8;
    _.maxDistance = 6;
    _.zoomDuration = 8;
    _.cameraFollowPower = 0.2;
    _.fitMargin = 1.5;

    _.clamp = function(value, min, max) {
        return Math.max(min, Math.min(max, value));
    };

    _.distance = function(first, second) {
        return Math.sqrt(Math.pow(first.x - second.x, 2) +
                         Math.pow(first.y - second.y, 2));
    };

    _.fitZoom = function(player, event) {
        var horizontalDistance = Math.abs(player.x - event.x) + _.fitMargin;
        var verticalDistance = Math.abs(player.y - event.y) + _.fitMargin;
        var horizontalZoom = $gameMap.screenTileX() / horizontalDistance;
        var verticalZoom = $gameMap.screenTileY() / verticalDistance;

        return Math.min(horizontalZoom, verticalZoom);
    };

    _.minimumMapZoom = function() {
        var horizontalZoom = Graphics.width /
            ($gameMap.width() * $gameMap.tileWidth());
        var verticalZoom = Graphics.height /
            ($gameMap.height() * $gameMap.tileHeight());

        return Math.max(horizontalZoom, verticalZoom);
    };

    _.moveToMidpoint = function(player, event) {
        var targetX = (player.x + event.x) / 2 -
                      player.centerX();
        var targetY = (player.y + event.y) / 2 -
                      player.centerY();
        var nextX = $gameMap._displayX +
                    (targetX - $gameMap._displayX) * _.cameraFollowPower;
        var nextY = $gameMap._displayY +
                    (targetY - $gameMap._displayY) * _.cameraFollowPower;

        $gameMap.setDisplayPos(nextX, nextY);
    };

    _.update = function() {
        if (!_.enabled || !$gamePlayer || !$gameMap || !$gameScreen) {
            return;
        }

        var event = $gameMap.event(_.eventId);
        if (!event) {
            return;
        }

        var distance = _.distance($gamePlayer, event);

        var ratio = _.clamp(distance / _.maxDistance, 0, 1);
        var requestedZoom = _.nearZoom +
                    (_.farZoom - _.nearZoom) * ratio;
        var zoom = Math.max(_.minimumMapZoom(),
                Math.min(requestedZoom,
                _.fitZoom($gamePlayer, event)));

        // Desactiva el centrado individual de CameraCore.
        $gameScreen.focusEvent = null;
        _.moveToMidpoint($gamePlayer, event);

        // El zoom se actualiza mientras el encuadre sigue al punto medio.
        $gameScreen.setCameraFocus(String(zoom), String(_.zoomDuration));
    };

    var _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.apply(this, arguments);
        _.update();
    };

    var _Game_Interpreter_pluginCommand =
        Game_Interpreter.prototype.pluginCommand;

    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.apply(this, arguments);

        var com = command.trim().toLowerCase();

        if (com === "dynamiccamera" && args[0].toLowerCase() === "event") {
            _.eventId = Number(args[1]);
            _.nearZoom = Number(args[2]);
            _.farZoom = Number(args[3]);
            _.maxDistance = Number(args[4]);
            _.enabled = true;
        }

        if (com === "stopdynamiccamera") {
            _.enabled = false;
            $gameScreen.focusEvent = 0;
            $gameScreen.resetCameraFocus(20);
            $gamePlayer.centerCamera(20);
        }
    };
})(SRD.DynamicCamera);