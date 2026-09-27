/*:
 * @plugindesc Muestra las barras UpBar y DownBar mientras hay un enemigo fijado.
 * @author Custom
 *
 * @param Near Gap
 * @desc Separación en píxeles entre las barras cuando el jugador está cerca.
 * @default 0
 *
 * @param Far Gap
 * @desc Separación en píxeles cuando está lejos. Usa -1 para ocultar las barras fuera de pantalla.
 * @default -1
 *
 * @param Far Distance
 * @desc Distancia en casillas a la que las barras alcanzan su posición lejana.
 * @default 6
 *
 * @help
 * Requiere QABS_LockOn y las imágenes img/actorhud/UpBar.png y
 * img/actorhud/DownBar.png. Las barras solo aparecen mientras hay un enemigo
 * fijado. Su posición cambia según la distancia al objetivo.
 */

(function() {
	"use strict";

	var parameters = PluginManager.parameters("SRD_DynamicCameraActorHud");
	var nearGap = Number(parameters["Near Gap"] || 0);
	var farGap = Number(parameters["Far Gap"] || -1);
	var farDistance = Math.max(1, Number(parameters["Far Distance"] || 6));
	var movementSpeed = 0.15;
	var bars = null;
	var barsScene = null;
	var barsActive = false;

	function distanceToTarget() {
		var target = $gamePlayer && $gamePlayer.lockOnTarget &&
			$gamePlayer.lockOnTarget();

		if (!target || !$gamePlayer.isValidLockOnTarget(target)) {
			return null;
		}

		var deltaX = $gamePlayer.x - target.x;
		var deltaY = $gamePlayer.y - target.y;

		return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
	}

	function createBars(scene) {
		bars = {
			up: new Sprite(ImageManager.loadBitmap("img/actorhud/", "UpBar")),
			down: new Sprite(ImageManager.loadBitmap("img/actorhud/", "DownBar"))
		};
		bars.up.anchor.x = 0.5;
		bars.down.anchor.x = 0.5;
		bars.up.x = Graphics.width / 2;
		bars.down.x = Graphics.width / 2;
		bars.up.y = -bars.up.bitmap.height;
		bars.down.y = Graphics.height;
		bars.up.visible = false;
		bars.down.visible = false;
		scene.addChild(bars.up);
		scene.addChild(bars.down);
		barsScene = scene;
		barsActive = false;
	}

	function addBarsToScene(scene) {
		if (barsScene !== scene) {
			if (bars && bars.up.parent) {
				bars.up.parent.removeChild(bars.up);
				bars.down.parent.removeChild(bars.down);
			}
			createBars(scene);
		} else if (bars.up.parent !== scene) {
			scene.addChild(bars.up);
			scene.addChild(bars.down);
		}
	}

	function updateBars() {
		if (!(SceneManager._scene instanceof Scene_Map)) {
			return;
		}

		var scene = SceneManager._scene;
		addBarsToScene(scene);

		var distance = distanceToTarget();
		var topHeight = bars.up.bitmap.height;
		var bottomHeight = bars.down.bitmap.height;
		var hiddenUpY = -topHeight;
		var hiddenDownY = Graphics.height;

		if (distance !== null && !barsActive) {
			barsActive = true;
			bars.up.y = hiddenUpY;
			bars.down.y = hiddenDownY;
		}
		if (!barsActive) {
			bars.up.visible = false;
			bars.down.visible = false;
			return;
		}

		bars.up.visible = true;
		bars.down.visible = true;

		var targetUpY = hiddenUpY;
		var targetDownY = hiddenDownY;
		if (distance !== null) {
			var ratio = Math.max(0, Math.min(1, distance / farDistance));
			var centerY = Graphics.height / 2;
			var nearUpY = centerY - nearGap / 2 - topHeight;
			var nearDownY = centerY + nearGap / 2;
			var farUpY;
			var farDownY;

			if (farGap < 0) {
				farUpY = hiddenUpY;
				farDownY = hiddenDownY;
			} else {
				farUpY = centerY - farGap / 2 - topHeight;
				farDownY = centerY + farGap / 2;
			}

			targetUpY = nearUpY + (farUpY - nearUpY) * ratio;
			targetDownY = nearDownY + (farDownY - nearDownY) * ratio;
		}

		bars.up.y += (targetUpY - bars.up.y) * movementSpeed;
		bars.down.y += (targetDownY - bars.down.y) * movementSpeed;

		if (distance === null && Math.abs(targetUpY - bars.up.y) < 1 &&
			Math.abs(targetDownY - bars.down.y) < 1) {
			bars.up.y = targetUpY;
			bars.down.y = targetDownY;
			bars.up.visible = false;
			bars.down.visible = false;
			barsActive = false;
		}
	}

	var _Scene_Map_update = Scene_Map.prototype.update;
	Scene_Map.prototype.update = function() {
		_Scene_Map_update.apply(this, arguments);
		updateBars();
	};
})();
