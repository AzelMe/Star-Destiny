//=============================================================================
// MOG_ChronoCT.js
//=============================================================================

/*:
 * @plugindesc (v1.1) Adiciona o sistema de CT.
 * https://mogplugins.com
 * @author Moghunter
 *
 * @param Initial Visible
 * @desc Ativar a Hud de CT no inicio do jogo.
 * @default true
 *
 * @param Dash Cost
 * @desc Ativar o custo de Dash.
 * @default true
 *
 * @param Full SE
 * @desc Definição do SE quando a barra chegar ao máximo.
 * @default 
 *
 * @param Smart Fade
 * @desc Deixar a Hud semitransparente quando o personagem se aproximar da hud.
 * @default true
 *
 * @param Slant Animation
 * @desc Ativar a animação de gradiente no medidor de CT.
 * @default true
 *
 * @param Hud X-Axis
 * @desc Definição X-axis da hud de CT.
 * @default 70
 *
 * @param Hud Y-Axis
 * @desc Definição Y-axis da hud de CT.
 * @default 460
 *
 * @param Number X-Axis
 * @desc Definição X-axis do valor de CT.
 * @default 155
 *
 * @param Number Y-Axis
 * @desc Definição Y-axis do valor de CT.
 * @default 3
 *
 * @param Parry Key
 * @desc Input name held to block. Default: control
 * @default control
 *
 * @param Perfect Parry Window
 * @desc Frames after pressing the block key that count as a perfect parry.
 * @default 8
 *
 * @param Blocked Damage Rate
 * @desc Percent of incoming damage that remains while blocking.
 * @default 25
 *
 * @param Block Energy Cost
 * @desc CT energy consumed by each blocked hit.
 * @default 20
 *
 * @param Enemy Resistance
 * @desc Default resistance for enemies without a parryResistance notetag.
 * @default 100
 *
 * @param Perfect Parry Resistance Cost
 * @desc Enemy resistance removed by each perfect parry.
 * @default 35
 *
 * @param Stun Duration
 * @desc Frames a battler remains stunned after its energy or resistance reaches 0.
 * @default 90
 *
 * @help  
 * =============================================================================
 * +++ MOG - Chrono CT System (v1.1) +++
 * By Moghunter 
 * https://mogplugins.com
 * =============================================================================
 * Adiciona o parâmetro de CT, semelhante ao MP o parâmetro CT é recuperado a
 * cada segundo, esse parâmetro é usado nas ações do personagem como atacar,
 * usar item, correr,etc...
 *
 * =============================================================================
 * PLUGIN COMMANDS
 * =============================================================================
 * 
 * ct_hud_visible : true
 * - Ativa ou desativa a hud de CT.
 *
 * dash_ct_cost : true
 * - Ativa ou desativa o custo de CT para o Dash.
 *
 * action_ct_cost : true
 * - Ativa ou desativa o custo de CT para a ação. 
 *
 * =============================================================================
 * QABS PARRY
 * =============================================================================
 * Hold the configured Parry Key to block. A hit within Perfect Parry Window
 * frames after pressing the key deals no damage and reduces enemy resistance.
 * Other blocked hits deal the configured damage rate and consume CT energy.
 * Enemies can set their resistance with <parryResistance:150>.
 * When player energy or enemy resistance reaches zero, that battler is stunned.
 *
 * =============================================================================
 * EVENT COMMENTS (TOOL EVENTS)
 * =============================================================================
 * 
 * tool_ct_cost : VALUE
 * - Define um custo de CT para a ação.
 *
 * =============================================================================
 * HISTÓRICO
 * =============================================================================
 * (v1.1) - Correção do plugin parameters não funcionarem.
 *
 */

