

var assert = require('assert');
var _ = require('lodash');
var jsot = require('../')

describe('Operations', function() {

	var states = [
		{
			l: {},
			r: {a:'a'},
			d: { a: { $op: 'set', value:'a', prev: undefined } }
		},{
			l: {a: { b: 0 }},
			r: {a: { b: 1 }},
			d: { a: { b: { $op: 'set', value:1, prev: 0 } } }
		},{
			l: {b: 0},
			r: {a:'a', b:0},
			d: { a: { $op: 'set', value:'a', prev: undefined } }
		}];

	function testOperation() {
		var ops = _.toArray(arguments);
		var start = ops.shift();
		var end = ops.pop();

		_.each(ops, function(op) {
			// Each op composed with its inverse should be identity
			assert.deepEqual(jsot.compose(op, jsot.inverse(op)), {});
		})

		var res = ops.reduce(jsot.apply, start);
		assert.deepEqual(res, end, 'unexpected apply result');
		
		var composed = ops.concat({}).reduceRight(jsot.compose);
		res = jsot.apply(start, composed);
		assert.deepEqual(res, end, 'unexpected composed apply result ' + JSON.stringify(res) + ' with ' + JSON.stringify(composed));

		var diff = jsot.diff(start, end);
		assert.deepEqual(diff, composed, 'diff not equal composed ' + JSON.stringify(diff) + ' != ' + JSON.stringify(composed));
	}

	it('should be json compatible', function() {

		op = {
			a: {
				$op:'set',
				value: 'a'
			}	
		};

		assert.deepEqual(op, JSON.parse(JSON.stringify(op)));
	})

	it('undefined is an operation', function() {

		testOperation({}, undefined, {});
	})

	it('undefined and {} are identity', function() {

		testOperation({a:1}, undefined, {}, {a:1});
	})

	it('simple set', function() {

		testOperation(
			{a:1}, 
			{a: { $op: 'set', value: 2, prev:1 }}, 
			{a: { $op: 'set', value: 3, prev:2 }}, 
			{a:3});
	})

	it('set on changeset', function() {

		testOperation(
			{a:3},
			{a: { $op: 'set', prev: 3, value: { b: 2 } }}, 
			{a: { b:{ $op: 'set', prev: 2, value:1 } }}, 
			{a:{b:1}}
		);

		testOperation(
			{a:{b:1}},
			{a: { b:{ $op: 'set', value: 2, prev: 1 } }}, 
			{a: { $op: 'set', value: 3, prev: { b: 2 } }}, 
			{a:3}
		);
	})

})