/*:
 * @plugindesc Adds guard, parry, and resistance to QABS.
 * @author GitHub Copilot
 *
 * @param Guard Input
 * @type string
 * @default control
 *
 * @param Guard Skill ID
 * @type skill
 * @default 0
 *
 * @param Guard Pose
 * @type string
 * @default guard
 *
 * @param Guard Pose Locks Movement
 * @type boolean
 * @default false
 *
 * @param Parry Animation
 * @type animation
 * @default 0
 *
 * @param Parry Window
 * @type number
 * @min 1
 * @default 8
 *
 * @param Block Damage Rate
 * @type number
 * @decimals 2
 * @min 0
 * @max 1
 * @default 0.35
 *
 * @param Block Recoil Distance
 * @type number
 * @min 0
 * @default 8
 *
 * @param Block Resistance Cost
 * @type number
 * @min 1
 * @default 20
 *
 * @param Parry Resistance Damage
 * @type number
 * @min 1
 * @default 35
 *
 * @param Max Resistance
 * @type number
 * @min 1
 * @default 100
 *
 * @param Resistance Recovery
 * @type number
 * @decimals 2
 * @min 0
 * @default 0.2
 *
 * @param Resistance Recovery Delay
 * @type number
 * @decimals 1
 * @min 0
 * @default 2
 *
 * @param Hit Recovery Multiplier
 * @type number
 * @decimals 1
 * @min 1
 * @default 4
 *
 * @param CT HUD Visible
 * @type boolean
 * @default true
 *
 * @param CT HUD X
 * @type number
 * @default 70
 *
 * @param CT HUD Y
 * @type number
 * @default 460
 *
 * @param Smart Fade
 * @type boolean
 * @default true
 *
 * @help
 * Hold the configured Guard Input to reduce physical damage. Pressing it
 * opens a short parry window: a successful parry prevents damage and drains
 * the attacker's resistance. Reaching zero resistance stuns that battler.
 *
 * The player CT meter displays resistance, not skill energy.
 * Block Recoil Distance controls the short knockback after a normal block.
 * After resistance reaches zero, recovery waits Resistance Recovery Delay seconds.
 * A hit releases the player's stun and multiplies their later recovery rate.
 * A skill note may include <resistanceDamage:X> to drain X resistance on hit.
 * This damage is added to the normal block cost; a successful parry negates it.
 * Guard Skill ID requires that learned skill. If it is 0, a learned skill
 * marked <parryGuard> is required. Skill notes may override the visuals with
 * <guardPose:POSE> and <parryAnimation:ID>.
 * Add <stationary> to an enemy note to disable chasing and user movement
 * while preserving its QABS attack AI.
 * Plugin command: ct_hud_visible true|false
 */