//=============================================================================
// ** PLUGIN PARAMETERS
//=============================================================================
　　var Imported = Imported || {};
　　Imported.MOG_CTSystem = true;
　　var Moghunter = Moghunter || {}; 	

	Moghunter.parameters = PluginManager.parameters('MOG_ChronoCT');
	Moghunter.chronoCT_hudvisible = String(Moghunter.parameters['Initial Visible'] || "true");
	Moghunter.chronoCT_dash = String(Moghunter.parameters['Dash Cost'] || "true");
	Moghunter.chronoCT_fullSE = String(Moghunter.parameters['Full SE'] || '');
	Moghunter.chronoCT_smartFade = String(Moghunter.parameters['Smart Fade'] || "true");
	Moghunter.chronoCT_slant = String(Moghunter.parameters['Slant Animation'] || "true");
	Moghunter.chronoCT_hudX = Number(Moghunter.parameters['Hud X-Axis'] || 70);	
	Moghunter.chronoCT_hudY = Number(Moghunter.parameters['Hud Y-Axis'] || 460);	
	Moghunter.chronoCT_numberX = Number(Moghunter.parameters['Number X-Axis'] || 155);	
	Moghunter.chronoCT_numberY = Number(Moghunter.parameters['Number Y-Axis'] || 3);
	Moghunter.chronoCT_parryKey = String(Moghunter.parameters['Parry Key'] || 'control');
	Moghunter.chronoCT_parryWindow = Number(Moghunter.parameters['Perfect Parry Window'] || 8);
	Moghunter.chronoCT_blockDamageRate = Number(Moghunter.parameters['Blocked Damage Rate'] || 25) / 100;
	Moghunter.chronoCT_blockCost = Number(Moghunter.parameters['Block Energy Cost'] || 20);
	Moghunter.chronoCT_enemyResistance = Number(Moghunter.parameters['Enemy Resistance'] || 100);
	Moghunter.chronoCT_enemyResistanceCost = Number(Moghunter.parameters['Perfect Parry Resistance Cost'] || 35);
	Moghunter.chronoCT_stunDuration = Number(Moghunter.parameters['Stun Duration'] || 90);

	if (!ImageManager.loadRas) {
		ImageManager.loadRas = function(filename) {
			return this.loadBitmap('img/chrono/', filename, 0, true);
		};
	}
	
//=============================================================================
// ** Game System
//=============================================================================

//==============================
// * chrono Initialize
//==============================
var _mog_chronoCT_sys_chronoInitialize = Game_System.prototype.chronoInitialize;
Game_System.prototype.chronoInitialize = function() {
    _mog_chronoCT_sys_chronoInitialize.call(this);
	this._ctHud_visible = String(Moghunter.chronoCT_hudvisible) === "true" ? true : false;
	this._ctHud_smartFade = String(Moghunter.chronoCT_smartFade) === "true" ? true : false;
	this._ctDashEnabled = String(Moghunter.chronoCT_dash) === "true" ? true : false;
	this._ctHud_CTCost = true;
};

//=============================================================================
// ** Game Interpreter
//=============================================================================	

//==============================
// * Set Chrono Interpreter
//==============================
var _mog_chrono_ctSystem_setChronoInterpreter = Game_Interpreter.prototype.setChronoInterpreter;
Game_Interpreter.prototype.setChronoInterpreter = function(command, args) {
	_mog_chrono_ctSystem_setChronoInterpreter.call(this,command, args);
	if (command === "ct_hud_visible")  {
		var value = String(args[1]) == "true" ? true : false;
		$gameSystem._ctHud_visible = value;
	} else if (command === "dash_ct_cost")  {
		var value = String(args[1]) == "true" ? true : false;
		$gameSystem._ctDashEnabled = value;
	} else if (command === "action_ct_cost")  {
		var value = String(args[1]) == "true" ? true : false;
		$gameSystem._ctHud_CTCost = value;
	};	
};

//=============================================================================
// ** Game Battler
//=============================================================================	
	
//==============================
// * tool Sys Init Battler
//==============================
var _mog_ctSys_gBat_toolSysInitBattler = Game_Battler.prototype.toolSysInitBattler;
Game_Battler.prototype.toolSysInitBattler = function() {	
    _mog_ctSys_gBat_toolSysInitBattler.call(this);
	this._chrono.ct = 100;
	this._chrono.maxct = 100;
	this._chrono.ctFd = 0;
	this._chrono.ctSpeed = 1;
	this._chrono.ctDashLimit = 30;
	this._chrono.ctDash = 0;
	this._chrono.ctWait = 0;
	this._chrono.ctWaitDash = 0;
	this._chrono.ctIsDashing = false;
};	
	
