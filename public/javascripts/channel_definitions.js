$( function() {
	// declare all variables
	var json_data,
		channels,
		sources,
		apps,
		appID = 63, // hard-code for testing
		channel_list = $("#channel_list"),
		selected_channel = 2,
		reorder_actions = $("#reorder_actions button"),
		reorder_button = $("#reorder"),
		edit_form = $('#edit_channel'),
		edit_actions = $("#edit_actions button"),
		edit_button = $("#edit"),
		channel_icon = '<span class="glyphicon glyphicon-circle-arrow-right" aria-hidden="true"></span>',
		trash_icon = '<span class="glyphicon glyphicon-trash" aria-hidden="true"></span>';

	// IIFE to load channel data
	(function(endpoint) {
		$.get( endpoint, function( data ) {
			json_data = data;
			channels = data.channels;
			// load content sources so we can populate
			getContentSources('/data/sources.json');
			getApps('/data/apps.json');
			$.each( channels, function( index, channel ) {
				// add selected class here as well
				channel_list.append('<li id="' + channel.id + '" class="ui-state-default ' + channel.mode + '">' + channel_icon + channel.name + '</li>');
				if(index == selected_channel) {
					setSelectedChannel(index);
				}
			});
		});
	})('/data/channels.json');

	// update changes to a channel
	function updateRemoteChannelData(endpoint) {
		var new_channel = JSON.parse( localStorage.getItem('channel') );

		$.each( channels, function( index, channel ) {
			if(channel.id == new_channel.id) {
				channels[index] = new_channel;
			}
		});
		json_data.channels = channels;
		console.log(JSON.stringify(json_data));
		//$.post( endpoint, function( json_data ) {
		//});
	}

	// update channel order
	function updateRemoteChannelOrder(endpoint) {
		// need code to rebuild data.channels array in new order
		var new_list = channel_list.find('li'),
			new_order = [];
		$.each( new_list, function(index, obj) {
			new_order.push( channels[$(this).attr('id')] );
		});
		json_data.channels = new_order;
		console.log(JSON.stringify(json_data));
		//$.post( endpoint, function( json_data ) {
		//});
	}

	// load content sources
	function getContentSources(endpoint) {
		$.get( endpoint, function( data ) {
			localStorage.setItem('sources', JSON.stringify(data.sources));
		})
	}

	function getApps(endpoint) {
		$.get( endpoint, function( data ) {
			localStorage.setItem('apps', JSON.stringify(data));
		});
		//.fail(function( jqXHR, textStatus, errorThrown ) {
		//	console.log( textStatus, errorThrown );
		//});
	}

	function setSelectedChannel(id) {
		$.each( channels, function( index, channel ) {
			if(index == id) {
				localStorage.setItem('channel', JSON.stringify(this));
				populateEditForm(channel);
			}
		});
	}

	channel_list.sortable({
		disabled: true
	});
	channel_list.disableSelection();

	// functions for channel re-ordering
	function reorderState(enabled) {
		if(enabled) {
			channel_list.sortable( "option", "disabled", false );
			reorder_button.hide();
			reorder_actions.parent().show();
		} else {
			channel_list.sortable( "option", "disabled", true );
			reorder_button.show();
			reorder_actions.parent().hide();
		}
	}

	// event listeners
	reorder_button.click(function(){
		reorderState(true);
	});

	// save channel reorder
	reorder_actions.first().click(function(){
		console.log('saved');
		// save channel data function call
		updateRemoteChannelOrder('bleh');
		reorderState(false);
	});

	// cancel channel reorder
	reorder_actions.last().click(function(){
		console.log('cancelled');
		channel_list.sortable("cancel");
		reorderState(false);
	});

	// set selected channel
	channel_list.on('click', 'li', function(){
		setSelectedChannel(this.id);
		channel_list.find('li').removeClass('selected');
		$(this).addClass('selected');
	});

	// functions for channel edits
	function populateEditForm(data) {
		apps = JSON.parse( localStorage.getItem('apps') );
		edit_form.find('legend').html(apps[appID].name + ' :: ' + data.name);
		edit_form.find('#title').val(data.name);
		edit_form.find('#description').val(data.description);
		edit_form.find('#keywords').val(data.keywords.join(", "));
		edit_form.find('#status option').each(function(){
			if (this.value == data.mode) {
				$(this).prop('selected', true);
			}
		});

		// content sources
		var all_sources = JSON.parse( localStorage.getItem('sources') ),
			source,
			source_list = [];
		$.each( data.content_sources, function( id, arr ) {
			$.each( arr, function( k, v) {
				source = all_sources[id][v];
				source_list.push('<li id="' + id + '_' + v + '">' + source.name + ' (' + apps[id].site_name + ')</li>');
			});
		});
		edit_form.find('#content_sources').html(source_list.join("\n"));

		// populate brand select for content sources
		var options_list = [];
		$.each(apps, function( id, value ) {
			options_list.push('<option value="'+ id +'"' + (id == appID ? ' selected':'') + '>' + value.site_name + '</option>');
		});
		edit_form.find('#brand').html(options_list.join("\n"));
		setSourcesByBrand(appID);
	}

	function setSourcesByBrand(id) {
		var brand_sources = JSON.parse( localStorage.getItem('sources') )[id],
			current = JSON.parse( localStorage.getItem('channel') ).content_sources[id],
			options_list = [];
		$.each(brand_sources, function( id, value ) {
			options_list.push('<option value="'+ id +'"' + ($.inArray(id, current) > -1 ? ' disabled':'') + '>' + value.name + '</option>');
		});
		edit_form.find('#source').html(options_list.join("\n"));
	}

	function updateChannel(formData) {
		var channel = JSON.parse( localStorage.getItem('channel') ),
			channelBtn = channel_list.find('li#' + channel.id),
			source, new_data = {};
		$.each(formData.serializeArray(), function(_, kv) {
			if (new_data.hasOwnProperty(kv.name)) {
				new_data[kv.name] = $.makeArray(new_data[kv.name]);
				new_data[kv.name].push(kv.value);
			}
			else {
				new_data[kv.name] = kv.value;
			}
		});
		// name/title
		if (channel.name != new_data.title) {
			channel.name = new_data.title;
			channelBtn.html(channel_icon + channel.name);
			edit_form.find('legend').html(apps[appID].name + ' :: ' + channel.name);
		}
		// mode/status
		if (channel.mode != new_data.status) {
			channel.mode = new_data.status;
			channelBtn.removeClass('draft live inactive').addClass(channel.mode);
		}
		channel.description = new_data.description;
		channel.keywords = new_data.keywords.split(", ");

		// content sources
		channel.content_sources = {}; // zero it out
		edit_form.find('#content_sources li').each(function() {
			source = this.id.split('_');
			if (!channel.content_sources.hasOwnProperty(source[0])) {
				channel.content_sources[source[0]] = [source[1]];
			} else {
				channel.content_sources[source[0]].push( source[1] );
			}
		});

		localStorage.setItem('channel', JSON.stringify(channel));
		// API CALL TO UPDATE CHANNEL DATA
		updateRemoteChannelData('bleh');
	}

	function editState(enabled) {
		var inputs = edit_form.find('input, select');
		if(enabled) {
			inputs.prop('disabled', false);
			edit_button.hide();
			edit_actions.parent().show();
			edit_form.find('#content_sources li').prepend(trash_icon);
			edit_form.find('#add_source').show();
		} else {
			inputs.prop('disabled', true);
			edit_button.show();
			edit_actions.parent().hide();
			edit_form.find('#content_sources li span').remove();
			edit_form.find('#add_source').hide();
		}
	};

	// event listeners
	edit_button.click(function(e){
		e.preventDefault();
		editState(true);
	});

	// save channel edits
	edit_actions.first().click(function(e){
		e.preventDefault();
		updateChannel(edit_form);
		editState(false);
	});

	// cancel channel edits
	edit_actions.last().click(function(e){
		e.preventDefault();
		console.log('cancelled');
		editState(false);
		// restore original values from local storage
		populateEditForm(JSON.parse( localStorage.getItem('channel') ));
	});

	// remove content source
	edit_form.find('#content_sources').on('click', 'span', function(){
		var source = $(this).parent(),
			msg = 'Are you sure you want to remove the content source "' + source.text().trim() + '"?',
			sourceID = source.attr('id').split('_');

		if (confirm(msg)) {
			// re-enable the source in the add sources drop-down?
			// $('select[name="source"]').find('option[value="' + sourceID[1] + '"]').prop('disabled', false);
			source.remove();
		}
	});

	// update sources when brand changes
	edit_form.find('#brand').change(function(){
		var selected = $(this).find('option:selected').val();
		setSourcesByBrand(selected);
	});

	// add new source
	edit_form.find('#add_source button').click(function(e){
		e.preventDefault();
		// get the values for the selected source
		var brand = $(this).parent().find('select:first option:selected').val(),
			source = $(this).parent().find('select:last option:selected');
		// add to the source list
		edit_form.find('#content_sources').append('<li id="' + brand + '_' + source.val() + '">' + trash_icon + source.text() + ' (' + apps[brand].site_name + ')</li>');
		source.prop('disabled', true);
	});
});