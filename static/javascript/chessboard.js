/*jslint plusplus: true, nomen: true, es5: true, regexp: true, browser: true, devel: true*/
/*global $, ChessUtils, module */


/*
----------------------------------------------------------------------------
----------------------------------------------------------------------------

ChessboardJS

----------------------------------------------------------------------------
----------------------------------------------------------------------------
*/
/**
Chessboard class to create a responsive chessboard from javascript.
Further info https://github.com/caustique/chessboard-js

@class Chessboard
@constructor
*/

function Chessboard(containerId, config) {
	
	'use strict';
	
	/*
	----------------------------------------------------------------------------
	----------------------------------------------------------------------------
  
	CONSTANTS
	
	----------------------------------------------------------------------------
	----------------------------------------------------------------------------
	*/
		
	Chessboard.ANIMATION = {
		fadeInTime: 1000,
		fadeOutTime: 1000
	};
	
	Chessboard.CSS_PREFIX = 'chess_';
	Chessboard.CSS = {
		pathSeparator: '_',
		board: {
			id: Chessboard.CSS_PREFIX +  'board',
			className: Chessboard.CSS_PREFIX +  'board'
		},
		square: {
			className: Chessboard.CSS_PREFIX + 'square',
			lastColumn: { className: Chessboard.CSS_PREFIX + 'square_last_column'},
			idPrefix: Chessboard.CSS_PREFIX + 'square',
			dark: { className: Chessboard.CSS_PREFIX + 'square_dark' },
			light: { className: Chessboard.CSS_PREFIX + 'square_light' },
			createClassName: function (index) {
				return ' ' + (((index + ChessUtils.convertIndexToRow(index)) % 2 === 0) ?
									Chessboard.CSS.square.dark.className : Chessboard.CSS.square.light.className);
			},
			selected: { className: Chessboard.CSS_PREFIX + 'square_selected'},
			validMove: { className: Chessboard.CSS_PREFIX + 'square_valid_move' }
		},
		player: {
			black: { className: Chessboard.CSS_PREFIX + 'player_' + ChessUtils.PLAYER.black.className },
			white: { className: Chessboard.CSS_PREFIX + 'player_' + ChessUtils.PLAYER.white.className },
			createClassName: function (player) {
				return (player === 'white') ?
						Chessboard.CSS.player.white.className :
						Chessboard.CSS.player.black.className;
			}
		},
		piece: {
			idPrefix: Chessboard.CSS_PREFIX + 'piece',
			className: Chessboard.CSS_PREFIX + 'piece',
			createClassName: function (piece) {
				return Chessboard.CSS.piece.className + '_' + piece;
			},
			none: { className: Chessboard.CSS_PREFIX + 'piece_none' }
		},
		label: {
			className: Chessboard.CSS_PREFIX +  'label',
			hidden: { className: Chessboard.CSS_PREFIX +  'label_hidden' },
			row: {
				className: Chessboard.CSS_PREFIX +  'label_row',
				reversed: {
					className: Chessboard.CSS_PREFIX +  'label_row_reversed'
				}
			},
			column: {
				className: Chessboard.CSS_PREFIX +  'label_column',
				reversed: { className: Chessboard.CSS_PREFIX +  'label_column_reversed' }
			}
		},
		style: {
			id: Chessboard.CSS_PREFIX + 'style'
		}
		
	};
	
	/*
	----------------------------------------------------------------------------
	----------------------------------------------------------------------------
  
	VARIABLE AND METHOD DECLARATIONS
	
	----------------------------------------------------------------------------
	----------------------------------------------------------------------------
	*/
	// PRIVATE METHODS
	var init,
		initConfig,
		initDOM,
		// Event handlers
		bindEvents,
		unbindEvents,
		onSizeChanged,
		onSquareClicked,
		// Managing pieces on board
		getSquareElement,
		getSquareIndexFromId,
		clearSelection,
		setSelectedSquareElement,
		isSquareEmpty,
		getPieceElement,
		drawPiece,
		drawPosition,
		drawAnimations,
		// ----------------
		// HELPER FUNCTIONS
		// ----------------
		// CSS helper functions
		cssGetUniquePrefix,
		cssGetBoardUniqueId,
		cssGetSquareUniqueId,
		cssGetPieceUniqueId,
		cssGetStyleUniqueId,
		// PRIVATE VARIABLES
		// All private variables are prefixed with _
		_that = this,											// For event handlers 
		_containerSelector,								// Element selector that is given by the client to create chessboard in
		_userInputEnabled = false,				// Shows if user input is enabled like clicks
		_position = ChessUtils.convertFenToPosition(ChessUtils.FEN.positions.empty),
																			// Current position on the table string a8-h1 of pieces and '0' (white is capital letter),
		_selectedSquareIndex = null,			// Index of the selected square
		_validMoves,											// Array of valid moves for selected piece
		_orientation = ChessUtils.ORIENTATION.white,	// Who sits south position
		_config = {
			useAnimation: true,							// Setting default for useAnimation parameters
			showBoardLabels: true,					// Show columns and row numbers
			showNextMove: true							// Show the valid moves of the selected piece
		},
		_eventHandlers = {
			/**
			 * Fired when the user clicks on one of the available moves. Next position after move should be returned. Any format is accepted that setPosition() accepts. Returning null cancels move.
			 *
			 * @event onMove
			 * @param {Object} move in notation format (ie. {from: 'e2', to: 'e4'})
			 */
			onMove: null,
			onPieceSelected: null,
			onChange: null,
			onChanged: null
		},																// Function references to event handlers
		_preventPositionChange = false,		// If true position change is not allowed
		_preventCallingEvents = true;			// If true the system is not calling events. Used during running of constructor function.
	
	
	/*
	----------------------------------------------------------------------------
	----------------------------------------------------------------------------
  
	PUBLIC METHODS
	
	----------------------------------------------------------------------------
	----------------------------------------------------------------------------
	*/
	
	/**
	Clears the chessboard of all pieces. 
	Change chessboard orientation to white.
	
	@method clear
	@public
	*/
	this.clear = function () {
		if (_preventPositionChange) { return; }
		this.setPosition(ChessUtils.FEN.positions.empty);
		this.setOrientation(ChessUtils.ORIENTATION.white);
	};
	/**
	Destroys the DOM structure that was created
	
	@method destroy
	@public
	*/
	this.destroy = function () {
		$(_containerSelector).html('');

		unbindEvents();
	};
	/**
	Sets or gets the chessboard position.
	The method doesn't change the chessboard orientation, so it has to be manually if needed.
	Deprecated method for compatibility reasons, use setPosition and getPosition instead.
	(No parameter checking!)
	
	@method position
	@public
	@deprecated
	@param {Object} [position]  If omitted returns the internal position string. If ChessUtils.FEN.id (which is 'fen' for compatibility reasons) which returns a fen string (see http://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation). If Chessboard.NOTATION.id then returns a notation object. Otherwise it can be a position string, fen string or notation object to set the current position.
	@param {Boolean} [useAnimation=true]  Whether to use animation for the process.
	@return {Object} The current position of the chessboard in different format.
	*/
	this.position = function (position, useAnimation) {
		var format;
		
		if (((arguments.length === 0) || typeof position === 'undefined') ||
				(typeof position === 'string' && position.toLowerCase() === ChessUtils.FEN.id) ||
				(typeof position === 'string' && position.toLowerCase() === ChessUtils.NOTATION.id)) {
			return this.getPosition(position);
		} else {
			this.setPosition(position, useAnimation);
		}
	};
	/**
	Sets the chessboard position.
	The method doesn't change the chessboard orientation, so it has to be manually if needed.
	(No parameter checking!)
	
	@method setPosition
	@public
	@param {Object} [position]  It can be a position string, fen string or notation object to set the current position.
	@param {Boolean} [useAnimation=true]  Whether to use animation for the process.
	*/
	this.setPosition = function (position, useAnimation) {
		var prevUserInputEnabled = _userInputEnabled;
		
		if (_preventPositionChange) { return; }
		
		clearSelection();
		
		useAnimation = (arguments.length === 1 || typeof useAnimation === 'undefined') ? _config.useAnimation : useAnimation;
		
		// start position		
		if (typeof position === 'string' && (position.toLowerCase() === ChessUtils.FEN.startId)) {
			position = ChessUtils.convertFenToPosition(ChessUtils.FEN.positions.start);
		} else if (typeof position === 'string' && (position.toLowerCase() === ChessUtils.FEN.emptyId)) {
			position = ChessUtils.convertFenToPosition(ChessUtils.FEN.positions.empty);
		} else if (typeof position === 'string') {
			if (position.indexOf(ChessUtils.FEN.rowSeparator) !== -1) {
				position = ChessUtils.convertFenToPosition(position);
			}
		} else if (typeof position === 'object') {
			position = ChessUtils.convertNotationToPosition(position);
		}
		
		
		if (_position === position) { return; }
		
		// run the onChange function
		if (_eventHandlers.hasOwnProperty('onChange') === true &&
				typeof _eventHandlers.onChange === 'function' &&
				!_preventCallingEvents) {
			_preventPositionChange = true;
			if (!_eventHandlers.onChange(_position, position)) { return; }
			_preventPositionChange = false;
		}
		
		_userInputEnabled = false;
		if (useAnimation === true) {
			drawAnimations(position);
			_position = position;
		} else {
			_position = position;
			drawPosition();
		}
		
		// run the onChanged function
		if (_eventHandlers.hasOwnProperty('onChanged') === true &&
				typeof _eventHandlers.onChanged === 'function' &&
				!_preventCallingEvents) {
			_preventPositionChange = true;
			_eventHandlers.onChanged(_position);
			_preventPositionChange = false;
		}
		
		_userInputEnabled = prevUserInputEnabled;
	};
	/**
	Gets the chessboard position.
	(No strict parameter checking!)
	
	@method getPosition
	@public
	@param {String} [format]  If omitted returns the internal position string. If ChessUtils.FEN.id (which is 'fen' for compatibility reasons) which returns a fen string (see http://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation). If Chessboard.NOTATION.id then returns a notation object.
	@return {Object} The current position of the chessboard in different format.
	*/
	this.getPosition = function (format) {
		// no arguments, return the current position
		if ((arguments.length === 0) || !format) {
			return _position;
		}
		// get position as fen
		if (format.toLowerCase() === ChessUtils.FEN.id) {
			return ChessUtils.convertPositionToFen(_position);
		}
		// get position as notation object
		if (format.toLowerCase() === ChessUtils.NOTATION.id) {
			return ChessUtils.convertPositionToNotation(_position);
		}
	};
	
	this.move = function (firstMove) {
		var movesFrom = [],
			movesTo = [],
			position = _position,
			i,
			useAnimation = _config.useAnimation,
			count;
		
		if (_preventPositionChange) { return; }
		
		// TODO: parameter checking
		
		if (typeof arguments[arguments.length - 1] === 'boolean') {
			useAnimation = arguments[arguments.length - 1];
			count = arguments.length - 1;
		} else {
			count = arguments.length;
		}
		
		if (typeof firstMove === 'string') {
			if (firstMove.search('-') !== -1) {
				for (i = 0; i < count; i++) {
					movesFrom.push(ChessUtils.convertNotationSquareToIndex(arguments[i].split('-')[0]));
					movesTo.push(ChessUtils.convertNotationSquareToIndex(arguments[i].split('-')[1]));
				}
			} else {
				for (i = 0; i < count; i += 2) {
					movesFrom.push(ChessUtils.convertNotationSquareToIndex(arguments[i]));
					movesTo.push(ChessUtils.convertNotationSquareToIndex(arguments[i + 1]));
				}
			}
		} else {
			for (i = 0; i < count; i += 2) {
				movesFrom.push(arguments[i]);
				movesTo.push(arguments[i + 1]);
			}
		}
			
		for (i = 0; i < movesFrom.length; i++) {
			if (_position[movesFrom[i]] !== ChessUtils.POSITION.empty) {
				position = ChessUtils.replaceStringAt(position, movesFrom[i], ChessUtils.POSITION.empty);
				position = ChessUtils.replaceStringAt(position, movesTo[i], _position[movesFrom[i]]);
			}
		}
		
		this.setPosition(position, useAnimation);
		
	};
	/**
	Public method to set or get the chessboard position with a fen string (see http://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation).
	A shortcut to the position method. Use setPosition and getPosition instead.
	The method doesn't change the chessboard orientation, so it has to be manually if needed.
	(No parameter checking!)
	
	@method fen
	@public
	@deprecated
	@param {String} [fen]  If omitted returns the fen string of the current postion on the checkboard. If given it is a fen string to set the current position.
	@param {Boolean} [useAnimation=true]  Whether to use animation for the process.
	@return {String or Object} The current position of the chessboard in different format.
	*/
	this.fen = function (fen, useAnimation) {
		return this.position(ChessUtils.FEN.id, fen, useAnimation);
	};
	this.orientation = function (orientation) {
		if (arguments.length === 0) {
			return this.getOrientation();
		} else {
			this.setOrientation(orientation);
		}
	};
	
	this.setOrientation = function (orientation) {
		var position;
		
		if (orientation === ChessUtils.ORIENTATION.flip || _orientation !== orientation) {
			
			clearSelection();
			
			_orientation = (_orientation === ChessUtils.ORIENTATION.white) ?
					ChessUtils.ORIENTATION.black : ChessUtils.ORIENTATION.white;
				
			if (_orientation === ChessUtils.ORIENTATION.white) {
				$('.' + Chessboard.CSS.label.row.className).removeClass(Chessboard.CSS.label.hidden.className);
				$('.' + Chessboard.CSS.label.column.className).removeClass(Chessboard.CSS.label.hidden.className);
				$('.' + Chessboard.CSS.label.row.reversed.className).addClass(Chessboard.CSS.label.hidden.className);
				$('.' + Chessboard.CSS.label.column.reversed.className).addClass(Chessboard.CSS.label.hidden.className);
			} else {
				$('.' + Chessboard.CSS.label.row.className).addClass(Chessboard.CSS.label.hidden.className);
				$('.' + Chessboard.CSS.label.column.className).addClass(Chessboard.CSS.label.hidden.className);
				$('.' + Chessboard.CSS.label.row.reversed.className).removeClass(Chessboard.CSS.label.hidden.className);
				$('.' + Chessboard.CSS.label.column.reversed.className).removeClass(Chessboard.CSS.label.hidden.className);
			}
			
			drawPosition();
		}
	};
	this.getOrientation = function () {
		return _orientation;
	};
	/**
	Sets the chessboard size to match the container element size.
	
	@method resize
	@public
	@deprecated
	*/
	this.resize = function () {
		onSizeChanged();
	};
	/**
	Sets the chessboard position to the classical start position.
	The method sets the chessboard orientation to Chessboard.ORIENTATION.white.
	
	@method start
	@public
	@param {Boolean} [useAnimation=true]  Whether to use animation for the process.
	*/
	this.start = function (useAnimation) {
		
		if (_preventPositionChange) { return; }
		
		useAnimation = (arguments.length === 0) ? _config.useAnimation : useAnimation;
		this.position(ChessUtils.FEN.positions.start, useAnimation);
		_orientation = ChessUtils.ORIENTATION.white;
	};
	
	/**
	Sets wether the board reacts to user clicks and other inputs. After initialization it is set to true. 
	The game controller logic should take care of setting it according to who plays.
	
	@method enableUserInput
	@public
	@param {Boolean} [enabled=true]  Whether to enable user interaction.
	*/
	this.enableUserInput = function (enabled) {
		if (arguments.length === 0) {
			enabled = true;
		}
		_userInputEnabled = enabled;
	};
	/**
	Gets wether the board reacts to user clicks and other inputs.
	
	@method isUserInputEnabled
	@public
	@return {Boolean} Returns whether to enable user interaction.
	*/
	this.isUserInputEnabled = function () {
		return _userInputEnabled;
	};
	
	
	
	/*
	----------------------------------------------------------------------------
	----------------------------------------------------------------------------
  
	PRIVATE METHODS
	
	----------------------------------------------------------------------------
	----------------------------------------------------------------------------
	*/
	/*
	----------------------------------------------------------------------------
	Init methods
	----------------------------------------------------------------------------
	*/
	/**
	Initializes the chessboard.
	
	@method init
	@private
	@param {String} containerId The html id of the container div where the chessboard will be created.
	@param {Object} config Configuration object which is either a position string or an object.
	*/
	init = function (containerId, config) {
		var position;
		
		position = initConfig(config);
		initDOM(containerId);
		bindEvents();
		
		_userInputEnabled = true;
		
		return position;
	};
	/**
	Processes the config object given at init.
	
	@method initConfig
	@private
	@param {Object} config Configuration object which is either a position string or an object with the following attributes: position, useAnimation, orientation, showBoardLabels.
	*/
	initConfig = function (config) {
		var position;
		
		if (typeof config === 'undefined') {
			position = ChessUtils.convertFenToPosition(ChessUtils.FEN.positions.start);
			return position;
		} else if (typeof config === 'string') {
			if (config.toLowerCase() === ChessUtils.FEN.startId) {
				position = ChessUtils.convertFenToPosition(ChessUtils.FEN.positions.start);
			} else if (config.toLowerCase() === ChessUtils.FEN.emptyId) {
				position = ChessUtils.convertFenToPosition(ChessUtils.FEN.positions.empty);
			} else {
				position = config;
			}
			return position;
		} else if (typeof config.position === 'undefined') {
			position = ChessUtils.convertNotationToPosition(config);
			return position;
		} else if (config.position !== null) {
			if (ChessUtils.isValidFen(config.position)) {
				config.position = ChessUtils.convertFenToPosition(config.position);
			}
			position = config.position;
		}
		_orientation = config.orientation === ChessUtils.ORIENTATION.black ?
				ChessUtils.ORIENTATION.black : ChessUtils.ORIENTATION.white;
		
		_config.useAnimation = config.useAnimation === false ? false : true;
		_config.showBoardLabels = (config.showNotation === false) || (config.showBoardLabels === false) ? false : true;
		_config.showNextMove = config.showNextMove === false ? false : true;
		
		if (config.eventHandlers) {

			if (config.eventHandlers.onChange &&
					typeof config.eventHandlers.onChange === 'function') {
				_eventHandlers.onChange = config.eventHandlers.onChange;
			}
			if (config.eventHandlers.onChanged &&
					typeof config.eventHandlers.onChanged === 'function') {
				_eventHandlers.onChanged = config.eventHandlers.onChanged;
			}
			if (config.eventHandlers.onPieceSelected &&
					typeof config.eventHandlers.onPieceSelected === 'function') {
				_eventHandlers.onPieceSelected = config.eventHandlers.onPieceSelected;
			}
			if (config.eventHandlers.onMove &&
					typeof config.eventHandlers.onMove === 'function') {
				_eventHandlers.onMove = config.eventHandlers.onMove;
			}
	
		}
		
		return position;
		// TODO:  Deprecated compatibility settings
	};
	/**
	Initialises the DOM tree for the chessboard.
	
	@method initDOM
	@private
	@param {String} containerId The html id of the container div where the chessboard will be created.
	*/
	initDOM = function (containerId) {
		var i,
			html = '',
			id,
			className;
		
		_containerSelector = '#' + containerId;
		
		if (!$(_containerSelector)) { throw new Error("ContainerId provided doesn't point to a DOM element."); }
		
		// Adding dynamic style for resize events
		html += '<style id="' + cssGetStyleUniqueId() + '"></style>';
		
		
		// Board div
		html += '<div id="' + cssGetBoardUniqueId() + '" class="' +
			Chessboard.CSS.board.className + '">';
		
		for (i = 0; i < 64; i++) {
			// Square div
			id = cssGetSquareUniqueId(i);
			className = Chessboard.CSS.square.className;
			className += ' ' + Chessboard.CSS.square.createClassName(i);
			if (i % 8 === 7) {
				className += ' ' + Chessboard.CSS.square.lastColumn.className;
			}
			html += '<div id="' + id + '" class="' + className + '">';
						
			// Column indicators
			if (ChessUtils.convertIndexToRow(i) === 0) {
				html += '<div class="' + Chessboard.CSS.label.className + ' ' +
					Chessboard.CSS.label.column.className + '">' +
					ChessUtils.NOTATION.columnConverter[ChessUtils.convertIndexToColumn(i)] + '</div>';
			}
			if (ChessUtils.convertIndexToRow(i) === 7) {
				html += '<div class="' + Chessboard.CSS.label.className + ' ' +
					Chessboard.CSS.label.hidden.className + ' ' +
					Chessboard.CSS.label.column.reversed.className + '">' +
					ChessUtils.NOTATION.columnConverter[ChessUtils.convertIndexToColumn(7 - i)] + '</div>';
			}
			// Row indicators
			if (ChessUtils.convertIndexToColumn(i) === 0) {
				html += '<div class="' + Chessboard.CSS.label.className + ' ' +
					Chessboard.CSS.label.row.className + '">' +
					ChessUtils.NOTATION.rowConverter[ChessUtils.convertIndexToRow(i)] + '</div>';
			}
			if (ChessUtils.convertIndexToColumn(i) === 7) {
				html += '<div class="' + Chessboard.CSS.label.className + ' ' +
					Chessboard.CSS.label.hidden.className + ' ' +
					Chessboard.CSS.label.row.reversed.className + '">' +
					ChessUtils.NOTATION.rowConverter[7 - ChessUtils.convertIndexToRow(i)] + '</div>';
			}
			
			// Piece placeholders
			className = Chessboard.CSS.piece.className;
			className += ' ' + Chessboard.CSS.piece.none.className;
			html += '<div id="' + cssGetPieceUniqueId(i) + '" class="' + className + '"></div>';
						
			html += '</div>';
		}
		
		html += '</div>';
		
		$(_containerSelector).html(html);
		$(_containerSelector).css('display', 'inline-block');
	};
	
	/*
	----------------------------------------------------------------------------
	Event handling related methods
	----------------------------------------------------------------------------
	*/
	/**
	Binds chessboard events to elements.
	
	@method bindEvents
	@private
	*/
	bindEvents = function () {
		$(window).on('resize.chessEvents', onSizeChanged);
		
		$('div' + _containerSelector + ' div.' + Chessboard.CSS.square.className).on('click', onSquareClicked);
	};
	/**
	Unbinds chessboard events to elements in case the board is detroyed.
	
	@method unbindEvents
	@private
	*/
	unbindEvents = function () {
		$(window).unbind('resize.chessEvents');
		$('div' + _containerSelector + ' div.' + Chessboard.CSS.square.className).unbind('click');
	};
	/**
	Resizes elements in case the window is resized.
	
	@method onSizeChanged
	@private
	*/
	onSizeChanged = function () {
		var	newSquareWidth,
			newPieceFontSize,
			newLabelFontSize,
			html;
		
		newSquareWidth = Math.floor($(_containerSelector).width() / 8);
		newPieceFontSize = newSquareWidth * 0.85;
		newLabelFontSize = Math.min(Math.max(newSquareWidth * 0.5, 8), 20);

		html = '\
			div' + _containerSelector + ' div.' + Chessboard.CSS.piece.className + ' {\
				font-size: ' + newPieceFontSize + 'px;\
				height: ' + newSquareWidth + 'px;\
			}\
			div' + _containerSelector + ' div.' + Chessboard.CSS.label.className + ' {\
				font-size: ' + newLabelFontSize + 'px;\
				' + (!_config.showBoardLabels ? 'display: none;' : '') + '\
			}';
		$('#' + cssGetStyleUniqueId()).html(html);
	};
	/**
	Handles onClick event on squares.
	
	@method onSquareClicked
	@private
	*/
	onSquareClicked = function () {
		var index = getSquareIndexFromId($(this).context.id),
			i,
			nextPosition;
		
		if (!_userInputEnabled) { return; }
		
		if (_selectedSquareIndex !== null && _validMoves.indexOf(index) > -1) {
			if (_eventHandlers.onMove) {
				nextPosition = _eventHandlers.onMove({from: ChessUtils.convertIndexToNotationSquare(_selectedSquareIndex),
																		to: ChessUtils.convertIndexToNotationSquare(index)});
				if (nextPosition !== null) {
					_that.setPosition(nextPosition);
					clearSelection();
				}
			}
		} else {
		
			if (_selectedSquareIndex !== index) {
				if (_eventHandlers.onPieceSelected) {
					_validMoves = _eventHandlers.onPieceSelected(ChessUtils.convertIndexToNotationSquare(index));
					
					if (_validMoves && _validMoves.length !== 0) {
						setSelectedSquareElement(index);
						
						if (!isSquareEmpty(index)) {
							for (i = 0; i < _validMoves.length; i++) {
								getSquareElement(_validMoves[i]).addClass(Chessboard.CSS.square.validMove.className);
							}
						}
					} else {
						clearSelection();
					}
				}
			}
		}
	
	};
	/**
	Clears the current selection.
	
	@method clearSelection
	@private
	*/
	clearSelection = function () {
		if (_selectedSquareIndex !== null) {
			getSquareElement(_selectedSquareIndex).removeClass(Chessboard.CSS.square.selected.className);
			$('div' + _containerSelector + ' div.' + Chessboard.CSS.square.validMove.className).
					removeClass(Chessboard.CSS.square.validMove.className);
		}
		_selectedSquareIndex = null;
	};
	/**
	Sets the index-th square to selected if there is a piece on it. It deletes the previous selection.
	
	@method setSelectedSquareElement
	@private
	@param {Integer} index The index of the quare to be selected.
	*/
	setSelectedSquareElement = function (index) {
		clearSelection();
		if (!isSquareEmpty(index)) {
			_selectedSquareIndex = index;
			getSquareElement(_selectedSquareIndex).addClass(Chessboard.CSS.square.selected.className);
		}
	};
	
	/*
	----------------------------------------------------------------------------
	Managing board
	----------------------------------------------------------------------------
	*/
	/**
	Returns the a JQuery object of the square div selected by the index.
	
	@method getSquareElement
	@private
	@param {Integer} index Index of a square (0-63)
	@return {Object} The JQuery object of the square div
	*/
	getSquareElement = function (index) {
		return $('#' + cssGetSquareUniqueId(index));
	};
	/**
	Returns the index of a square div based on the html id attribute.
	
	@method getSquareIndexFromId
	@private
	@param {String} htmlId The html id attribute of the square (The last piece contains the id part)
	@return {Integer} The index of the square (0-63)
	*/
	getSquareIndexFromId = function (htmlId) {
		var classParts,
			originalIndex;
		
		classParts = htmlId.split(Chessboard.CSS.pathSeparator);
		originalIndex = parseInt(classParts[classParts.length - 1], 10);
		return _orientation === ChessUtils.ORIENTATION.white ? originalIndex : 63 - originalIndex;
	};
	/**
	Returns the a JQuery object of the piece div selected by the index.
	
	@method getPieceElement
	@private
	@param {Integer} index Index of a square (0-63)
	@return {Object} The JQuery object of the piece div
	*/
	getPieceElement = function (index) {
		return $('#' + cssGetPieceUniqueId(index));
	};
	/**
	Returns if a selected index is empty.
	
	@method isSquareEmpty
	@private
	@param {Integer} index Index of a square (0-63)
	@return {Boolean}
	*/
	isSquareEmpty = function (index) {
		// TODO: Check why not using position string
		return $(getPieceElement(index)).hasClass(Chessboard.CSS.piece.none.className);
	};
	/**
	Draws a piece at the selected position.
	
	@method drawPiece
	@private
	@param {Integer} index Index of a square (0-63)
	@param {String} positionPiece The string representing one piece in the position string.
	@param {Boolean} isHidden Whether the piece should be placed there as a hidden piece for aimation purposes.
	*/
	drawPiece = function (index, positionPiece, isHidden) {
		var className = '',
			player = ChessUtils.getPlayerNameFromPiece(positionPiece),
			piece = ChessUtils.PIECE.codeToPieceName[positionPiece.toLowerCase()];
		
		if (isHidden !== true) { isHidden = false; }
		
		className = Chessboard.CSS.piece.className;
		if (positionPiece !== ChessUtils.POSITION.empty) {
			className += ' ' + Chessboard.CSS.piece.createClassName(piece);
			className += ' ' + Chessboard.CSS.player.createClassName(player);
		} else {
			className += ' ' + Chessboard.CSS.piece.none.className;
		}
		if (getPieceElement(index).attr('class') !== className) {
			getPieceElement(index).attr('class', className);
		}
		getPieceElement(index).css('opacity', isHidden ? 0 : 1);
	};
	/**
	Draws the entire board from the position string using the drawPiece method.
	
	@method drawPosition
	@private
	*/
	drawPosition = function () {
		var i;
		
		for (i = 0; i < 64; i++) {
			drawPiece(i, _position[i]);
		}
	};
	/**
	Draws animated the entire board from the position string.
	
	@method drawAnimations
	@private
	@param {String} position A position string to animate to from the actual position.
	*/
	drawAnimations = function (position) {
		var i;
		
		for (i = 0; i < 64; i++) {
			if (_position[i] !== position[i]) {
				if ((_position[i] !== '0') && (position[i] !== '0')) {
					drawPiece(i, position[i], true);
					$(getPieceElement(i)).animate({'opacity': '1'}, Chessboard.ANIMATION.fadeInTime);
					
					// Replacing characters
				} else if (_position[i] === '0') {
					// New piece on square
					drawPiece(i, position[i], true);
					$(getPieceElement(i)).animate({'opacity': '1'}, Chessboard.ANIMATION.fadeInTime);
				} else if (position[i] === '0') {
					// Removing piece from square
					drawPiece(i, position[i], true);
				}
			}
		}
	};
	
	
	
	/*
	----------------------------------------------------------------------------
	CSS helper methods
	----------------------------------------------------------------------------
	*/
	/**
	Creates a unique prefix for css classnames based on enclosing div id 
	in order to be able to handle multiple boards on one page.
	
	@method cssGetUniquePrefix
	@private
	@return {String}
	*/
	cssGetUniquePrefix = function () {
		return $(_containerSelector).attr('id') + '_';
	};
	/**
	Returns unique css classname for the board div.
	
	@method cssGetBoardUniqueId
	@private
	@return {String}
	*/
	cssGetBoardUniqueId = function (index) {
		return cssGetUniquePrefix() + Chessboard.CSS.board.id;
	};
	/**
	Returns unique css id for a square div.
	
	@method cssGetSquareUniqueId
	@private
	@return {String}
	*/
	cssGetSquareUniqueId = function (index) {
		return cssGetUniquePrefix() + Chessboard.CSS.square.idPrefix + '_' +
			(_orientation === ChessUtils.ORIENTATION.white ? index : 63 - index);
	};
	/**
	Returns unique css id for a piece div.
	
	@method cssGetPieceUniqueId
	@private
	@return {String}
	*/
	cssGetPieceUniqueId = function (index) {
		return cssGetUniquePrefix() + Chessboard.CSS.piece.idPrefix + '_' +
			(_orientation === ChessUtils.ORIENTATION.white ? index : 63 - index);
	};
	/**
	Returns unique css id for the style div.
	
	@method cssGetStyleUniqueId
	@private
	@return {String}
	*/
	cssGetStyleUniqueId = function () {
		return cssGetUniquePrefix() + Chessboard.CSS.style.id;
	};
	
	
	/*
	----------------------------------------------------------------------------
	----------------------------------------------------------------------------
  
	CONSTRUCTOR CODE
	
	----------------------------------------------------------------------------
	----------------------------------------------------------------------------
	*/
	
	this.setPosition(init(containerId, config));
	onSizeChanged();
	
	// It is a bit of a hack.
	if (_orientation === ChessUtils.ORIENTATION.black) {
		this.setOrientation(ChessUtils.ORIENTATION.flip);
		_orientation = ChessUtils.ORIENTATION.black;
	}
	
	_preventCallingEvents = false;
	
}

