//==============================
// * Update Ras Battler
//==============================
var _mog_chronoCT_gcharBase_updateRasBattler = Game_CharacterBase.prototype.updateRasBattler;
Game_CharacterBase.prototype.updateRasBattler = function() {
	_mog_chronoCT_gcharBase_updateRasBattler.call(this);
	this.updateCTBattler();
};
	
//==============================
// * Update CT Battler
//==============================
Game_CharacterBase.prototype.updateCTBattler = function() {
	if (this.battler()._chrono.ctIsDashing != this.isDashing()) {
	    if (!this.battler().canActionCTBase() && !this.isDashing()) {
			this.battler()._chrono.ctWait = 10;
		} else if (!this.battler()._chrono.ctIsDashing && this.isDashing()) {
			this.battler()._chrono.ctWaitDash = 20;
		};
	};
	this.battler()._chrono.ctIsDashing = this.isDashing();
};	
	
//==============================
// * ct 
//==============================
Game_Battler.prototype.ct = function() {
	return this._chrono.ct;
};

//==============================
// * max CT
//==============================
Game_Battler.prototype.maxCt = function() {
	return this._chrono.maxct;
};

//==============================
// * ct Speed
//==============================
Game_Battler.prototype.ctSpeed = function() {
	return this._chrono.ctSpeed;
};

//==============================
// * ct Dash Limit
//==============================
Game_Battler.prototype.ctDashLimit = function() {
	return this._chrono.ctDashLimit ;
};

//==============================
// * is CT Max
//==============================
Game_Battler.prototype.isCTMax = function() {
	return this.ct() >= this.maxCt();
};

//==============================
// * is CT Per
//==============================
Game_Battler.prototype.ctPer = function() {
	return Math.floor((this.ct() / this.maxCt()) * 100);
};


//==============================
// * can Action CT Base
//==============================
Game_Battler.prototype.canActionCTBase = function() {
	return this.ctPer() >= this.ctDashLimit();
};	

//=============================================================================
// ** Tool Event
//=============================================================================

if (typeof ToolEvent !== 'undefined') {

//==============================
// * Can Pay CT Cost
//==============================
ToolEvent.prototype.canPayCTCost = function() {
	if (this._tool.ctCost === 0) {return true};
	if (!$gameSystem._ctHud_CTCost) {return true};
	if (this.user().battler().isEnemy()) {return true};
	if (this.user().battler().ct() < this._tool.ctCost) {return false};
	if (this.user().battler().isChargeMax()) {	return true};
	if (!this.user().battler().canActionCTBase()) {return false};
	return true;
};

//==============================
// * Pay CT Cost
//==============================
ToolEvent.prototype.payCTCost = function() {
   this.user().battler()._chrono.ct -= this._tool.ctCost;
   if (this.user().battler()._chrono.ct < 0) {this.user().battler()._chrono.ct = 0};
   if (!this.user().battler().isChargeMax() && !this.user().battler().canActionCTBase()) {this.user().battler()._chrono.ctWait = 15};
};
}

//=============================================================================
// ** Game Player
//=============================================================================

//==============================
// ** move by Input
//==============================
var _mog_chronoCT_gplayer_moveByInput = Game_Player.prototype.moveByInput;
Game_Player.prototype.moveByInput = function() {
	_mog_chronoCT_gplayer_moveByInput.call(this);
	if (this.battler()) {this.updateChronoCT()};
};

//==============================
// ** is Dashing
//==============================
Game_Player.prototype.isDashing = function() {
	if (!$gameSystem._ctDashEnabled) {return this._dashing};
	if (!this.battler()) {return this._dashing};
	if (this.battler()._chrono.ctWaitDash > 0 && this._dashing) {return true};
	if (!this.battler().canActionCTBase()) {return false};
	if (this.battler()._chrono.ctWait > 0) {return false};
    return this._dashing;
};


//=============================================================================
// ** Game Character Base
//=============================================================================

//==============================
// ** update Chrono CT
//==============================
Game_CharacterBase.prototype.updateChronoCT = function() {
	this.battler()._chrono.ctFd++;
	if (this.battler()._chrono.ctDash > 0) {this.battler()._chrono.ctDash--};
	if (this.battler()._chrono.ctWaitDash > 0) {this.battler()._chrono.ctWaitDash--};
	if (this.battler()._chrono.ctFd > 1) {this.updateCTUP()};
};

