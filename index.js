
var _ = require('lodash');

var _clone = _.cloneDeep;
var _equal = _.isEqual;

function _join(left, right, callback) {
	var res = {};
	Object.keys(left).forEach(function(key) {
		var value = callback(left[key], right[key], key);
		if(value !== undefined)
			res[key] = value;
	})
	Object.keys(right).forEach(function(key) {
		if(key in left)
			return;
		var value = callback(left[key], right[key], key);
		if(value !== undefined)
			res[key] = value;
	})	
	return res;
}

var operations = {
	'set': {
		apply: function(value) {
			if(!_equal(this.prev, value))
				throw new Error('set: expected ' + JSON.stringify(this.prev) + ' found ' + JSON.stringify(value));
			return this.value;
		},

		compose: function(other) {
			var value = this.value;
			var prev = apply(this.prev, inverse(other));
			if(_equal(prev, value))
				return undefined;
			return {
				$op: 'set',
				value: this.value,
				prev: prev
			}
		},

		inverse: function() {
			return {
				$op: 'set',
				value: this.prev,
				prev: this.value
			}
		}
	}
}

function isChangeSet(changeset) {
	return typeof changeset == 'undefined' || typeof changeset == 'object' && changeset != null && !(changeset instanceof Array);
}

function checkChangeSet(changeset) {
	if(!isChangeSet(changeset))
		throw new TypeError('Invalid changeset: ' + JSON.stringify(changeset));
}

function _getOp(changeset) {
	if(_.has(changeset, '$op')) {
		var opName = changeset.$op;
		if(!_.has(operations, opName))
			throw new Error('Unknown operation: ' + opName);
		return operations[opName];
	}
}

function _emptyOb(ob) {
	if(_.isEmpty(ob))
		return;
	return ob;
}

function compose(left, right) {
	return _compose(left, right) || {};
}

function _compose(left, right) {
	checkChangeSet(left);
	checkChangeSet(right);

	if(!left || !right)
		return left || right || {};
	
	var op;
	if(op = _getOp(left)) {
		return op.compose.call(left, right);
	}
	
	if(op = _getOp(right)) {
		return inverse(compose(inverse(right), inverse(left)));
	}

	return _emptyOb(_join(left, right, _compose));
}

function apply(value, changeset) {
	try {
		return _apply(value, changeset)
	}
	catch(e) {
		throw new Error('Apply error: (' + e.message + ') ' + JSON.stringify(value) + ' -> ' + JSON.stringify(changeset));
	}
}

function _apply(value, cs) {
	if(cs === undefined)
		return _clone(value);

	if(typeof cs != 'object' || cs == null)
		throw new Error('Invalid change ' + cs);
	
	if('$op' in cs) {
		var op = operations[cs.$op];
		if(!op)
			throw new Error('Unknown operation ' + cs.$op);
		return op.apply.call(cs, value);
	}

	return _join(value, cs, _apply);
}

function diff(left, right) {

	if(typeof left == 'object' && left != null && typeof right == 'object' && right != null) {
		return _join(left, right, diff);
	} 
	if(left !== right) {
		return {
			$op: 'set',
			value: right && _clone(right),
			prev: left && _clone(left)
		}
	}
}

function inverse(changeset) {
	var op = _getOp(changeset);
	if(op)
		return op.inverse.call(changeset);
	return _.mapValues(changeset, inverse);
}

//exports.Document = Document;
exports.inverse = inverse;
exports.compose = compose;
exports.apply = apply;
exports.diff = diff;

