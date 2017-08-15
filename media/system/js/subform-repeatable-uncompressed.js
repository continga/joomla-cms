/**
 * @copyright  Copyright (C) 2005 - 2017 Open Source Matters, Inc. All rights reserved.
 * @license    GNU General Public License version 2 or later; see LICENSE.txt
 */

;(function($){
	"use strict";
	$.subformRepeatable = function(container, options){
		this.$container = $(container);

		// check if alredy exist
		if(this.$container.data("subformRepeatable")){
			return self;
		}

		// Add a reverse reference to the DOM object
		this.$container.data("subformRepeatable", self);

		// merge options
		this.options = $.extend({}, $.subformRepeatable.defaults, options);

		// template for the repeating group
		this.template = '';

		// prepare a row template, and find available field names
		this.prepareTemplate();

		// check rows container
		this.$containerRows = this.options.rowsContainer ? this.$container.find(this.options.rowsContainer) : this.$container;

		// last row number, help to avoid the name duplications
        this.lastRowNum = this.$containerRows.find(this.options.repeatableElement).length;

		// To avoid scope issues,
		var self = this;

		// bind add button
		this.$container.on('click', this.options.btAdd, function (e) {
			e.preventDefault();
			var after = $(this).parents(self.options.repeatableElement);
			if(!after.length){
				after = null;
			}
			self.addRow(after);
		});

		// bind remove button
		this.$container.on('click', this.options.btRemove, function (e) {
			e.preventDefault();
			var $row = $(this).parents(self.options.repeatableElement);
			self.removeRow($row);
		});

		// bind move button
		if(this.options.btMove){
			this.$containerRows.sortable({
				items: this.options.repeatableElement,
				handle: this.options.btMove,
				tolerance: 'pointer'
			});
		}

		// tell all that we a ready
		this.$container.trigger('subform-ready');
	};

	// prepare a template that we will use repeating
	$.subformRepeatable.prototype.prepareTemplate = function(){
		// create from template
		if (this.options.rowTemplateSelector) {
			var tmplElement = this.$container.find(this.options.rowTemplateSelector).last()[0] || {};
			// do a decodeURIComponent() here, because the text value is url encoded
			// to make sure we dont destroy our markup
			this.template = decodeURIComponent($.trim(tmplElement.text || tmplElement.textContent)); //(text || textContent) is IE8 fix
		}
		// create from existing rows
		else {
			//find first available
			var row = this.$container.find(this.options.repeatableElement).get(0),
				$row = $(row).clone();

			// clear scripts that can be attached to the fields
			try {
				this.clearScripts($row);
			} catch (e) {
				if(window.console){
					console.log(e);
				}
			}

			this.template = $row.prop('outerHTML');
		}
	};

	// add new row
	$.subformRepeatable.prototype.addRow = function(after){
		// count how much we already have
		var count = this.$containerRows.find(this.options.repeatableElement).length;
		if(count >= this.options.maximum){
			return null;
		}

		// make new from template
		var row = $.parseHTML(this.template);

		//add to container
		if(after){
			$(after).after(row);
		} else {
			this.$containerRows.append(row);
		}

		var $row = $(row);
		//add marker that it is new
		$row.attr('data-new', 'true');
		// fix names and id`s, and reset values
		this.fixUniqueAttributes($row, count);

		// try find out with related scripts,
		// tricky thing, so be careful
		try {
			this.fixScripts($row);
		} catch (e) {
			if(window.console){
				console.log(e);
			}
		}

		// tell everyone about the new row
		this.$container.trigger('subform-row-add', $row);
		return $row;
	};

	// remove row
	$.subformRepeatable.prototype.removeRow = function($row){
		// count how much we have
		var count = this.$containerRows.find(this.options.repeatableElement).length;
		if(count <= this.options.minimum){
			return;
		}

		// tell everyoune about the row will be removed
		this.$container.trigger('subform-row-remove', $row);
		$row.remove();
	};

	// fix names ind id`s for field that in $row
	$.subformRepeatable.prototype.fixUniqueAttributes = function($row, count){
		var group = $row.attr('data-group'),// current group name
			basename = $row.attr('data-base-name'), // group base name, without count
			count    = count || 0,
			countnew = Math.max(this.lastRowNum + 1, count + 1),
    		groupnew = basename + countnew; // new group name

		this.lastRowNum = countnew;
		$row.attr('data-group', groupnew);

		// Fix inputs that have a "name" attribute
		var haveName = $row.find('[name]'),
			ids = {}; // Collect id for fix checkboxes and radio

		for (var i = 0, l = haveName.length; i < l; i++) {
			var $el     = $(haveName[i]),
				name    = $el.attr('name'),
				id      = name.replace(/(\[\]$)/g, '').replace(/(\]\[)/g, '__').replace(/\[/g, '_').replace(/\]/g, ''), // id from name
				nameNew = name.replace('[' + group + '][', '['+ groupnew +']['), // New name
				idNew   = id.replace(group, groupnew), // Count new id
				countMulti = 0, // count for multiple radio/checkboxes
				forOldAttr = id; // Fix "for" in the labels

			if ($el.prop('type') === 'checkbox' && name.match(/\[\]$/)) { // <input type="checkbox" name="name[]"> fix
				// Recount id
				countMulti = ids[id] ? ids[id].length : 0;
				if (!countMulti) {
					// Set the id for fieldset and group label
					$el.closest('fieldset.checkboxes').attr('id', idNew);
					$row.find('label[for="' + id + '"]').attr('for', idNew).attr('id', idNew + '-lbl');
				}
				forOldAttr = forOldAttr + countMulti;
				idNew = idNew + countMulti;
			}
			else if ($el.prop('type') === 'radio') { // <input type="radio"> fix
				// Recount id
				countMulti = ids[id] ? ids[id].length : 0;
				if (!countMulti) {
					// Set the id for fieldset and group label
					$el.closest('fieldset.radio').attr('id', idNew);
					$row.find('label[for="' + id + '"]').attr('for', idNew).attr('id', idNew + '-lbl');
				}
				forOldAttr = forOldAttr + countMulti;
				idNew = idNew + countMulti;
			}

			// Cache already used id
			if (ids[id]) {
				ids[id].push(true);
			} else {
				ids[id] = [true];
			}

			// Replace the name to new one
			$el.attr('name', nameNew);
			// Set new id
			$el.attr('id', idNew);
			// Guess there a label for this input
			$row.find('label[for="' + forOldAttr + '"]').attr('for', idNew).attr('id', idNew + '-lbl');
		}

		// Create 2 strings: basename + old group, and basename + new group
		var search = '[' + basename + '][' + group + ']',
		    replace = '[' + basename + '][' + groupnew + ']';
		// Does our row still contain the basename + old group? This should not happen!
		if ($row.html().indexOf(search) !== -1) {
			console.log('Old basename+group still existant in $row html');
		}
		// Recursively replace our basename + old group with basename + new group
		// inside of nested subform template elements.
		this.recursiveReplaceNested($row, search, replace);
	};

	$.subformRepeatable.prototype.recursiveReplaceNested = function($row, search, replace) {
		// Try to find the row remplate selector in $row
		var nestedTemplates = $row.find(this.options.rowTemplateSelector);
		if (nestedTemplates.length < 1) {
			return;
		}
		// If we found it, iterate over the found ones (might be more than one!)
		for (var i = 0; i < nestedTemplates.length; i++) {
			// Get the element
			var nestedTemplate = $(nestedTemplates[i]);
			// Do our replacement; the HTML content is urlencoded, so we urlencode
			// our search/replace parameters, also because we then don't need to
			// regexp escape the search parameter (we are using regexp to globally replace).
			nestedTemplate.html(nestedTemplate.html().replace(
				new RegExp(encodeURIComponent(search), 'g'),
				encodeURIComponent(replace)
			));
			// URI decode its HTML content to could have access to deeper nested ones
			var nestedTemplateContent = decodeURIComponent(nestedTemplate.html());
			// Create a new element out of it
			var nestedElement = $(nestedTemplateContent);
			// And recursively do the replacements more times
			this.recursiveReplaceNested(nestedElement, search, replace);
			// Now re-insert the replaced html content into our element
			nestedTemplate.html(encodeURIComponent(nestedElement.get(0).prop('outerHTML')));
		}
	};

	// remove scripts attached to fields
	// @TODO: make thing better when something like that will be accepted https://github.com/joomla/joomla-cms/pull/6357
	$.subformRepeatable.prototype.clearScripts = function($row){
		// destroy chosen if any
		if($.fn.chosen){
			$row.find('select.chzn-done').each(function(){
				var $el = $(this);
				$el.next('.chzn-container').remove();
				$el.show().addClass('fix-chosen');
			});
		}
	};

	// method for hack the scripts that can be related
	// to the one of field that in given $row
	$.subformRepeatable.prototype.fixScripts = function($row){
		// fix media field
		$row.find('a[onclick*="jInsertFieldValue"]').each(function(){
				var $el = $(this),
				inputId = $el.siblings('input[type="text"]').attr('id'),
				$select = $el.prev(),
				oldHref = $select.attr('href');
			// update the clear button
			$el.attr('onclick', "jInsertFieldValue('', '" + inputId + "');return false;")
			// update select button
			$select.attr('href', oldHref.replace(/&fieldid=(.+)&/, '&fieldid=' + inputId + '&'));
		});

		// bootstrap based Media field
		if($.fn.fieldMedia){
			$row.find('.field-media-wrapper').fieldMedia();
		}

		// bootstrap tooltips
		if($.fn.tooltip){
			$row.find('.hasTooltip').tooltip({html: true, container: "body"});
		}

		// bootstrap based User field
		if($.fn.fieldUser){
			$row.find('.field-user-wrapper').fieldUser();
		}

		// another modals
		if(window.SqueezeBox && window.SqueezeBox.assign){
			SqueezeBox.assign($row.find('a.modal').get(), {parse: 'rel'});
		}

		// subforms in subforms
		$row.find('div.subform-repeatable').subformRepeatable();
	};

	// defaults
	$.subformRepeatable.defaults = {
		// button selector for "add" action, must be unique per nested subform!
		btAdd: ".group-add",
		// button selector for "remove" action, must be unique per nested subform!
		btRemove: ".group-remove",
		// button selector for "move" action, must be unique per nested subform!
		btMove: ".group-move",
		// minimum repeating
		minimum: 0,
		// maximum repeating
		maximum: 10,
		// selector for the repeatable element inside the main container,
		// must be unique per nested subform!
		repeatableElement: ".subform-repeatable-group",
		// selector for the row template element with URL-encoded template inside it,
		// must *NOT* be unique per nested subform!
		rowTemplateSelector: 'script.subform-repeatable-template-section',
		// container for rows, same as main container by default
		rowsContainer: null
	};

	$.fn.subformRepeatable = function(options){
		return this.each(function(){
			var options = options || {},
				data = $(this).data();

			if(data.subformRepeatable){
				// Alredy initialized, nothing to do here
				return;
			}

			for (var p in data) {
				// check options in the element
				if (data.hasOwnProperty(p)) {
					options[p] = data[p];
				}
			}

			var inst = new $.subformRepeatable(this, options);
			$(this).data('subformRepeatable', inst);
		});
	};

	// initialise all available
	// wait when all will be loaded, important for scripts fix
	$(window).on('load', function(){
		$('div.subform-repeatable').subformRepeatable();
	});

})(jQuery);