//==============================
// ** need Dash Cost
//==============================
Game_CharacterBase.prototype.needDashCost = function() {	
    if (!$gameSystem._ctDashEnabled) {return false};
    if (!this.isDashing()) {return false};
    if (this.isMoving()) {return true};
	if (this.battler()._chrono.ctDash > 0) {return true};
	return false;
};

//==============================
// ** update CT UP
//==============================
Game_CharacterBase.prototype.updateCTUP = function() {	
    this.battler()._chrono.ctFd = 0;
	if (this.needDashCost()) {
		if (this.isMoving()) {this.battler()._chrono.ctDash = 10};
	    this.battler()._chrono.ct -= 1;
	} else if (this.needUpdateCTUP()) {
		if (!this.battler().isCTMax()) {
	        this.battler()._chrono.ct += this.battler().ctSpeed();
			if (this.battler().isCTMax()) {
			    if (SoundManager.playSoundMX) {SoundManager.playSoundMX(Moghunter.chronoCT_fullSE)};
			};
		};
	};
	if (this.battler()._chrono.ct > this.battler().maxCt()) {
		this.battler()._chrono.ct = this.battler().maxCt();
	} else if (this.battler()._chrono.ct < 0) {
		this.battler()._chrono.ct = 0;
	};
	if (this.battler()._chrono.ctWait > 0) {this.battler()._chrono.ctWait--};
	if (this.battler()._chrono.ct <= 0 && !this.battler()._ctEmptyStunApplied) {
		this.battler()._ctEmptyStunApplied = true;
		chronoParryStun(this.battler());
	} else if (this.battler()._chrono.ct > 0) {
		this.battler()._ctEmptyStunApplied = false;
	}
};

//==============================
// ** need UpdateCT UP
//==============================
Game_CharacterBase.prototype.needUpdateCTUP = function() {
    if (this.battler().isCTMax()) {return false};
	if (this.battler()._chrono.ctWait > 0) {return false};
	if (this.battler().isCastingC && this.battler().isCastingC()) {return false};
	if (this.battler().isCharging && this.battler().isCharging()) {return false};
	if ($gameTemp._autoTarget && $gameTemp._autoTarget.enabled) {return false};
	return true;
};
	
//=============================================================================
// ** Scene Base
//=============================================================================

//==============================
// ** create Hud Field
//==============================
Scene_Base.prototype.createHudField = function() {
	this._hudField = new Sprite();
	this._hudField.z = 10;
	this.addChild(this._hudField);
};

//==============================
// ** sort MZ
//==============================
Scene_Base.prototype.sortMz = function() {
   this._hudField.children.sort(function(a, b){return a.mz-b.mz});
};

//=============================================================================
// ** Scene Map
//=============================================================================	

//==============================
// ** create Spriteset
//==============================
var _mog_chronoCT_sMap_createSpriteset = Scene_Map.prototype.createSpriteset;
Scene_Map.prototype.createSpriteset = function() {
	_mog_chronoCT_sMap_createSpriteset.call(this);
	if (!this._hudField) {this.createHudField()};
    this.createCreateCTHud();
	this.sortMz();	
};

//==============================
// * create CT Hud
//==============================
Scene_Map.prototype.createCreateCTHud = function() {
	this._ctHud = new CTSysHud();
	this._ctHud.mz = 110;
	this._hudField.addChild(this._ctHud);	
};


//=============================================================================
// * Sprite Skill Name
//=============================================================================
function CTSysHud() {
    this.initialize.apply(this, arguments);
};

CTSysHud.prototype = Object.create(Sprite.prototype);
CTSysHud.prototype.constructor = CTSysHud;

//==============================
// * Initialize
//==============================
CTSysHud.prototype.initialize = function() {
    Sprite.prototype.initialize.call(this);	
	this.setup();
    this.loadBitmap();
	this.createSprites();
	this.visible = false;
	this._motion = 'hidden';
	this.x = this.hiddenHudX();
	this.update();
};

//==============================
// * Setup
//==============================
CTSysHud.prototype.setup = function() {
	this._hud_size = [-1,0,0,0];
	this._gauge_flow = [false,0,0,0];
	this._fadeLimit = $gameSystem._ctHud_smartFade ? 90 : 255;
	this._fadeH = [0,0];
	this._homeX = Moghunter.chronoCT_hudX;
	this._velocity = 0;
	this.x = this._homeX;
	this.y = Moghunter.chronoCT_hudY;
};

