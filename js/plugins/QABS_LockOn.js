/*:
 * @plugindesc Lock-on for QABS: toggle the nearest enemy and face it.
 * @author OpenAI
 *
 * @param Lock-on Key
 * @desc Input name used to lock or unlock the nearest enemy. Remappable with QInput.
 * @default tab
 *
 * @param Lock-on Range
 * @desc Maximum distance to acquire or keep a target, in pixels.
 * @default 480
 *
 * @help
 * Press the configured key to lock the nearest living enemy. Press it again
 * to unlock. The player automatically faces the target and attacks are aimed
 * at it while it remains alive and within range. Player movement stays free.
 * Requires QABS and QInput.
 */

(function() {
  var parameters = PluginManager.parameters('QABS_LockOn');
  var lockKey = String(parameters['Lock-on Key'] || 'tab');
  var lockRange = Number(parameters['Lock-on Range'] || 480);

  function targetDistance(player, target) {
    var dx = target.cx() - player.cx();
    var dy = target.cy() - player.cy();
    return Math.sqrt(dx * dx + dy * dy);
  }

  Game_Player.prototype.lockOnTarget = function() {
    if (!this._lockOnEventId || this._lockOnMapId !== $gameMap.mapId()) {
      return null;
    }
    return $gameMap.event(this._lockOnEventId);
  };

  Game_Player.prototype.clearLockOn = function() {
    this._lockOnEventId = 0;
    this._lockOnMapId = 0;
  };

  Game_Player.prototype.findLockOnTarget = function() {
    var player = this;
    var targets = $gameMap.events().filter(function(event) {
      if (event._erased || !event.battler() || event.battler().isDead()) {
        return false;
      }
      return !player.isFriendly(event) && targetDistance(player, event) <= lockRange;
    });
    targets.sort(function(first, second) {
      return targetDistance(player, first) - targetDistance(player, second);
    });
    return targets[0] || null;
  };

  Game_Player.prototype.isValidLockOnTarget = function(target) {
    return !!target && !target._erased && !!target.battler() &&
      !target.battler().isDead() && !this.isFriendly(target) &&
      targetDistance(this, target) <= lockRange;
  };

  function faceLockOnTarget(player, target) {
    var directionFixed = player.isDirectionFixed();
    player.setDirectionFix(false);
    player.turnTowardCharacter(target);
    player.setDirectionFix(directionFixed);
  }

  var Alias_Game_Player_beforeSkill = Game_Player.prototype.beforeSkill;
  Game_Player.prototype.beforeSkill = function(skill) {
    Alias_Game_Player_beforeSkill.call(this, skill);
    var target = this.lockOnTarget();
    if (!target || !this.isValidLockOnTarget(target)) return;
    var radian = Math.atan2(target.cy() - this.cy(), target.cx() - this.cx());
    this.setRadian(radian);
    skill.radian = this._radian;
  };

  /* Relative movement experiment retained for later:
  var Alias_Game_Player_moveByInput = Game_Player.prototype.moveByInput;
  Game_Player.prototype.moveByInput = function() {
    var target = this.lockOnTarget();
    if (!target || !this.isValidLockOnTarget(target) ||
        this.startedMoving() || !this.canMove()) {
      return Alias_Game_Player_moveByInput.call(this);
    }
    if (this.triggerAction()) return;

    var strafe = 0;
    var forward = 0;
    if (Imported.QInput && Input.preferGamepad() && $gameMap.offGrid() && Input._dirAxesA) {
      strafe = Input._dirAxesA.x;
      forward = -Input._dirAxesA.y;
    } else {
      var direction = QMovement.diagonal ? Input.dir8 : Input.dir4;
      if ([3, 6, 9].contains(direction)) strafe = 1;
      if ([1, 4, 7].contains(direction)) strafe = -1;
      if ([7, 8, 9].contains(direction)) forward = 1;
      if ([1, 2, 3].contains(direction)) forward = -1;
    }
    strafe *= -1;
    forward *= -1;
    if (strafe === 0 && forward === 0) {
      return Alias_Game_Player_moveByInput.call(this);
    }

    var dx = target.cx() - this.cx();
    var dy = target.cy() - this.cy();
    var distance = Math.sqrt(dx * dx + dy * dy);
    if (distance === 0) return;
    var worldX = forward * dx / distance - strafe * dy / distance;
    var worldY = forward * dy / distance + strafe * dx / distance;
    this.clearMouseMove();
    this.moveRadian(Math.atan2(worldY, worldX));
  };
  */

  Game_Player.prototype.toggleLockOn = function() {
    if (this._lockOnEventId) {
      this.clearLockOn();
      return;
    }
    var target = this.findLockOnTarget();
    if (target) {
      this._lockOnEventId = target.eventId();
      this._lockOnMapId = $gameMap.mapId();
    }
  };

  var Alias_Game_Player_updateABS = Game_Player.prototype.updateABS;
  Game_Player.prototype.updateABS = function() {
    Alias_Game_Player_updateABS.call(this);
    if (!$gameSystem._absEnabled) {
      this.clearLockOn();
      return;
    }
    if (this._lockOnEventId && this._lockOnMapId !== $gameMap.mapId()) {
      this.clearLockOn();
    }
    if ($gameMap.isEventRunning() || $gameMessage.isBusy()) {
      return;
    }
    if (Input.isTriggered(lockKey)) {
      this.toggleLockOn();
    }
    var target = this.lockOnTarget();
    if (!target) return;
    if (!this.isValidLockOnTarget(target)) {
      this.clearLockOn();
      return;
    }
    faceLockOnTarget(this, target);
  };

  function makeLockOnMarker() {
    var bitmap = new Bitmap(40, 40);
    var context = bitmap._context;
    context.strokeStyle = '#ffd54a';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(20, 20, 13, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(20, 1);
    context.lineTo(20, 8);
    context.moveTo(20, 32);
    context.lineTo(20, 39);
    context.moveTo(1, 20);
    context.lineTo(8, 20);
    context.moveTo(32, 20);
    context.lineTo(39, 20);
    context.stroke();
    bitmap._setDirty();
    return bitmap;
  }

  var Alias_Spriteset_Map_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
  Spriteset_Map.prototype.createLowerLayer = function() {
    Alias_Spriteset_Map_createLowerLayer.call(this);
    this._lockOnMarker = new Sprite(makeLockOnMarker());
    this._lockOnMarker.anchor.x = 0.5;
    this._lockOnMarker.anchor.y = 0.5;
    this._lockOnMarker.z = 9;
    this._lockOnMarker.visible = false;
    this._lockOnMarker.scale.x = 0;
    this._lockOnMarker.scale.y = 0;
    this._lockOnMarker.opacity = 0;
    this._lockOnMarkerProgress = 0;
    this._tilemap.addChild(this._lockOnMarker);
  };

  var Alias_Spriteset_Map_update = Spriteset_Map.prototype.update;
  Spriteset_Map.prototype.update = function() {
    Alias_Spriteset_Map_update.call(this);
    var target = $gamePlayer && $gamePlayer.lockOnTarget();
    var isLocked = !!target && $gamePlayer.isValidLockOnTarget(target);
    if (isLocked) {
      this._lockOnMarker.x = target.screenX();
      this._lockOnMarker.y = target.screenY() - 24;
    }
    var zoomSpeed = 0.1;
    this._lockOnMarkerProgress = Math.max(0, Math.min(1,
      this._lockOnMarkerProgress + (isLocked ? zoomSpeed : -zoomSpeed)
    ));
    var progress = this._lockOnMarkerProgress;
    var overshoot = 2.7;
    var easedScale = 1 + (overshoot + 1) * Math.pow(progress - 1, 3) +
      overshoot * Math.pow(progress - 1, 2);
    this._lockOnMarker.scale.x = Math.max(0, easedScale);
    this._lockOnMarker.scale.y = Math.max(0, easedScale);
    this._lockOnMarker.opacity = Math.round(this._lockOnMarkerProgress * 255);
    this._lockOnMarker.visible = this._lockOnMarkerProgress > 0;
    if (this._lockOnMarker.visible) {
      this._lockOnMarker.rotation += 0.06;
    }
  };
})();