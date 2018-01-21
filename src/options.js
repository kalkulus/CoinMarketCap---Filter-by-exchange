cmcEf.init();

cmcEf.getConfig().then(function(config){
	var _config = config;
	var _data = cmcEf.getData();

	$('select#sort').val(_config.sort);
	$('select#update-interval').val(_config.updateInterval);

	var _buildExchangesSelection = function(){	
		cmcEf.sortExchanges(_data.exchanges, 'az');
		
		var exhangesSelection = '';
		for(var i=0; i<_data.exchanges.length; i++){
			var checked = _config.favoriteExchanges.indexOf(_data.exchanges[i].slug) >= 0 ? 'checked' : '';
			exhangesSelection += '<input type="checkbox" value="' + _data.exchanges[i].slug + '" ' + checked + ' /> ' + _data.exchanges[i].name + '<br />';
		}
		$('#exchanges').html(exhangesSelection);
	};

	$('#save').on('click', function(){
		_config.sort = $('select#sort').val();
		_config.updateInterval = $('select#update-interval').val();

		_config.favoriteExchanges = $('input[type=checkbox]:checked').map(function(_, el) {
		    return $(el).val();
		}).get();

		cmcEf.saveConfig(_config, function() {
		    // Update status to let user know options were saved.
		    var status = $('#status');
		    status.text('Options saved.');
		    setTimeout(function() {
		      status.text('');
		    }, 1000);
		  });
	});

	if (!_data.exchanges.length){
		cmcEf.getExchanges().then(function(){
			_data = cmcEf.getData();
			_buildExchangesSelection();
		});
	} else {
		_buildExchangesSelection();
	}

}); 