//==============================
// * Load Bitmap
//==============================
CTSysHud.prototype.loadBitmap = function() {
	this._layoutImg = ImageManager.loadRas("CT_Layout"); 
	this._gaugeImg = ImageManager.loadRas("CT_Meter"); 
	this._numberImg = ImageManager.loadRas("CT_Number"); 
};

//==============================
// * Battler
//==============================
CTSysHud.prototype.battler = function() {
    return $gameParty.leader();
};

//==============================
// * Value
//==============================
CTSysHud.prototype.value = function() {
	if (this.battler().isCastingC && this.battler().isCastingC() && this.battler()._ras) {
		return this.battler()._ras.cast.duration;
	} else if (this.battler().isCharging && this.battler().isCharging() && this.battler()._ras) {
		return this.battler()._ras.charge.time;
	} else {
        return this.battler().ct();
	};
};
//==============================
// * Value
//==============================
CTSysHud.prototype.maxValue = function() {
	if (this.battler().isCastingC && this.battler().isCastingC() && this.battler()._ras) {
		return this.battler()._ras.cast.maxDuration;
	} else if (this.battler().isCharging && this.battler().isCharging() && this.battler()._ras) {
		return this.battler()._ras.charge.maxtime;		
	} else {	
		return this.battler().maxCt();
	};
};

//==============================
// * get Data
//==============================
CTSysHud.prototype.getData = function() {
	this._hud_size[0] = this._homeX - ($gameMap.tileWidth() / 2);
    this._hud_size[1] = this.y - $gameMap.tileHeight();
	this._hud_size[2] = this._homeX + this._layoutImg.width - $gameMap.tileWidth();
    this._hud_size[3] = this.y + this._layoutImg.height;
	this._gauge_flow[0] = String(Moghunter.chronoCT_slant) == "true" ? true : false;
	this._gauge.cw = this._gauge_flow[0] ? this._gaugeImg.width / 3 : this._gaugeImg.width;
	this._gauge.ch = this._gaugeImg.height / 3;
	this._gauge_flow[2] = this._gauge.cw;
	this._gauge_flow[3] = this._gauge_flow[2] * 2;
	this._gauge_flow[1] = Math.floor(Math.random() * this._gauge_flow[2]);	
	this._number.cw = this._numberImg .width / 10;
	this._number.ch = this._numberImg.height;
	this.x = this.hiddenHudX();
	if (this.battler()) {
	    this.refreshNumber();
		this.updateGauge();	
	};
};

//==============================
// * create Sprites
//==============================
CTSysHud.prototype.createSprites = function() {
   this.createLayout();
   this.createGauge();
   this.createNumber();
};

//==============================
// * create Layout
//==============================
CTSysHud.prototype.createLayout = function() {
   this._layout = new Sprite(this._layoutImg);
   this.addChild(this._layout);
};

//==============================
// * create Gauge
//==============================
CTSysHud.prototype.createGauge = function() {
   this._gauge = new Sprite(this._gaugeImg);
   this._gauge.x = 35;
   this._gauge.y = 25;
   this._gauge.cw = -1;
   this._gauge.ch = -1;
   this.addChild(this._gauge);
};

//==============================
// * set Gauge Color
//==============================
CTSysHud.prototype.setGaugeColor = function(h,rw) {
	if (this.battler().isCastingC && this.battler().isCastingC()) {return h * 2};
	if (this.battler().isCharging && this.battler().isCharging()) {return h * this._fadeH[0]}
	if (!this.battler().canActionCTBase()) {return h};
	return 0;
};

//==============================
// * update Gauge
//==============================
CTSysHud.prototype.updateGauge = function() {
	var h = this._gauge.ch;
	var rw = this._gauge.cw * this.value() / this.maxValue();
	var c = this.setGaugeColor(h,rw);
    if (this._gauge_flow[0]) { 
	   this._gauge.setFrame(this._gauge_flow[1],c,rw,h);	
       this._gauge_flow[1] += 1;
	   if (this._gauge_flow[1] > this._gauge_flow[3]) {this._gauge_flow[1] = 0};			
   } else {
	   this._gauge.setFrame(0,c,rw,h);
   };
};

