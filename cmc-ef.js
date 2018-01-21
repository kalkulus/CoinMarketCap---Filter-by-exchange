var cmcEf = (function(){

	var _localStorageKeys = {
		config: 'cmc-ef-config',
		data: 'cmc-ef-data'
	};

	var _defaultConfig = {
		favoriteExchanges: [],
		sort: 'default', // default|a-z
		updateInterval: '1d' // always|1d|2d|1w
	};

	var _config = {};

	var _data = {
		exchanges: [],
		coinsOnExchange: {},
		updatedTimestamp: {
			exchangesList: null,
			exchangesCoins: {}
		}
	};

	var _wrapper = null;
	var _listAll = false;

	var _getTimestamp = function(){
		return Math.floor(Date.now() / 1000);
	};

	var _shouldUpdate = function(lastUpdateTimestamp){
		if (!lastUpdateTimestamp) return true;

		var updatePeriod = 0;

		switch(_config.updateInterval){
			case '1d':
				updatePeriod = 24*3600;
				break;
			case '2d':
				updatePeriod = 48*3600;
				break;
			case '1w':
				updatePeriod = 7*24*3600;
				break;
		}

		if (lastUpdateTimestamp < (_getTimestamp() - updatePeriod)) return true;

		return false;
	};

	var _initConfig = function(){
		var savedConfig = JSON.parse(localStorage.getItem(_localStorageKeys.config)) || {};		
		chrome.storage.sync.get(_defaultConfig, function(items){
			_config = Object.assign({}, items);	
		});		
	};

	var _initData = function(){
		var savedData = JSON.parse(localStorage.getItem(_localStorageKeys.data)) || {};		
		_data = Object.assign(_data, savedData);
	};

	var _saveConfig = function(config, callback){				
		chrome.storage.sync.set(config, callback);
	};

	var _saveData = function(data){
		localStorage.setItem(_localStorageKeys.data, JSON.stringify(data ? data : _data));
	};

	var _getConfig = function() { 
		var deferred = $.Deferred();
		
		var configJsInitChecktimer = setInterval (configCheckForJS_Finish, 111);
		function configCheckForJS_Finish() {			
			if (_config.sort){
		        clearInterval (configJsInitChecktimer);
		        deferred.resolve(_config);
		    }
		}

		return deferred;
	};
	var _getData = function() { return _data; };

	var _getWrapper = function(){
		var cw = document.querySelector('#currencies_wrapper');
		if (cw) { 
			_wrapper = cw; 
			// console.log('IMA currencies_wrapper');
		}

		if (!_wrapper) {
			var caw = document.querySelector('#currencies-all_wrapper');
			if (caw) {
				_wrapper = caw;
				_listAll = true;
				// console.log('IMA currencies-all_wrapper');
			}
		}

		if (!_wrapper) {
			var aw = document.querySelector('#assets_wrapper');
			if (aw) {
				_wrapper = aw;
				// console.log('IMA assets_wrapper');			
			}
		}

		if (!_wrapper) {
			var aaw = document.querySelector('#assets-all_wrapper');
			if (aaw) {
				_wrapper = aaw;
				_listAll = true;
				// console.log('IMA assets-all_wrapper');
			}
		}
	};
	
	var _addUpdateOverlay = function(){
		$('<div class="cmc-ef-filtering">Working...</div>').css({
		    position: "absolute",
		    width: "100%",
		    height: "100%",
		    left: 0,
		    top: 0,
		    zIndex: 1000000,  // to be on the safe side
		    'background-color': 'gray',
		    color: 'black',
		    'text-align': 'center',
		    'padding-top': '30px',
		    'font-size': '2em',
		    opacity: 0.8,
		    display: 'none'
		}).appendTo($(_wrapper).css("position", "relative"));
	};

	var _sortExchanges = function(exchanges, sort){
		sort = sort || _config.sort;
		if (sort === 'az'){
			exchanges.sort(function(e1, e2){
				if ( e1.name < e2.name )
			        return -1;
			    if ( e1.name > e2.name )
			        return 1;
			    return 0;
			});
		}
	}
	
	var _getExchanges = function(){
		var deferred = $.Deferred();

		if (_shouldUpdate(_data.updatedTimestamp.exchangesList)){
			$.get( "https://coinmarketcap.com/exchanges/volume/24-hour/all/", function( data ) {
				_data.exchanges = [];
				$(data).find('.volume-header a').each(function(){ 			
					_data.exchanges.push({ 
						name: $(this).text(), 
						slug: $(this).attr('href').split('/')[2]						
					});
				});	 

				_sortExchanges(_data.exchanges);

				_data.updatedTimestamp.exchangesList = _getTimestamp();
				_saveData();

				deferred.resolve();
				// console.log('LOAD EXCHANGES DONE');
			});
		} else {
			deferred.resolve();
		}
		return deferred;
	};

	var _buildDropdown = function(){
		var selectParentSelector = '.col-xs-12.text-left.bottom-margin-2x .row';
		var divStyle = 'class="col-xs-12 col-sm-12 col-md-3"';
		var selectStyle = '';

		if (!_listAll) {
			var selectParentSelector = '.col-xs-9.col-md-6.col-md-push-4.text-right';
			divStyle = 'style="width: 50%; position: absolute; top: 0;"';
			selectStyle = 'style="display: inline-block; width: 55%;"';
		}

		var exchanges = '';
		var favorites = '<optgroup label="Favorites">';

		var select = '<div ' + divStyle + '>';		
		select += ' Exchange ';
		// select += '<img src="' + chrome.extension.getURL("images/filtering2.gif") + '" class="cmc-ef-filtering" style="width: 15px;" /> '		
		select += '<select class="form-control" id="cmc-ef-select-exchange" ' + selectStyle + '>';
		select += '<option value="all">All</option>';
		for(var i=0; i<_data.exchanges.length; i++){
			if (_config.favoriteExchanges.indexOf(_data.exchanges[i].slug) >= 0){
				favorites += '<option value="' + _data.exchanges[i].slug +'">' + _data.exchanges[i].name + '</option>';
			} else {
				exchanges += '<option value="' + _data.exchanges[i].slug +'">' + _data.exchanges[i].name + '</option>';
			}
		}
		if (_config.favoriteExchanges.length){
			select +=  favorites + '</optgroup>';
		}
		select += exchanges;
		select +='</select></div>'

		$(selectParentSelector).append($(select));		
		// $('.cmc-ef-filtering').hide();	

		$('#cmc-ef-select-exchange').change(function(){
			var exchange = $(this).val();
			// console.log("Izabrao si: " + exchange);
			
			if (exchange === 'all') {
				$(_wrapper).find('table tbody tr').show();
				return;
			}

			_getExchangeData(exchange).then(function(){
				_filterCoins(exchange);
			})
		});
	}
	
	var _filterCoins = function(exchange){
		$(_wrapper).find('table tbody tr').each(function(index){ 
			$(this).show();
			var a = $(this).find('td a.currency-name-container'); 
			if (!_data.coinsOnExchange[exchange][a.html()]) $(this).hide();
		});
		$('.cmc-ef-filtering').hide();
	}

	var _getExchangeData = function(exchange){
		var deferred = $.Deferred();

		// console.log('LOADING ' + exchange + ' DATA');
		if (_data.coinsOnExchange[exchange] && !_shouldUpdate(_data.updatedTimestamp.exchangesCoins[exchange])) {
			deferred.resolve();
			return;
		}
		
		$('.cmc-ef-filtering').show();

		_data.coinsOnExchange[exchange] = {};

		$.get( "https://coinmarketcap.com/exchanges/" + exchange + "/", function( data ) {
		  var trs = $(data).find('.table-responsive table tbody tr').each(function(){
		  	var tda = $(this).find('td a'); 
		  	_data.coinsOnExchange[exchange][tda.html()] = tda.attr('href');
	  	  });
	  	  
	  	  _data.updatedTimestamp.exchangesCoins[exchange] = _getTimestamp();		  
	  	  _saveData();
		  // console.log('LOADING ' + exchange + ' DATA DONE');
		  deferred.resolve();			
		});

		return deferred;		
	}

	var _initListeners = function(){
		
	};

	var _init = function(){
		_initConfig();
		_initData();
		_getWrapper();
		_addUpdateOverlay();
		_getExchanges().then(function(){
			_buildDropdown();
		});
		_initListeners();
	};

	return {
		init: _init,
		getConfig: _getConfig,
		getData: _getData,
		saveConfig: _saveConfig,
		getExchanges: _getExchanges,
		sortExchanges: _sortExchanges
	}
})();



