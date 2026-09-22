/*:
 * @plugindesc Keeps selected characters using only the left and right rows of their spritesheet.
 * @author Project
 *
 * @help
 * BeatSidesSprites
 *
 * This plugin keeps enabled characters on the left/right rows of a standard
 * RPG Maker MV character sheet. Moving up or down does not change the visual
 * direction; the last horizontal direction remains visible.
 *
 * Plugin commands:
 *   BeatSide player on
 *   BeatSide player off
 *   BeatSide actor 1 on
 *   BeatSide actor 1 off
 *   BeatSide event 3 on
 *   BeatSide event 3 off
 *   BeatSide on
 *   BeatSide off
 *
 * The short event form (BeatSide on/off) affects the event that executes the
 * command. The actor form also affects followers using that actor.
 */

(function() {
	'use strict';

	function beatSideState() {
		if (!$gameSystem._beatSideState) {
			$gameSystem._beatSideState = {
				player: false,
				actors: {},
				events: {}
			};
		}
		return $gameSystem._beatSideState;
	}

	Game_CharacterBase.prototype.isBeatSideCharacter = function() {
		if (this instanceof Game_Player) {
			return !!beatSideState().player;
		}
		if (this instanceof Game_Event) {
			return !!beatSideState().events[this.eventId()];
		}
		if (this instanceof Game_Follower) {
			var actor = this.actor();
			return !!(actor && beatSideState().actors[actor.actorId()]);
		}
		return false;
	};

	var _Game_CharacterBase_initMembers = Game_CharacterBase.prototype.initMembers;
	Game_CharacterBase.prototype.initMembers = function() {
		_Game_CharacterBase_initMembers.call(this);
		this._beatSideDirection = 6;
	};

	var _Game_CharacterBase_setDirection = Game_CharacterBase.prototype.setDirection;
	Game_CharacterBase.prototype.setDirection = function(direction) {
		if (this.isBeatSideCharacter()) {
			if (direction === 4 || direction === 7 || direction === 1) {
				this._beatSideDirection = 4;
			} else if (direction === 6 || direction === 9 || direction === 3) {
				this._beatSideDirection = 6;
			}
			_Game_CharacterBase_setDirection.call(this, this._beatSideDirection);
		} else {
			_Game_CharacterBase_setDirection.call(this, direction);
		}
	};

	function refreshCharacter(character) {
		if (character) {
			if (character.isBeatSideCharacter()) {
				character._beatSideDirection = 6;
				_Game_CharacterBase_setDirection.call(character, 6);
			} else {
				_Game_CharacterBase_setDirection.call(character, 2);
			}
		}
	}

	function refreshActor(actorId) {
		if ($gamePlayer && $gamePlayer.actor() && $gamePlayer.actor().actorId() === actorId) {
			refreshCharacter($gamePlayer);
		}
		if ($gamePlayer && $gamePlayer.followers()) {
			$gamePlayer.followers().data().forEach(function(follower) {
				if (follower.actor() && follower.actor().actorId() === actorId) {
					refreshCharacter(follower);
				}
			});
		}
	}

	function refreshEvent(eventId) {
		if ($gameMap && $gameMap.event(eventId)) {
			refreshCharacter($gameMap.event(eventId));
		}
	}

	var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
	Game_Interpreter.prototype.pluginCommand = function(command, args) {
		_Game_Interpreter_pluginCommand.call(this, command, args);
		if (String(command).toLowerCase() !== 'beatside' &&
				String(command).toLowerCase() !== 'beatsidesprites') {
			return;
		}

		var target = String(args[0] || '').toLowerCase();
		var action = String(args[1] || '').toLowerCase();
		var state = beatSideState();
		var enabled;
		var id;

		if (target === 'on' || target === 'off') {
			enabled = target === 'on';
			state.events[this._eventId] = enabled;
			refreshEvent(this._eventId);
		} else if (target === 'player') {
			state.player = action === 'on';
			refreshCharacter($gamePlayer);
		} else if (target === 'actor') {
			id = Number(args[1]);
			enabled = String(args[2] || '').toLowerCase() === 'on';
			if (id > 0) {
				state.actors[id] = enabled;
				refreshActor(id);
			}
		} else if (target === 'event') {
			id = Number(args[1]);
			enabled = String(args[2] || '').toLowerCase() === 'on';
			if (id > 0) {
				state.events[id] = enabled;
				refreshEvent(id);
			}
		}
	};
})();