//==============================
// * create Number
//==============================
CTSysHud.prototype.createNumber = function() {
   this._number = [];
   for (var i = 0; i < 3; i++) {
	   this._number.push(new Sprite(this._numberImg));
	   this._number[i].rx = Moghunter.chronoCT_numberX;
	   this._number[i].ry = Moghunter.chronoCT_numberY;
	   this._number[i].x = this._number[i].rx;
	   this._number[i].y = this._number[i].ry;	   
	   this._number[i].cw = -1;
	   this._number[i].ch = -1;
	   this._number[i].value = 0;
	   this._number[i].maxValue = 0;
	   this.addChild(this._number[i]);
   };
};

//==============================
// * need Refresh Number
//==============================
CTSysHud.prototype.needRefrehNumber = function() {
   if (this._number[0].value != this.value()) {return true};
   if (this._number[0].maxValue != this.maxValue()) {return true};
   return false;
};

//==============================
// * refresh Number
//==============================
CTSysHud.prototype.refreshNumber = function() {
   var w = this._numberImg.width / 10;
   var h = this._numberImg.height;
   var value = Math.floor((this.value() / this.maxValue()) * 100);
   var numbers = Math.abs(value).toString().split("");  
   for (var i = 0; i < this._number.length; i++) {
 	   this._number[i].value = this.value();
   	   this._number[i].maxValue = this.maxValue();
	   if (i >= numbers.length) {
			this._number[i].visible = false;
			continue;
		}
		this._number[i].visible = true;
	   var n = Number(numbers[i]);
	   this._number[i].setFrame(n * w, 0, w, h);
	   var nx = -(w * i) + (w * numbers.length);
	   this._number[i].x = this._number[i].rx - nx;	   
   };
};

//==============================
// * Need Hide
//==============================
CTSysHud.prototype.needHide = function() {
    if ($gameMessage.isBusy()) {return true};
	if (!$gameSystem._ctHud_visible) {return true};
	if ($gameSystem.isChronoMode && $gameSystem.isChronoMode()) {return true};
	if (!this.battler()) {return true};
	return false
};

//==============================
// * Hidden Hud X
//==============================
CTSysHud.prototype.hiddenHudX = function() {
	var width = this._layoutImg ? this._layoutImg.width : 0;
	return -(this._homeX + width + 1);
};

//==============================
// * Need Fade
//==============================
CTSysHud.prototype.needFade = function() {
    if (this._hud_size[0] === -1) {return false};
	if ($gamePlayer.screen_realX() < this._hud_size[0]) {return false};
	if ($gamePlayer.screen_realX() > this._hud_size[2]) {return false};
	if ($gamePlayer.screen_realY() < this._hud_size[1]) {return false};
	if ($gamePlayer.screen_realY() > this._hud_size[3]) {return false};	
    return true;
};

//==============================
// * Update Visible
//==============================
CTSysHud.prototype.updateVisible = function() {
	if (!this.needHide()) {
		if (this._motion === 'hidden' || this._motion === 'exiting') {
			this._motion = 'entering';
			this._velocity = 0;
		}
		this.visible = true;
		if (this._motion === 'entering') {
			this._velocity += (this._homeX - this.x) * 0.4;
			this._velocity *= 0.3;
			this.x += this._velocity;
			if (Math.abs(this._homeX - this.x) < 1 && Math.abs(this._velocity) < 1) {
				this.x = this._homeX;
				this._velocity = 0;
				this._motion = 'shown';
			}
		}
	} else {
		if (this._motion === 'entering' || this._motion === 'shown') {
			this._motion = 'exiting';
			this._velocity = 0;
		}
		if (this._motion === 'exiting') {
			var hiddenX = this.hiddenHudX();
			this.x -= Math.max(6, (this.x - hiddenX) * 0.18);
			if (this.x <= hiddenX) {
				this.x = hiddenX;
				this._motion = 'hidden';
				this.visible = false;
			}
		}
	}
	if (this.visible) {
		if (this.needFade()) {
			this.opacity = Math.max(this._fadeLimit, this.opacity - 10);
		} else {
			this.opacity = Math.min(255, this.opacity + 10);
		}
	}
};

