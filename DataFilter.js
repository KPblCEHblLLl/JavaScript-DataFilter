/**
 * @param {DataFilterOptions} options
 * @class
 */
function DataFilter(options) {
	this._options = options;

	/** @type jQuery */
	this._filters = null;
	/** @type jQuery */
	this._items = null;

	/** @type String */
	this._filterModelAttr = "filterModel";

	/** @type jQuery */
	this._eventTarget = $("<div/>");
}

DataFilter.prototype.init = function() {
	this.reloadItems();
	this.reloadFilters();
	this._bindListners();
	this._applyFilter();
};

DataFilter.prototype.reloadItems = function() {
	this._items = $(this._options.itemsSelector);
};

DataFilter.prototype.reloadFilters = function() {
	this._filters = $(this._options.filterSelector);
	for (var i = 0; i < this._filters.length; i++) {
		var filter = $(this._filters[i]);
		this._updateFilterModel(filter);
	}
};

/** @param {jQuery} filter */
DataFilter.prototype._updateFilterModel = function(filter) {
	var model = new SingleFilterDataModel(filter, this._options);
	filter.data(this._filterModelAttr, model);
};

/**
 * @param {jQuery} filter
 * @return SingleFilterDataModel
 * @private
 */
DataFilter.prototype._getFilterModel = function(filter) {
	/**  @type SingleFilterDataModel */
	var model = filter.data(this._filterModelAttr);
	return model;
};

DataFilter.prototype._bindListners = function() {
	var self = this;
	this._filters.on("click", this._options.filterItemSelector, function(event) {
		var filterItem = $(this);
		if (filterItem.hasClass(self._options.filterItemDisabledClass)) {
			return;
		}
		var isConcat = event.ctrlKey;
		self._applyFilterChoose(filterItem, isConcat);
	});
};

/**
 * @param {jQuery} filterItem
 * @param {Boolean} [isConcat]
 * @private
 */
DataFilter.prototype._applyFilterChoose = function(filterItem, isConcat) {
	isConcat = isConcat === true;
	if (!this._options.isMultiple) {
		isConcat = false;
	}

	var filter = filterItem.parents(this._options.filterSelector);
	var filterValue = this._getFilterValue(filterItem);

	if (filterValue == this._options.resetFilterValue) {
		this._resetFilter(filter);
	} else {
		if (!isConcat) {
			this._resetFilter(filter);
		}
		if (this._options.toggleOnFilterItemChoose) {
			filterItem.toggleClass(this._options.filterItemSelectedClass);
		} else {
			filterItem.addClass(this._options.filterItemSelectedClass);
		}
	}

	this._updateFilterModel(filter);
	this._applyFilter();

	var filterModel = this._getFilterModel(filter);
	this.trigger(this.events.filterChanged, [filterModel.name, filterModel.values, filterModel.selectetItems]);
};

/**
 * @param {jQuery} filterItem
 * @return String
 * @private
 */
DataFilter.prototype._getFilterValue = function(filterItem) {
	return String(filterItem.data(this._options.filterValueAttr) || "");
};

/**
 *
 * @param {jQuery} filter
 * @return String
 * @private
 */
DataFilter.prototype._getFilterName = function(filter) {
	return filter.data(this._options.filterNameAttr);
};

/** @param {jQuery} filter */
DataFilter.prototype._resetFilter = function(filter) {
	filter.find(this._options.filterItemSelector).removeClass(this._options.filterItemSelectedClass);
};

DataFilter.prototype._applyFilter = function() {
	this._items.removeClass(this._options.itemDisallowedClass);
	var allowedItems = this._getAllowedItems();
	var disallowedItems = this._items.not(allowedItems);

	disallowedItems.addClass(this._options.itemDisallowedClass);
	this._markDisabledFilters();
};

/**
 * @param {jQuery} [filters]
 * @param {jQuery} [items]
 * @return jQuery
 * @private
 */
DataFilter.prototype._getAllowedItems = function(filters, items) {
	filters = filters || this._filters;
	items = items || this._items;

	var allowedItems = [];

	for (var i = 0; i < items.length; i++) {
		var item = $(items[i]);
		if (this._isItemAllowed(item, filters)) {
			allowedItems.push(item.get(0));
		}
	}

	return $(allowedItems);
};

/**
 * @param {jQuery} item
 * @param {jQuery} filters
 * @return Boolean
 * @private
 */
DataFilter.prototype._isItemAllowed = function(item, filters) {
	var isAllowed = true;
	for (var i = 0; i < filters.length; i++) {
		var filter = $(filters[i]);
		var filterModel = this._getFilterModel(filter);
		if (!filterModel.isItemAllowed(item)) {
			isAllowed = false;
			break;
		}
	}
	return isAllowed;
};