/*
----------------------------------------------------------------------------
----------------------------------------------------------------------------

CHESSUTILS

----------------------------------------------------------------------------
----------------------------------------------------------------------------
*/


/**
ChessUtils class to contain static utility functions.

@class ChessUtils
*/

(function () {
	'use strict';
	
	/*
	----------------------------------------------------------------------------
	----------------------------------------------------------------------------
	
	CONSTANTS
	
	----------------------------------------------------------------------------
	----------------------------------------------------------------------------
	*/
	
	var ChessUtils = {};

	ChessUtils.PLAYER = {
		black: {
			code: 'b',
			notation: 'b',
			className: 'black'
		},
		white: {
			code: 'w',
			notation: 'w',
			className: 'white'
		}
	};
	
	ChessUtils.ORIENTATION = {
		white: 'w',
		black: 'b',
		flip: 'flip'
	};
	
	ChessUtils.PIECE = {
		none: '0',
		pawn: 'p',
		rook: 'r',
		knight: 'n',
		bishop: 'b',
		queen: 'q',
		king: 'k',
		codeToPieceName: {
			p: 'pawn',
			r: 'rook',
			n: 'knight',
			b: 'bishop',
			q: 'queen',
			k: 'king'
		}
	};
	
	ChessUtils.POSITION = {
		empty: '0',
		piece: {
			pawn: 'p',
			rook: 'r',
			knight: 'n',
			bishop: 'b',
			queen: 'q',
			king: 'k'
		},
		validator: /^[kqrbnpKQRNBP0]+$/,
	};

	
	ChessUtils.NOTATION = {
		id: 'notation',
		positionValidator: /^[a-h][1-8]$/,
		pieceValidator: /^[bw][KQRNBP]$/,
		columns: String.prototype.split.call('abcdefgh', ''),
		rows: String.prototype.split.call('12345678', ''),
		columnConverter: 'abcdefgh',
		rowConverter: '12345678'
	};
	
	ChessUtils.FEN = {
		// Commands
		id: 'fen',
		startId: 'start',
		emptyId: 'empty',
		// Syntax
		rowValidator: /^[kqrbnpKQRNBP1-8]+$/,
		rowSeparator: '/',
		// Misc
		positions: {
			// Standard empty and start position
			empty: '8/8/8/8/8/8/8/8',
			start: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
			// Some well known positions
			ruyLopez: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R'
		}
	};
	
	
	/*
	----------------------------------------------------------------------------
	----------------------------------------------------------------------------
  
	PUBLIC STATIC METHODS
	
	----------------------------------------------------------------------------
	----------------------------------------------------------------------------
	*/
	
	/*
	----------------------------------------------------------------------------
	Piece, player etc.
	----------------------------------------------------------------------------
	*/
	/**
	Checks wether a piece code represents a white player.
	
	@method isPieceWhite
	@public
	@static
	@param {String} piece A piece code (B or k)
	@return {Boolean}
	*/
	ChessUtils.isPieceWhite = function (piece) {
		return (piece.toUpperCase() === piece) && (piece !== ChessUtils.PIECE.none);
	};
	/**
	Checks wether a piece code represents a black player.
	
	@method isPieceBlack
	@public
	@static
	@param {String} piece A piece code (B or k)
	@return {Boolean}
	*/
	ChessUtils.isPieceBlack = function (piece) {
		return (piece.toUpperCase() !== piece);
	};
	/**
	Puts to piece into the valid format according to player information.
	
	@method getPieceForPlayer
	@public
	@static
	@param {String} piece A piece code (B or k)
	@param {String} piece A player code
	@return {String} The piece code in the proper case
	*/
	ChessUtils.getPieceForPlayer = function (piece, playerCode) {
		return playerCode === ChessUtils.PLAYER.white.code ? piece.toUpperCase() : piece.toLowerCase();
	};
	/**
	Gets the player of the piece.
	
	@method convertPieceToPlayerName
	@public
	@static
	@param {String} piece A piece code (B or k)
	@return {String} The player name (white or black)
	*/
	ChessUtils.getPlayerNameFromPiece = function (piece) {
		if (ChessUtils.isPieceWhite(piece)) { return ChessUtils.PLAYER.white.className; }
		if (ChessUtils.isPieceBlack(piece)) { return ChessUtils.PLAYER.black.className; }
	};
	/**
	Gets the player of the piece.
	
	@method getPlayerCodeFromPiece
	@public
	@static
	@param {String} piece A piece code (B or k)
	@return {String} The player code (w or b)
	*/
	ChessUtils.getPlayerCodeFromPiece = function (piece) {
		if (ChessUtils.isPieceWhite(piece)) { return ChessUtils.PLAYER.white.code; }
		if (ChessUtils.isPieceBlack(piece)) { return ChessUtils.PLAYER.black.code; }
	};
	
	/*
	----------------------------------------------------------------------------
	Validating methods
	----------------------------------------------------------------------------
	*/
	/**
	Checks wether a position string is valid.
	
	@method isValidPosition
	@public
	@static
	@param {String} position A position string
	@return {Boolean}
	*/
	ChessUtils.isValidPosition = function (position) {
		if (typeof position !== 'string') { return false; }
		if ((position.length !== 64) ||
					position.search(ChessUtils.POSITION.validator) !== -1) {
			return false;
		}
	};
	/**
	Checks wether a fen string is valid.
	
	@method isValidFen
	@public
	@static
	@param {String} fen A fen string
	@return {Boolean}
	*/
	ChessUtils.isValidFen = function (fen) {
		var fenRows,
			i;
		
		if (typeof fen !== 'string') { return false; }
	
		fen = fen.split(' ')[0];
	
		fenRows = fen.split('/');
		if (fenRows.length !== 8) { return false; }
	
		// check the piece sections
		for (i = 0; i < 8; i++) {
			if (fenRows[i] === '' ||
					fenRows[i].length > 8 ||
					fenRows[i].search(ChessUtils.FEN.rowValidator) !== -1) {
				return false;
			}
		}
	
		return true;
	};
	
	/**
	Checks wether a notation position string is valid.
	Notation position string example: 'a1' which represents the first column and row
	
	@method isValidNotationPosition
	@public
	@static
	@param {String} position A notation position string
	@return {Boolean}
	*/
	ChessUtils.isValidNotationPosition = function (position) {
		if (typeof position !== 'string') { return false; }
		return (position.search(ChessUtils.NOTATION.positionValidator) !== -1);
	};
	/**
	Checks wether a notation piece string is valid.
	Notation piece string example: 'bK' which represents black king
	
	@method isValidNotationPiece
	@public
	@static
	@param {String} piece A notation piece string
	@return {Boolean}
	*/
	ChessUtils.isValidNotationPiece = function (piece) {
		if (typeof piece !== 'string') { return false; }
		return (piece.search(ChessUtils.NOTATION.pieceValidator) !== -1);
	};
	/**
	Checks wether a notation object is valid.
	Notation object example: {a4: 'bK',c4: 'wK',a7: 'wR'}
	
	@method isValidNotation
	@public
	@static
	@param {Object} notation An object containing valid notations
	@return {Boolean}
	*/
	ChessUtils.isValidNotation = function (notation) {
		var i;
		
		if (typeof notation !== 'object') {
			return false;
		}
		
		for (i in notation) {
			if (notation.hasOwnProperty(i)) {
				if (!ChessUtils.isValidNotationPosition(i) || !ChessUtils.isValidNotationPiece(notation[i])) {
					return false;
				}
			}
		}
		
		return true;
	};
	
	/*
	----------------------------------------------------------------------------
	Conversion of chessboard notation methods
	----------------------------------------------------------------------------
	*/
	/**
	Creates a position string from a fen string. (see http://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation)
	
	@method convertFenToPosition
	@public
	@static
	@param {String} fen The fen string. Only the first part is used.
	@return {String} The position string representation of the fen string.
	*/
	ChessUtils.convertFenToPosition = function (fen) {
		var i,
			position;
			
		if (ChessUtils.isValidFen(fen)) {
			throw new Error('Invalid fen string "' + fen + '".');
		}
		
		// Keeping the first part of fen
		position = fen.split(' ')[0];
		
		for (i = 1; i <= 8; i++) {
			position = position.replace(new RegExp(i, 'g'), ChessUtils.repeatString('0', i));
		}
		position = position.replace(new RegExp(ChessUtils.FEN.rowSeparator, 'g'), '');
				
		return position;
	};
	/**
	Creates a fen string from a position string. (see http://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation)
	
	@method convertPositionToFen
	@public
	@static
	@param {String} position The position string.
	@return {String} The fen string representation of the position string.
	*/
	ChessUtils.convertPositionToFen = function (position) {
		var i,
			fen = '';
		
		if (ChessUtils.isValidPosition(position)) {
			throw new Error('Invalid position string "' + position + '".');
		}
				
		fen = position.substr(0, 8);
		for (i = 1; i < 8; i++) {
			fen += ChessUtils.FEN.rowSeparator + position.substr(i * 8, 8);
		}
		for (i = 8; i > 0; i--) {
			fen = fen.replace(new RegExp(ChessUtils.repeatString('0', i), 'g'), i);
		}
		
		return fen;
	};
	
	
	/**
	Returns the notation piece string from a piece code string that is used in fen and position strings (K -> wK or k -> bK).
	
	@method convertPieceToNotationPiece
	@public
	@static
	@param {String} piece The piece code string.
	@return {String} The notation piece string.
	*/
	ChessUtils.convertPieceToNotationPiece = function (piece) {
		return (ChessUtils.isPieceWhite(piece) ?
							ChessUtils.PLAYER.white.notation : ChessUtils.PLAYER.black.notation) +
							piece.toUpperCase();
	};
	/**
	Returns the piece code string that is used in fen and position strings from a notation piece string (wK -> K or bK -> k).
	
	@method convertNotationPieceToPiece
	@public
	@static
	@param {String} piece The notation piece string.
	@return {String} The piece code string.
	*/
	ChessUtils.convertNotationPieceToPiece = function (notationPiece) {
		return ((notationPiece.split('')[0] === ChessUtils.PLAYER.white.notation) ?
							notationPiece.split('')[1].toUpperCase() :
							notationPiece.split('')[1].toLowerCase());
	};
	/**
	Returns the notation square from an index (0-63) (0 -> a8 or 63 -> h1).
	
	@method convertIndexToNotationSquare
	@public
	@static
	@param {Integer} index The index of the square
	@return {String} The notation form of the square
	*/
	ChessUtils.convertIndexToNotationSquare = function (index) {
		return ChessUtils.NOTATION.columns[ChessUtils.convertIndexToColumn(index)] +
						ChessUtils.NOTATION.rows[ChessUtils.convertIndexToRow(index)];
				
	};
	/**
	Returns the index (0-63) from a notation square (a8 -> 0 or h1 -> 63).
	
	@method convertNotationSquareToIndex
	@public
	@static
	@param {String} notationSquare The notation form of the square
	@return {Integer} The index of the square
	*/
	ChessUtils.convertNotationSquareToIndex = function (notationSquare) {
		var index,
			i,
			row,
			column;
		
		if (notationSquare[notationSquare.length - 1] === '+') {
			notationSquare = notationSquare.substring(0, notationSquare.length - 1);
		}
		column = notationSquare.split('')[notationSquare.length - 2];
		row = notationSquare.split('')[notationSquare.length - 1];
		
		return ChessUtils.convertRowColumnToIndex(
			ChessUtils.NOTATION.rowConverter.search(row),
			ChessUtils.NOTATION.columnConverter.search(column)
		);
	};
		/**
	Creates a position string from a notation object.
	
	@method convertNotationToPosition
	@public
	@static
	@param {Object} notation The notation object (For example {a1:bK, b1:wQ}).
	@return {String} The position string representation of the notation object.
	*/
	ChessUtils.convertNotationToPosition = function (notation) {
		var position = ChessUtils.convertFenToPosition(ChessUtils.FEN.positions.empty),
			square;
	
		if (ChessUtils.isValidNotation(position)) {
			throw new Error('Invalid notation object "' + notation.toString() + '".');
		}
		
		for (square in notation) {
			if (notation.hasOwnProperty(square)) {
				position =
					ChessUtils.replaceStringAt(position,
																		 ChessUtils.convertNotationSquareToIndex(square),
																		 ChessUtils.convertNotationPieceToPiece(notation[square]));
			}
		}
		
		return position;
				
	};
	/**
	Creates a notation object from a position string.
	
	@method convertPositionToNotation
	@public
	@static
	@param {String} position The position string.
	@return {Object} The notation object representation of the position string.
	*/
	ChessUtils.convertPositionToNotation = function (position) {
		var notation = {},
			i;
		
		if (ChessUtils.isValidPosition(position)) {
			throw new Error('Invalid position string "' + position + '".');
		}
		
		for (i = 0; i < 64; i++) {
			if (position[i] !== ChessUtils.POSITION.empty) {
				notation[ChessUtils.convertIndexToNotationSquare(i)] = ChessUtils.convertPieceToNotationPiece(position[i]);
			}
		}
		
		return notation;
	};
	
	/*
	----------------------------------------------------------------------------
	Conversion of coordinates and connected methods
	----------------------------------------------------------------------------
	*/
	/**
	Checks wether a row index (0-7) and a column index (0-7) is valid.
	
	@method isOutOfBoard
	@public
	@static
	@param {Integer} row
	@param {Integer} column
	@return {Integer}
	*/
	ChessUtils.isOutOfBoard = function (row, column) {
		return (row < 0 || row > 7 || column < 0 || column > 7);
	};
	/**
	Converts an index (0-63) to a column index (0-7). No parameter checking.
	
	@method convertIndexToColumn
	@public
	@static
	@param {Integer} index
	@return {Integer}
	*/
	ChessUtils.convertIndexToColumn = function (index) {
		return index % 8;
	};
	/**
	Converts an index (0-63) to a row index (0-7). No parameter checking.
	
	@method convertIndexToRow
	@public
	@static
	@param {Integer} index
	@return {Integer}
	*/
	ChessUtils.convertIndexToRow = function (index) {
		return 7 - Math.floor(index / 8);
	};
	/**
	Converts a row index (0-7) and a column index (0-7) to an index (0-63). No parameter checking.
	
	@method convertRowColumnToIndex
	@public
	@static
	@param {Integer} row
	@param {Integer} column
	@return {Integer}
	*/
	ChessUtils.convertRowColumnToIndex = function (row, column) {
		return (7 - row) * 8 + column;
	};
	
	
	/*
	----------------------------------------------------------------------------
	Utility functions
	----------------------------------------------------------------------------
	*/
	/**
	Repeats a given string (or character) x times.
	Example: repeatString('0', 3) returns '000'.
	(No parameter checking!)
	
	@method repeatString
	@public
	@static
	@param {String} what The string to copy
	@param {Integer}  times The number of repeats
	@return {String} The 'what' string repeated 'times' times.
	*/
	ChessUtils.repeatString = function (what, times) {
		var helper = [];
		
		helper.length = times + 1;
		return helper.join(what);
		
	};
	
	/**
		Replaces a character/string in a given string (or character) x times.
		Example: replaceStringAt('Hong', 0, 'K') returns 'Kong', replaceStringAt('Hong', 3, 'g Kong') returns 'Hong Kong'.
		(No parameter checking!)
		
		@method replaceStringAt
		@public
		@static
		@param {String} inputString The string to insert the character into
		@param {Integer} index The index where the insertion should happen
		@param {Integer} what What to insert
		@return {String} The result after replacement
		*/
	ChessUtils.replaceStringAt = function (inputString, index, what) {
			
		var a;
			
		a = inputString.split('');
		a[index] = what;
		return a.join('');
	};
	
	
	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
		module.exports.ChessUtils = ChessUtils;
	} else {
		window.ChessUtils = ChessUtils;
	}
	
}());