//==============================
// * update Fade H
//==============================
CTSysHud.prototype.updateFadeH = function() {
     this._fadeH[1]++;
	 if (this._fadeH[1] < 8) {return};
	 this._fadeH[1] = 0;
	 this._fadeH[0]++;
	 if (this._fadeH[0] >= 3) {this._fadeH[0] = 0};	
};

//==============================
// * update Sprites
//==============================
CTSysHud.prototype.updateSprites = function() {
	this.updateGauge();
	this.updateVisible();
	this.updateFadeH();
	if (this.needRefrehNumber()) {this.refreshNumber()};
};

//==============================
// * Update
//==============================
CTSysHud.prototype.update = function() {
    Sprite.prototype.update.call(this);	
	if (!this.battler()) {return};
    if (this._gauge.cw < 0) {
		if (this._layoutImg.isReady() && this._gaugeImg.isReady() && this._numberImg.isReady()) {
			this.getData();
		} else {
	      return;
		};
	};
	this.updateSprites();
};

//=============================================================================
// ** Standalone CT Runtime
//=============================================================================

var _mog_ct_standalone_system_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
	_mog_ct_standalone_system_initialize.call(this);
	this._ctHud_visible = String(Moghunter.chronoCT_hudvisible) === 'true';
	this._ctHud_smartFade = String(Moghunter.chronoCT_smartFade) === 'true';
	this._ctDashEnabled = String(Moghunter.chronoCT_dash) === 'true';
	this._ctHud_CTCost = true;
};

var _mog_ct_standalone_battler_initMembers = Game_Battler.prototype.initMembers;
Game_Battler.prototype.initMembers = function() {
	_mog_ct_standalone_battler_initMembers.call(this);
	this._chrono = this._chrono || {};
	this._chrono.ct = 100;
	this._chrono.maxct = 100;
	this._chrono.ctFd = 0;
	this._chrono.ctSpeed = 1;
	this._chrono.ctDashLimit = 30;
	this._chrono.ctDash = 0;
	this._chrono.ctWait = 0;
	this._chrono.ctWaitDash = 0;
	this._chrono.ctIsDashing = false;
	this._parryFrame = -9999;
	this._parryStunFrames = 0;
	this._parryStunActive = false;
	this._ctEmptyStunApplied = false;
};

var _mog_ct_standalone_enemy_setup = Game_Enemy.prototype.setup;
Game_Enemy.prototype.setup = function(enemyId, x, y) {
	_mog_ct_standalone_enemy_setup.call(this, enemyId, x, y);
	this._parryResistanceMax = Number(this.enemy().meta.parryResistance) || Moghunter.chronoCT_enemyResistance;
	this._parryResistance = this._parryResistanceMax;
	this._parryRecoveryWait = 0;
};

var _mog_ct_standalone_plugin_command = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
	_mog_ct_standalone_plugin_command.call(this, command, args);
	var value = args && args.length > 0 ? String(args[args.length - 1]).toLowerCase() : '';
	if (command === 'ct_hud_visible') {
		$gameSystem._ctHud_visible = value === 'true';
	} else if (command === 'dash_ct_cost') {
		$gameSystem._ctDashEnabled = value === 'true';
	} else if (command === 'action_ct_cost') {
		$gameSystem._ctHud_CTCost = value === 'true';
	}
};

//=============================================================================
// ** QABS Parry
//=============================================================================

function chronoParryIsHeld() {
	return Input.isPressed(Moghunter.chronoCT_parryKey);
}

function chronoParryStun(battler) {
	if (!battler) {return};
	if (battler._chrono && battler._chrono.ct <= 0) {
		battler._ctEmptyStunApplied = true;
	}
	if (!battler._parryStunActive) {
		battler._parryStunActive = true;
		battler._isStunned = (battler._isStunned || 0) + 1;
	}
	battler._parryStunFrames = Moghunter.chronoCT_stunDuration;
}

function chronoPerfectParry(target) {
	var player = $gamePlayer;
	var battler = $gameParty.leader();
	if (target !== battler || !player || !chronoParryIsHeld()) {return false};
	if (Input.isTriggered(Moghunter.chronoCT_parryKey)) {
		battler._parryFrame = Graphics.frameCount;
	}
	return Graphics.frameCount - battler._parryFrame <= Moghunter.chronoCT_parryWindow;
}