DataFilter.prototype._markDisabledFilters = function() {
	for (var i = 0; i < this._filters.length; i++) {
		var filter = $(this._filters[i]);
		var filterModel = this._getFilterModel(filter);

		var otherFiltes = this._filters.not(filter);
		var otherAllowedItems = this._getAllowedItems(otherFiltes);
		filterModel.applyAllowedItems(otherAllowedItems);
		this._disableFilterItems(filter);
	}
};

/**
 * @param {jQuery} filter
 * @private
 */
DataFilter.prototype._disableFilterItems = function(filter) {
	var filterModel = this._getFilterModel(filter);
	var allowedValues = filterModel.allowedValues;

	var filterItems = filter.find(this._options.filterItemSelector);

	filterItems.removeClass(this._options.filterItemDisabledClass);
	for (var i = 0; i < filterItems.length; i++) {
		var item = $(filterItems[i]);
		var filterValue = this._getFilterValue(item);
		if (filterValue != this._options.resetFilterValue && $.inArray(filterValue, allowedValues) == -1) {
			item.addClass(this._options.filterItemDisabledClass);
		} else {
			item.removeClass(this._options.filterItemDisabledClass);
		}
	}
};

/**
 * @param {String} eventName
 * @param {Function} callback
 * @return DataFilter
 */
DataFilter.prototype.on = function(eventName, callback) {
	this._eventTarget.on.apply(this._eventTarget, arguments);
	return this;
};

/**
 * @param {String} eventName
 * @param {*} eventData
 * @return DataFilter
 */
DataFilter.prototype.trigger = function(eventName, eventData) {
	this._eventTarget.trigger.apply(this._eventTarget, arguments);
	return this;
};

/** @type DataFilterEvents */
DataFilter.prototype.events = new DataFilterEvents();

/** @class */
function DataFilterEvents() {}

/** @type String */
DataFilterEvents.prototype.filterChanged = "filterChanged";


/**
 * @param {jQuery} filter
 * @param {DataFilterOptions} options
 * @class
 */
function SingleFilterDataModel(filter, options) {
	/** @type DataFilterOptions */
	this._options = options;

	/** @type String */
	this.name = filter.data(this._options.filterNameAttr);

	/** @type String[] */
	this.values = [];

	/** @type String[] */
	this.allowedValues = [];

	/** @type jQuery */
	this.selectetItems = filter.find("." + this._options.filterItemSelectedClass);

	this._setSelectedValues();
}

SingleFilterDataModel.prototype._setSelectedValues = function() {
	var selectetItems = this.selectetItems;
	for (var i = 0; i < selectetItems.length; i++) {
		var item = $(selectetItems[i]);
		var value = String(item.data(this._options.filterValueAttr) || "");
		this.values.push(value);
	}
};

/**
 * @param {jQuery} item
 * @return Boolean
 */
SingleFilterDataModel.prototype.isItemAllowed = function(item) {
	if (!this.hasValue()) {
		return true;
	}

	var isAllowed = false;
	var itemFilterValues = this._extractItemFilterValues(item);
	for (var i = 0; i < itemFilterValues.length; i++) {
		var value = itemFilterValues[i];
		if ($.inArray(value, this.values) != -1) {
			isAllowed = true;
			break;
		}
	}

	return isAllowed;
};

/**
 * @param {jQuery} item
 * @return String[]
 */
SingleFilterDataModel.prototype._extractItemFilterValues = function(item) {
	var dataAttrName = this._options.itemFilterPrefix + this.name;
	var filterData = String(item.data(dataAttrName) || "");

	var values = filterData.split(this._options.itemFilterSeparator);
	return values;
};

/** @return Boolean */
SingleFilterDataModel.prototype.hasValue = function() {
	return this.values.length != 0;
};

/** @param {jQuery} allowedItems */
SingleFilterDataModel.prototype.applyAllowedItems = function(allowedItems) {
	this.allowedValues = [];
	for (var i = 0; i < allowedItems.length; i++) {
		var item = $(allowedItems[i]);
		var values = this._extractItemFilterValues(item);
		for (var j = 0; j < values.length; j++) {
			var value = values[j];
			if ($.inArray(value, this.allowedValues) == -1) {
				this.allowedValues.push(value);
			}
		}
	}
};



/** @class */
function DataFilterOptions() {
	/** @type String */
	this.filterSelector = "";
	/** @type String */
	this.filterItemSelector = "";
	/** @type String */
	this.itemsSelector = "";

	/** @type String */
	this.filterItemSelectedClass = "s-selected";
	/** @type String */
	this.filterItemDisabledClass = "s-disabled";
	/** @type String */
	this.itemDisallowedClass = "s-disallowed";


	/** @type String */
	this.filterValueAttr = "filter_value";
	/** @type String */
	this.filterNameAttr = "filter_name";
	/** @type String */
	this.itemFilterPrefix = "filter_";

	/** @type String */
	this.itemFilterSeparator = ";";


	/** @type Boolean */
	this.isMultiple = false;
	/** @type Boolean */
	this.toggleOnFilterItemChoose = true;

	/** @type String */
	this.resetFilterValue = "__all";
}
