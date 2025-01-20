const fs = require('fs')
const path = require('path');

function check(val) {
	var value = typeof val == 'undefined' ? undefined : val;

	function isUndefined() { return typeof value == 'undefined'; }
	function isNull() { return value == null; }
	function isObject() { return typeof value == 'object'; }
	function isFunction() { return typeof value == 'function'; }
	function isString() { return typeof value == 'string'; }
	function isEmptyString() { return isString() && value.trim().length == 0; }
	function isNotEmptyString() { return isString() && value.trim().length > 0; }
	function isInt() { return Number.isInteger(value); }
	function isNumber() { return Number.isFinite(value); }
	function isUndefinedOrNull() { return isUndefined() || isNull(); }
	function isArray() { return !isUndefinedOrNull() && value.constructor.name == 'Array' }

	function has(key, type) {
		let vk = value[key]

		if (!check(key).isString())
			return false

		if (check(type).isFunction())
			return type(vk)

		if (check(type).isNotEmptyString())
			return typeof vk == type || vk.constructor.name == type

		return !check(vk).isUndefinedOrNull()
	}
	function hasFunction(key) { return has(key, 'function'); }
	function hasObject(key) { return has(key, 'object'); }
	function hasString(key) { return has(key, 'string'); }
	function hasNumber(key) { return has(key, 'number'); }

	function getValue() { return value; }

	return {
		isUndefined,
		isNull,
		isObject,
		isFunction,
		isInt,
		isNumber,
		isString,
		isEmptyString,
		isNotEmptyString,
		isUndefinedOrNull,
		has: has,
		hasFunction,
		hasObject,
		hasString,
		hasNumber,
		value: getValue,
		isArray
	};
}

function array(val) {
	let value = typeof val == 'undefined' || val.constructor.name != 'Array' ? [] : val

	function has(v) { return value.indexOf(v) >= 0 }
	function notHas(v) { return value.indexOf(v) < 0 }

	function hasAll(arr) {
		if (check(arr).isArray() && arr.length > 0) {
			for (let e of arr) {
				if (!has(e)) return false
			}
		}
		return true
	}

	function hasOne(arr) {
		if (check(arr).isArray() && arr.length > 0) {
			for (let e of arr) {
				if (has(e)) return true
			}
		}
		return false
	}

	function pushNew(v) {
		if (notHas(v))
			value.push(v)
		return value
	}
	function extend(arr) {
		if (check(arr).isArray())
			for (let v of arr)
				pushNew(v)
		return value
	}
	function remove(id) {
		if (notHas(id)) return
		let newArray = []
		for (let k of value)
			if (k != id) newArray.push(k)
		value = newArray
		return newArray
	}

	function removeIndex(ti) {
		let newArray = []
		for (let i = 0; i < value.length; i++) {
			if (i !== ti) newArray.push(value[i])
		}
		value = newArray
		return newArray
	}

	function getValue() { return value }

	return {
		has,
		notHas,
		hasAll,
		hasOne,
		pushNew,
		extend,
		remove,
		removeIndex,
		value: getValue
	}
}

function obj(val) {
	var value = !check(val).isObject() ? {} : val
	var chk = check(val)

	function has(k, t) { return chk.has(k, t) }
	function addToArray(k, v, options) {
		if (!has(k, "Array")) value[k] = []
		if (options.new && array(value[k]).has(v)) return
		value[k].push(v)
	}
	function newProperty(p, val) {
		if (!has(p)) value[p] = val
	}

	return {
		has,
		addToArray,
		newProperty
	}
}

let c = (function () {


	// Ensure the logs directory exists
	const logsPath = path.join(process.cwd(), 'logs');
	if (!fs.existsSync(logsPath)) {
		fs.mkdirSync(logsPath, { recursive: true });
	}

	// let d = (new Date()).toUTCString().replaceAll(',', '').replaceAll(':', '.')
	const date = new Date();
	const d = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}.${date.getMinutes().toString().padStart(2, '0')}.${date.getSeconds().toString().padStart(2, '0')}`;

	const outputLog = fs.createWriteStream(`./logs/${d}.csv`)
	const errorsLog = fs.createWriteStream(`./logs/${d}errors.csv`)
	const PRINT_TO_CONSOLE = true


	const cons = new console.Console(outputLog, errorsLog)

	// Write header to the logs file
	cons.log('Timestamp,clientID,eventID,finished,theme,language,layout,font_size,information,category,message');

	function time() {
		let d = new Date()

		return `${d.toLocaleTimeString()}.${d.getMilliseconds()}`
	}

	function log(m) {
		m = `${time()},${m}`
		cons.log(m)
		if (PRINT_TO_CONSOLE) { console.log(m) }
	}

	function error(m) {
		cons.error(m)
		if (PRINT_TO_CONSOLE) { console.error(m) }
	}

	return {
		log,
		error
	}
})()

module.exports = {
	check, array, obj, c
}