(function() {
  'use strict';

  var params = PluginManager.parameters('QABS_ParryCT');
  var settings = {
    guardInput: String(params['Guard Input'] || 'control'),
    guardSkillId: Number(params['Guard Skill ID'] || 0),
    guardPose: String(params['Guard Pose'] || 'guard'),
    guardPoseLocksMovement: String(params['Guard Pose Locks Movement'] || 'false') === 'true',
    parryAnimation: Number(params['Parry Animation'] || 0),
    parryWindow: Number(params['Parry Window'] || 8),
    blockDamageRate: Number(params['Block Damage Rate'] || 0.35),
    blockRecoilDistance: Number(params['Block Recoil Distance'] || 8),
    blockResistanceCost: Number(params['Block Resistance Cost'] || 20),
    parryResistanceDamage: Number(params['Parry Resistance Damage'] || 35),
    maxResistance: Number(params['Max Resistance'] || 100),
    resistanceRecovery: Number(params['Resistance Recovery'] || 0.2),
    resistanceRecoveryDelay: Math.max(0, Number(params['Resistance Recovery Delay'] || 2)) * 60,
    hitRecoveryMultiplier: Math.max(1, Number(params['Hit Recovery Multiplier'] || 4)),
    hudVisible: String(params['CT HUD Visible'] || 'true') === 'true',
    hudX: Number(params['CT HUD X'] || 70),
    hudY: Number(params['CT HUD Y'] || 460),
    smartFade: String(params['Smart Fade'] || 'true') === 'true'
  };

  function clamp(value, maxValue) {
    return Math.max(0, Math.min(maxValue, value));
  }

  function ensureResources(battler) {
    if (battler._parryResistance == null) battler._parryResistance = settings.maxResistance;
    if (battler._parryMaxResistance == null) battler._parryMaxResistance = settings.maxResistance;
    if (battler._parryWindow == null) battler._parryWindow = 0;
    if (battler._parryStunFrames == null) battler._parryStunFrames = 0;
    if (battler._parryGuarding == null) battler._parryGuarding = false;
    if (battler._parryRecovering == null) battler._parryRecovering = false;
    if (battler._parryRecoveryWait == null) battler._parryRecoveryWait = 0;
    if (battler._parryHitRecovery == null) battler._parryHitRecovery = false;
    if (battler._parryBlocked == null) battler._parryBlocked = false;
    if (battler._parryPerfect == null) battler._parryPerfect = false;
    if (battler._parryStunnedBeforeHit == null) battler._parryStunnedBeforeHit = false;
  }

  var aliasGameBattlerInitMembers = Game_Battler.prototype.initMembers;
  Game_Battler.prototype.initMembers = function() {
    aliasGameBattlerInitMembers.call(this);
    this._parryResistance = settings.maxResistance;
    this._parryMaxResistance = settings.maxResistance;
    this._parryWindow = 0;
    this._parryStunFrames = 0;
    this._parryGuarding = false;
    this._parryRecovering = false;
    this._parryRecoveryWait = 0;
    this._parryHitRecovery = false;
    this._parryBlocked = false;
    this._parryPerfect = false;
    this._parryStunnedBeforeHit = false;
  };

  Game_Battler.prototype.parryResistance = function() {
    ensureResources(this);
    return this._parryResistance;
  };

  Game_Battler.prototype.maxParryResistance = function() {
    ensureResources(this);
    return this._parryMaxResistance;
  };

  Game_Battler.prototype.applyResistanceDamage = function(amount) {
    ensureResources(this);
    if (this.isEnemy() && this._parryRecovering) return;
    this._parryResistance = clamp(this._parryResistance - amount, this._parryMaxResistance);
    if (this._parryResistance <= 0) {
      this._parryStunFrames = 1;
      this._parryGuarding = false;
      this._parryWindow = 0;
      this._parryRecoveryWait = settings.resistanceRecoveryDelay;
      this._parryHitRecovery = false;
      if (this.isEnemy()) this._parryRecovering = true;
    }
  };

  var aliasGameBattlerUpdateABS = Game_Battler.prototype.updateABS;
  Game_Battler.prototype.updateABS = function() {
    ensureResources(this);
    if (this._parryWindow > 0) this._parryWindow--;
    if (this._parryResistance < this._parryMaxResistance) {
      if (this._parryRecoveryWait > 0) {
        this._parryRecoveryWait--;
      } else if (!this._parryGuarding) {
        var recoveryRate = settings.resistanceRecovery;
        if (this.isActor() && this._parryHitRecovery) {
          recoveryRate *= settings.hitRecoveryMultiplier;
        }
        this._parryResistance = Math.min(this._parryMaxResistance,
          this._parryResistance + recoveryRate);
      }
    }
    if (this._parryResistance >= this._parryMaxResistance) {
      this._parryRecovering = false;
      this._parryRecoveryWait = 0;
      this._parryHitRecovery = false;
      this._parryStunFrames = 0;
    }
    aliasGameBattlerUpdateABS.call(this);
  };

  var aliasIsStunned = Game_Battler.prototype.isStunned;
  Game_Battler.prototype.isStunned = function() {
    ensureResources(this);
    return this._parryStunFrames > 0 || aliasIsStunned.call(this);
  };

  var aliasPlayerUpdateABS = Game_Player.prototype.updateABS;
  Game_Player.prototype.updateABS = function() {
    aliasPlayerUpdateABS.call(this);
    var battler = this.battler();
    if (!battler) return;
    ensureResources(battler);
    var guardSkill = this.guardSkill();
    var guarding = Input.isPressed(settings.guardInput) && !!guardSkill && !battler.isStunned();
    if (guarding && Input.isTriggered(settings.guardInput)) {
      battler._parryWindow = settings.parryWindow;
    }
    if (guarding && !battler._parryGuarding) this.startGuardPose(guardSkill);
    if (!guarding && (battler._parryGuarding || this._parryGuardPose)) this.endGuardPose();
    battler._parryGuarding = guarding;
    if (!guarding) battler._parryWindow = 0;
  };

  Game_Player.prototype.guardSkill = function() {
    var battler = this.battler();
    if (!battler || !battler.isActor()) return null;
    if (settings.guardSkillId > 0) {
      return battler.isLearnedSkill(settings.guardSkillId) ? $dataSkills[settings.guardSkillId] : null;
    }
    var skills = battler.skills();
    for (var i = 0; i < skills.length; i++) {
      if (skills[i].qmeta && Object.prototype.hasOwnProperty.call(skills[i].qmeta, 'parryGuard')) {
        return skills[i];
      }
    }
    return null;
  };

  Game_Player.prototype.startGuardPose = function(skill) {
    if (!Imported.QSprite || typeof this.loopPose !== 'function') return;
    var pose = skill.qmeta && skill.qmeta.guardPose || settings.guardPose;
    if (!pose || typeof this.hasPose !== 'function') return;
    var direction = this.direction();
    var poseName = this.hasPose(pose + direction) ? pose + direction : pose;
    if (poseName === pose && !this.hasPose(pose)) {
      if (this.hasPose(pose + 4)) poseName = pose + 4;
      else if (this.hasPose(pose + 6)) poseName = pose + 6;
      else return;
    }
    this._parryGuardPose = poseName;
    this.loopPose(poseName, settings.guardPoseLocksMovement, false);
  };

  Game_Player.prototype.endGuardPose = function() {
    if (!this._parryGuardPose) return;
    if (Imported.QSprite && typeof this.clearPose === 'function') this.clearPose();
    this._parryGuardPose = null;
  };

  if (Game_Player.prototype.playPose) {
    var aliasPlayerPlayPose = Game_Player.prototype.playPose;
    Game_Player.prototype.playPose = function(pose) {
      var battler = this.battler();
      if (battler && battler._parryGuarding && /^(damage|hurt)([2468])?$/i.test(String(pose))) {
        return;
      }
      return aliasPlayerPlayPose.apply(this, arguments);
    };
  }

  var aliasMakeDamageValue = Game_Action.prototype.makeDamageValue;
  Game_Action.prototype.makeDamageValue = function(target, critical) {
    var value = aliasMakeDamageValue.call(this, target, critical);
    var attacker = this.subject();
    if (!target || value <= 0) return value;
    var item = this.item();
    var resistanceDamage = item && item.meta ? Math.max(0, Number(item.meta.resistanceDamage) || 0) : 0;
    ensureResources(target);
    target._parryStunnedBeforeHit = target.isStunned();
    target._parryBlocked = false;
    target._parryPerfect = false;
    if (this.isPhysical() && target._parryGuarding && !target.isStunned()) {
      if (target._parryWindow > 0 && attacker && attacker !== target) {
        target._parryWindow = 0;
        target._parryPerfect = true;
        attacker.applyResistanceDamage(settings.parryResistanceDamage);
        var guardSkill = Game_Player.prototype.guardSkill.call($gamePlayer);
        var animationId = Number(guardSkill && guardSkill.qmeta && guardSkill.qmeta.parryAnimation) ||
          settings.parryAnimation;
        if (animationId > 0) {
          var character = QPlus.getCharacter(target._charaId);
          if (character) QABSManager.startAnimation(animationId, character.cx(), character.cy());
        }
        return 0;
      }
      target._parryBlocked = true;
      target.applyResistanceDamage(settings.blockResistanceCost);
      if (resistanceDamage > 0) target.applyResistanceDamage(resistanceDamage);
      return Math.round(value * settings.blockDamageRate);
    }
    if (resistanceDamage > 0) target.applyResistanceDamage(resistanceDamage);
    return value;
  };

  var aliasExecuteDamage = Game_Action.prototype.executeDamage;
  Game_Action.prototype.executeDamage = function(target, value) {
    var wasAlreadyStunned = target && target._parryStunnedBeforeHit;
    var wasBlocked = target && target._parryBlocked;
    var wasPerfectParry = target && target._parryPerfect;
    if (target) {
      target._parryStunnedBeforeHit = false;
      target._parryBlocked = false;
      target._parryPerfect = false;
    }
    aliasExecuteDamage.call(this, target, value);
    if (target && target.isActor() && wasAlreadyStunned && target._parryStunFrames > 0 && value > 0) {
      target._parryStunFrames = 0;
      target._parryRecoveryWait = 0;
      target._parryHitRecovery = true;
    }
    if (wasBlocked && !wasPerfectParry && value > 0 && target === $gamePlayer.battler()) {
      applyBlockRecoil(this.subject());
    }
  };

  function applyBlockRecoil(attackerBattler) {
    if (!$gamePlayer.battler() || $gamePlayer.battler().isStunned()) return;
    var attacker = attackerBattler && QPlus.getCharacter(attackerBattler._charaId);
    if (!attacker || attacker === $gamePlayer || settings.blockRecoilDistance <= 0) return;
    var dx = $gamePlayer.cx() - attacker.cx();
    var dy = $gamePlayer.cy() - attacker.cy();
    var length = Math.sqrt(dx * dx + dy * dy) || 1;
    var x = $gamePlayer.px + dx / length * settings.blockRecoilDistance;
    var y = $gamePlayer.py + dy / length * settings.blockRecoilDistance;
    var position = $gamePlayer.adjustPosition(x, y);
    $gamePlayer.pixelJump(position.x - $gamePlayer.px, position.y - $gamePlayer.py);
  }

  function isGuardingPlayerTarget(sequencer, target) {
    var battler = $gamePlayer.battler();
    return target === $gamePlayer && battler &&
      (battler._parryGuarding || battler.isStunned());
  }

  var aliasTargetMove = Skill_Sequencer.prototype.targetMove;
  Skill_Sequencer.prototype.targetMove = function(action, targets) {
    var filteredTargets = targets.filter(function(target) {
      return !isGuardingPlayerTarget(this, target);
    }, this);
    aliasTargetMove.call(this, action, filteredTargets);
  };

  var aliasTargetJump = Skill_Sequencer.prototype.targetJump;
  Skill_Sequencer.prototype.targetJump = function(action, targets) {
    var filteredTargets = targets.filter(function(target) {
      return !isGuardingPlayerTarget(this, target);
    }, this);
    aliasTargetJump.call(this, action, filteredTargets);
  };

  function isStationaryEnemy(character) {
    var battler = character && typeof character.battler === 'function' ? character.battler() : null;
    return !!(battler && battler.isEnemy() && battler.enemy().qmeta.stationary);
  }

  var aliasAISimpleAction = Game_Event.prototype.AISimpleAction;
  Game_Event.prototype.AISimpleAction = function(bestTarget, bestAction) {
    if (isStationaryEnemy(this) && !bestAction) return;
    aliasAISimpleAction.call(this, bestTarget, bestAction);
  };

  var aliasMoveTowardCharacter = Game_Event.prototype.moveTowardCharacter;
  Game_Event.prototype.moveTowardCharacter = function(character) {
    if (isStationaryEnemy(this)) return;
    aliasMoveTowardCharacter.call(this, character);
  };

  var aliasUpdateSelfMovement = Game_Event.prototype.updateSelfMovement;
  Game_Event.prototype.updateSelfMovement = function() {
    if (isStationaryEnemy(this)) return;
    aliasUpdateSelfMovement.call(this);
  };

  var stationaryUserActions = ['userMove', 'userMoveHere', 'userJump', 'userJumpHere', 'userTeleport'];
  for (var i = 0; i < stationaryUserActions.length; i++) {
    (function(actionName) {
      var aliasAction = Skill_Sequencer.prototype[actionName];
      Skill_Sequencer.prototype[actionName] = function() {
        if (isStationaryEnemy(this._character)) return;
        return aliasAction.apply(this, arguments);
      };
    })(stationaryUserActions[i]);
  }

  var aliasGameSystemInit = Game_System.prototype.initialize;
  Game_System.prototype.initialize = function() {
    aliasGameSystemInit.call(this);
    this._ctHud_visible = settings.hudVisible;
  };

  var aliasPluginCommand = Game_Interpreter.prototype.pluginCommand;
  Game_Interpreter.prototype.pluginCommand = function(command, args) {
    aliasPluginCommand.call(this, command, args);
    if (String(command).toLowerCase() === 'ct_hud_visible') {
      $gameSystem._ctHud_visible = String(args[0]).toLowerCase() === 'true';
    }
  };

  function ParryCTHud() {
    this.initialize.apply(this, arguments);
  }

  ParryCTHud.prototype = Object.create(Sprite.prototype);
  ParryCTHud.prototype.constructor = ParryCTHud;

  ParryCTHud.prototype.initialize = function() {
    Sprite.prototype.initialize.call(this);
    this._layoutImage = ImageManager.loadBitmap('img/chrono/', 'CT_Layout', 0, true);
    this._meterImage = ImageManager.loadBitmap('img/chrono/', 'CT_Meter', 0, true);
    this._numberImage = ImageManager.loadBitmap('img/chrono/', 'CT_Number', 0, true);
    this._motion = SceneManager.isPreviousScene(Scene_Menu) ? 'shown' : 'hidden';
    this._velocity = 0;
    this._ready = false;
    this._fadeLimit = settings.smartFade ? 90 : 255;
    this.x = this._motion === 'shown' ? settings.hudX : this.hiddenX();
    this.y = settings.hudY;
    this.opacity = 255;
    this.visible = false;
  };

  ParryCTHud.prototype.battler = function() {
    return $gameParty.leader();
  };

  ParryCTHud.prototype.hiddenX = function() {
    var width = this._layoutImage && this._layoutImage.width || 280;
    return -(settings.hudX + width + 1);
  };

  ParryCTHud.prototype.createHudSprites = function() {
    this._layout = new Sprite(this._layoutImage);
    this.addChild(this._layout);
    this._ctGauge = new Sprite(this._meterImage);
    this._ctGauge.x = 35;
    this._ctGauge.y = 25;
    this.addChild(this._ctGauge);
    this._numbers = [];
    for (var i = 0; i < 3; i++) {
      this._numbers[i] = new Sprite(this._numberImage);
      this._numbers[i].y = 3;
      this.addChild(this._numbers[i]);
    }
    this._ready = true;
    this.refreshGauges();
  };

  ParryCTHud.prototype.refreshGauges = function() {
    var battler = this.battler();
    if (!battler || !this._ready) return;
    ensureResources(battler);
    var flow = this._meterImage.width / 3;
    var height = this._meterImage.height / 3;
    var rate = battler._parryResistance / battler._parryMaxResistance;
    var colorRow = rate <= 0.3 ? 1 : 0;
    this._ctGauge.setFrame(0, height * colorRow, flow * rate, height);
    var resistanceNumber = Math.floor(rate * 100);
    var digits = String(resistanceNumber).split('');
    var digitWidth = this._numberImage.width / 10;
    for (var i = 0; i < this._numbers.length; i++) {
      var numberSprite = this._numbers[i];
      numberSprite.visible = i < digits.length;
      if (!numberSprite.visible) continue;
      var digit = Number(digits[i]);
      numberSprite.setFrame(digit * digitWidth, 0, digitWidth, this._numberImage.height);
      numberSprite.x = 155 - digitWidth * (digits.length - i);
    }
  };

  ParryCTHud.prototype.shouldHide = function() {
    if ($gameSystem._ctHud_visible == null) $gameSystem._ctHud_visible = settings.hudVisible;
    return !$gameSystem._ctHud_visible || $gameMessage.isBusy() || !this.battler();
  };

  ParryCTHud.prototype.shouldFade = function() {
    if (!settings.smartFade || !$gamePlayer || !this._layoutImage.isReady()) return false;
    var left = settings.hudX - $gameMap.tileWidth() / 2;
    var right = settings.hudX + this._layoutImage.width - $gameMap.tileWidth();
    var top = settings.hudY - $gameMap.tileHeight();
    var bottom = settings.hudY + this._layoutImage.height;
    return $gamePlayer.screen_realX() >= left && $gamePlayer.screen_realX() <= right &&
      $gamePlayer.screen_realY() >= top && $gamePlayer.screen_realY() <= bottom;
  };

  ParryCTHud.prototype.updateVisibility = function() {
    if (this.shouldHide()) {
      if (this._motion === 'shown' || this._motion === 'entering') this._motion = 'exiting';
      if (this._motion === 'exiting') {
        this.x -= Math.max(6, (this.x - this.hiddenX()) * 0.18);
        if (this.x <= this.hiddenX()) {
          this.x = this.hiddenX();
          this._motion = 'hidden';
          this.visible = false;
        }
      }
      return;
    }
    this.visible = true;
    if (this._motion === 'hidden' || this._motion === 'exiting') {
      this._motion = 'entering';
      this._velocity = 0;
    }
    if (this._motion === 'entering') {
      this._velocity += (settings.hudX - this.x) * 0.4;
      this._velocity *= 0.3;
      this.x += this._velocity;
      if (Math.abs(this.x - settings.hudX) < 1 && Math.abs(this._velocity) < 1) {
        this.x = settings.hudX;
        this._motion = 'shown';
      }
    }
    this.opacity = this.shouldFade() ? this._fadeLimit : 255;
  };

  ParryCTHud.prototype.update = function() {
    Sprite.prototype.update.call(this);
    if (!this.battler()) return;
    if (!this._ready) {
      if (this._layoutImage.isReady() && this._meterImage.isReady() && this._numberImage.isReady()) {
        this.createHudSprites();
        this.x = this._motion === 'shown' ? settings.hudX : this.hiddenX();
      } else {
        return;
      }
    }
    this.refreshGauges();
    this.updateVisibility();
  };

  var aliasCreateSpriteset = Scene_Map.prototype.createSpriteset;
  Scene_Map.prototype.createSpriteset = function() {
    aliasCreateSpriteset.call(this);
    if (!this._hudField) {
      this._hudField = new Sprite();
      this._hudField.z = 10;
      this.addChild(this._hudField);
    }
    this._parryCTHud = new ParryCTHud();
    this._parryCTHud.mz = 110;
    this._hudField.addChild(this._parryCTHud);
    this._hudField.children.sort(function(a, b) { return a.mz - b.mz; });
  };

  function ResistanceGauge() {
    this.initialize.apply(this, arguments);
  }

  ResistanceGauge.prototype = Object.create(Sprite.prototype);
  ResistanceGauge.prototype.constructor = ResistanceGauge;

  ResistanceGauge.prototype.initialize = function() {
    Sprite.prototype.initialize.call(this, new Bitmap(42, 6));
    this.anchor.x = 0.5;
    this.y = -54;
    this._lastRate = -1;
    this._lastStunned = false;
  };

  ResistanceGauge.prototype.updateForBattler = function(battler) {
    ensureResources(battler);
    var rate = battler._parryResistance / battler._parryMaxResistance;
    var stunned = battler._parryStunFrames > 0;
    this.visible = true;
    if (rate === this._lastRate && stunned === this._lastStunned) return;
    this._lastRate = rate;
    this._lastStunned = stunned;
    this.bitmap.clear();
    this.bitmap.fillRect(0, 0, 42, 6, '#171b20');
    this.bitmap.fillRect(1, 1, 40 * rate, 4, stunned ? '#e76f51' : '#57c785');
  };

  var aliasSpriteCharacterInit = Sprite_Character.prototype.initMembers;
  Sprite_Character.prototype.initMembers = function() {
    aliasSpriteCharacterInit.call(this);
    this._parryResistanceGauge = new ResistanceGauge();
    this.addChild(this._parryResistanceGauge);
  };

  var aliasSpriteCharacterUpdate = Sprite_Character.prototype.update;
  Sprite_Character.prototype.update = function() {
    aliasSpriteCharacterUpdate.call(this);
    var character = this._character;
    var battler = character && typeof character.battler === 'function' ? character.battler() : null;
    var showResistance = battler && battler.isEnemy && battler.isEnemy();
    this._parryResistanceGauge.visible = !!showResistance;
    if (showResistance) this._parryResistanceGauge.updateForBattler(battler);
  };
})();