function chronoApplyEnemyPoiseDamage(enemyBattler) {
	if (!enemyBattler || !enemyBattler.isEnemy || !enemyBattler.isEnemy()) {return};
	enemyBattler._parryResistance = Math.max(0,
		enemyBattler._parryResistance - Moghunter.chronoCT_enemyResistanceCost);
	enemyBattler._parryRecoveryWait = 180;
	if (enemyBattler._parryResistance === 0) {
		chronoParryStun(enemyBattler);
	}
}

var _mog_ct_parry_player_updateABS = Game_Player.prototype.updateABS;
Game_Player.prototype.updateABS = function() {
	if (this.battler() && Input.isTriggered(Moghunter.chronoCT_parryKey)) {
		this.battler()._parryFrame = Graphics.frameCount;
	}
	_mog_ct_parry_player_updateABS.call(this);
};

var _mog_ct_parry_makeDamageValue = Game_Action.prototype.makeDamageValue;
Game_Action.prototype.makeDamageValue = function(target, critical) {
	var value = _mog_ct_parry_makeDamageValue.call(this, target, critical);
	if (!(this instanceof Game_ABSAction) || value <= 0 || !chronoParryIsHeld()) {return value};
	var battler = $gameParty.leader();
	if (target !== battler || battler._chrono.ct <= 0) {return value};
	if (chronoPerfectParry(target)) {
		var attacker = this.subject();
		chronoApplyEnemyPoiseDamage(attacker);
		return 0;
	}
	battler._chrono.ct = Math.max(0, battler._chrono.ct - Moghunter.chronoCT_blockCost);
	battler._chrono.ctWait = Math.max(battler._chrono.ctWait, 20);
	if (battler._chrono.ct === 0) {
		chronoParryStun(battler);
	}
	return value * Moghunter.chronoCT_blockDamageRate;
};

var _mog_ct_parry_character_updateABS = Game_CharacterBase.prototype.updateABS;
Game_CharacterBase.prototype.updateABS = function() {
	var battler = this.battler();
	_mog_ct_parry_character_updateABS.call(this);
	if (!battler) {return};
	if (battler._parryStunFrames > 0) {
		battler._parryStunFrames--;
		if (battler._parryStunFrames === 0 && battler._parryStunActive) {
			battler._parryStunActive = false;
			battler._isStunned = Math.max(0, battler._isStunned - 1);
		}
	}
	if (battler.isEnemy && battler.isEnemy() && battler._parryResistance < battler._parryResistanceMax) {
		if (battler._parryRecoveryWait > 0) {
			battler._parryRecoveryWait--;
		} else if (Graphics.frameCount % 4 === 0) {
			battler._parryResistance = Math.min(battler._parryResistanceMax,
				battler._parryResistance + 1);
		}
	}
};

var _mog_ct_parry_sprite_initMembers = Sprite_Character.prototype.initMembers;
Sprite_Character.prototype.initMembers = function() {
	_mog_ct_parry_sprite_initMembers.call(this);
	this._parryGauge = new Sprite(new Bitmap(56, 6));
	this._parryGauge.anchor.x = 0.5;
	this._parryGauge.y = -48;
	this._parryGauge.opacity = 220;
	this._parryGaugeValue = -1;
	this.addChild(this._parryGauge);
};

var _mog_ct_parry_sprite_update = Sprite_Character.prototype.update;
Sprite_Character.prototype.update = function() {
	_mog_ct_parry_sprite_update.call(this);
	var chara = this._character;
	var battler = chara && chara.battler ? chara.battler() : null;
	var visible = !!(battler && battler.isEnemy && battler.isEnemy() && !battler.isDead() &&
		(chara.inCombat && chara.inCombat() || battler._parryResistance < battler._parryResistanceMax));
	this._parryGauge.visible = visible;
	if (!visible) {return};
	var rate = battler._parryResistanceMax > 0 ?
		battler._parryResistance / battler._parryResistanceMax : 0;
	if (rate === this._parryGaugeValue) {return};
	this._parryGaugeValue = rate;
	var bitmap = this._parryGauge.bitmap;
	bitmap.clear();
	bitmap.fillRect(0, 0, 56, 6, '#181a1c');
	bitmap.fillRect(1, 1, Math.floor(54 * rate), 4, '#62d6a2');
};