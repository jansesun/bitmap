'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

require('babel-polyfill');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BitMap = function () {
  /**
   * BitMap Compressed BitMap, which optimized the space of the traditional bitMap
   * @param  {...[Int32]} data
   */
  function BitMap() {
    _classCallCheck(this, BitMap);

    // Initail bitMap with [0, 6, 0, 0, 0, 0, 0, 0]
    var buffer = new ArrayBuffer(32);
    /**
     * @type {Uint32Array}
     */
    this.bitMap = new Uint32Array(buffer);
    this.bitMap[0] = 6;

    // Set data in bitMap
    this.set.apply(this, arguments);
  }
  /**
   * Validate whether input is valid unsigned int32
   * @param  {[unsigned int32]} value
   * @return {bool}
   */


  _createClass(BitMap, [{
    key: '_validate',
    value: function _validate(value) {
      if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value) || value < 0 || ~~value !== value) {
        if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
          console.error('Value should be a native number');
        }
        return false;
      }
      return true;
    }
    /**
     * Calculate the upper bound of cur interval
     * @param  {number} index cur interval startIndex
     * @param {number} [upperBound = 0] old upperBound
     * @param  {Uint32Array} [bitMap] calculate this.bitMap defaultly
     * @return {number}
     */

  }, {
    key: '_getUpperBound',
    value: function _getUpperBound(index) {
      var upperBound = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      var bitMap = arguments[2];

      bitMap = bitMap || this.bitMap;
      return upperBound + (bitMap[index + 1] + bitMap[index] << 5) - !index;
    }
    /**
    * Enlarge capacity of bitMap
    * @param  {number} i insert point index
    * @param  {Object} config configuration
    * @config {number} [wordLength = 2] the number of continuous data elements
    * @config {number} runningLength the running length
    * @config {number} value the value to be set
    */

  }, {
    key: '_splice',
    value: function _splice(i, config) {
      if (config) {
        // enlarge capacity
        var buffer = new ArrayBuffer(this.bitMap.buffer.byteLength + 16);
        var bitMap = new Uint32Array(buffer);

        // copy value
        [].concat(_toConsumableArray(this.bitMap.slice(0, i)), [config.wordLength || 2, config.runningLength || 0], _toConsumableArray(config.isHightBit ? [0, config.value] : [config.value, 0]), _toConsumableArray(this.bitMap.slice(i))).forEach(function (value, index) {
          bitMap[index] = value;
        });

        this.bitMap = bitMap;
      }
    }
    /**
     * get next index of bitMap
     * @param  {number} index
     * @param  {BitMap} [bitMap=this.bitMap]
     * @return {number} the next index
     */

  }, {
    key: '_getNextIndex',
    value: function _getNextIndex(index, bitMap) {
      bitMap = bitMap || this.bitMap;
      return index + bitMap[index] + 2;
    }
    /**
     * Set single value in bitMap
     * @param {[unsigned int32]} value
     */

  }, {
    key: '_set',
    value: function _set(value) {
      // validate input
      if (!this._validate(value)) {
        return;
      }

      var totalRunningLength = 0;
      var isSet = false;
      var upperBound = 0;
      var bitValue = 1 << value % 32;
      var isHightBit = value % 64 > 31;
      for (var i = 0, len = this.bitMap.length; i < len;) {
        var runningLength = this.bitMap[i + 1];
        var wordLength = this.bitMap[i];
        var prevUpperBound = upperBound;
        upperBound = this._getUpperBound(i, upperBound);

        if (value <= upperBound) {
          var index = value - upperBound + (wordLength << 5) >> 5;
          if (index >= 0) {
            /*
              situation1. value is in cur interval [lowerBound, upperBound]
             */

            // step1 set bitValue
            this.bitMap[i + index + 2] |= bitValue;
          } else {
            /*
              situation2. value is in the interval (prevUpperBound, lowerBound)
             */
            var newRunningLength = value - prevUpperBound >> 6 << 1;

            // step1. modify cur running length of the cur interval
            this.bitMap[i + 1] = runningLength - newRunningLength - 2;

            // step2. insert new interval for the value
            this._splice(i, {
              runningLength: newRunningLength,
              value: bitValue,
              isHightBit: isHightBit
            });
          }
          isSet = true;
          break;
        }
        totalRunningLength += runningLength;
        i = this._getNextIndex(i);
      }

      if (!isSet) {
        /*
          situation3. value is greater than the upper bound
         */

        // step1 insert new interval for the value
        var _newRunningLength = value - upperBound >> 6 << 1;
        this._splice(this.bitMap.length, {
          runningLength: _newRunningLength,
          value: bitValue,
          isHightBit: isHightBit
        });
      }
    }
    /**
     * parse data stored in the position index
     * @param  {number} index
     * @param  {number} baseValue cur base value
     * @return {[number]}
     */

  }, {
    key: '_parseData',
    value: function _parseData(index, baseValue) {
      var result = [];
      var value = this.bitMap[index];

      if (!value) {
        return result;
      }

      for (var i = 0; i < 32; ++i) {
        if (1 << i & value) {
          result.push(i + baseValue);
        }
      }
      return result;
    }
    /**
     * set data
     * @param  {...[Int32]} data
     */

  }, {
    key: 'set',
    value: function set() {
      var _this = this;

      for (var _len = arguments.length, data = Array(_len), _key = 0; _key < _len; _key++) {
        data[_key] = arguments[_key];
      }

      // sort data ascendingly into improve set performace
      var sortedData = [].concat(data).sort(function (a, b) {
        return a - b;
      });

      sortedData.forEach(function (value) {
        _this._set(value);
      });
    }
    /**
     * remove data
     * @param  {...[Int32]} data [description]
     */

  }, {
    key: 'remove',
    value: function remove() {
      for (var _len2 = arguments.length, data = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        data[_key2] = arguments[_key2];
      }

      /*
        get difference set of new bitmap to this.bitMap
       */
      var removeBitMap = new (Function.prototype.bind.apply(BitMap, [null].concat(data)))();
      this.bitMap = removeBitMap.xor(this.or(removeBitMap)).bitMap;
    }
    /**
     * get the list which the bitMap represent
     * @return {[Int32]} [description]
     */

  }, {
    key: 'get',
    value: function get() {
      var result = [];
      for (var i = 0, offset = 0, len = this.bitMap.length; i < len;) {
        var wordLength = this.bitMap[i] + 2;
        offset += this.bitMap[i + 1] << 5;
        var index = 2;
        for (; index < wordLength; index++) {
          result.push.apply(result, _toConsumableArray(this._parseData(i + index, offset)));
          offset += 32;
        }
        i = this._getNextIndex(i);
      }
      return result;
    }
    /**
     * whether value exsit in the bitMap
     * @param  {Int32} value
     * @return {bool}
     */

  }, {
    key: 'includes',
    value: function includes(value) {
      if (!this._validate(value)) {
        return false;
      }
      var upperBound = 0;
      var bitValue = 1 << value % 32;
      for (var i = 0, len = this.bitMap.length; i < len;) {
        upperBound = this._getUpperBound(i, upperBound);
        if (value <= upperBound) {
          var index = value - upperBound + (this.bitMap[i] << 5) >> 5;
          if (index >= 0) {
            return !!(this.bitMap[i + index + 2] & bitValue);
          } else {
            return false;
          }
        }
        i = this._getNextIndex(i);
      }
      return false;
    }
    /**
     * logic or operation
     * @param  {BitMap} bitMap
     * @return {BitMap}
     */

  }, {
    key: 'or',
    value: function or(bitMap) {
      return this.xor(bitMap, function (a, b) {
        return a | b;
      });
    }
    /**
     * logic and operation
     * @param  {BitMap} bitMap
     * @return {BitMap}
     */

  }, {
    key: 'and',
    value: function and(bitMap) {
      // calulate result bitMap capacity
      var runningLengthSet = new Set();
      var intersection = new Set();
      bitMap = bitMap.bitMap;
      var len1 = this.bitMap.length;
      var len2 = bitMap.length;
      var upperBound = 0;
      for (var i = 0; i < len1;) {
        upperBound = this._getUpperBound(i, upperBound);
        runningLengthSet.add(upperBound);
        i = this._getNextIndex(i);
      }
      upperBound = 0;
      for (var _i = 0; _i < len2;) {
        upperBound = this._getUpperBound(_i, upperBound, bitMap);
        if (runningLengthSet.has(upperBound)) {
          intersection.add(upperBound);
        }
        _i = this._getNextIndex(_i, bitMap);
      }

      // create result typedArray
      var buffer = new ArrayBuffer(intersection.size + 1 << 4);
      var result = new Uint32Array(buffer);

      var upperBound1 = 0;
      var upperBound2 = 0;
      upperBound = 0;
      for (var _i2 = 0, j = 0, k = 0; _i2 < len1 && j < len2;) {
        if (this._getUpperBound(_i2, upperBound1) === this._getUpperBound(j, upperBound2, bitMap)) {
          /*
            in the same interval
           */
          var runningLength1 = this.bitMap[_i2 + 1];
          var runningLength2 = bitMap[j + 1];
          var wordLength = bitMap[j];

          result[k] = wordLength;
          result[k + 1] = (runningLength2 << 5) + upperBound2 - upperBound >> 5;
          var offset = 2;
          while (offset < wordLength + 2) {
            result[k + offset] = bitMap[j + offset] & this.bitMap[_i2 + offset];
            offset++;
          }

          upperBound1 = this._getUpperBound(_i2, upperBound1);
          upperBound2 = this._getUpperBound(j, upperBound2, bitMap);
          upperBound = this._getUpperBound(k, upperBound, result);
          _i2 = this._getNextIndex(_i2);
          j = this._getNextIndex(j, bitMap);
          k = this._getNextIndex(k, result);
        } else if (this._getUpperBound(_i2, upperBound1) < this._getUpperBound(j, upperBound2, bitMap)) {
          /*
            the upper bound of this bitMap is lower
           */
          _i2 = this._getNextIndex(_i2);
        } else {
          /*
            the upper bound of bitMap is lower
           */
          j = this._getNextIndex(j, bitMap);;
        }
      }

      // create result bitMap
      var resultBitMap = new BitMap();
      resultBitMap.bitMap = result;
      return resultBitMap;
    }
    /**
     * logic xor operation
     * @param  {BitMap} bitMap
     * @param {Function} [callback = (a, b) => a ^ b] callback function
     * @return {BitMap}
     */

  }, {
    key: 'xor',
    value: function xor(bitMap) {
      var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function (a, b) {
        return a ^ b;
      };

      // calulate result bitMap capacity
      var runningLengthSet = new Set();
      bitMap = bitMap.bitMap;
      var len1 = this.bitMap.length;
      var len2 = bitMap.length;
      var upperBound = 0;
      for (var i = 0; i < len1;) {
        upperBound = this._getUpperBound(i, upperBound);
        runningLengthSet.add(upperBound);
        i = this._getNextIndex(i);
      }
      upperBound = 0;
      for (var _i3 = 0; _i3 < len2;) {
        upperBound = this._getUpperBound(_i3, upperBound, bitMap);
        runningLengthSet.add(upperBound);
        _i3 = this._getNextIndex(_i3, bitMap);
      }

      // create result typedArray
      var buffer = new ArrayBuffer(runningLengthSet.size + 1 << 4);
      var result = new Uint32Array(buffer);

      var upperBound1 = 0;
      var upperBound2 = 0;
      upperBound = 0;
      var k = 0;
      for (var _i4 = 0, j = 0; _i4 < len1 || j < len2;) {
        if (_i4 < len1 && j < len2 && this._getUpperBound(_i4, upperBound1) === this._getUpperBound(j, upperBound2, bitMap)) {
          /*
            in the same interval
           */
          var runningLength1 = this.bitMap[_i4 + 1];
          var runningLength2 = bitMap[j + 1];
          var wordLength = bitMap[j];
          result[k] = wordLength;
          result[k + 1] = (runningLength2 << 5) + upperBound2 - upperBound >> 5;
          var offset = 2;
          var isAllZero = true;
          while (offset < wordLength + 2) {
            result[k + offset] = callback(bitMap[j + offset], this.bitMap[_i4 + offset]);
            if (result[k + offset]) {
              isAllZero = false;
            }
            offset++;
          }

          upperBound1 = this._getUpperBound(_i4, upperBound1);
          upperBound2 = this._getUpperBound(j, upperBound2, bitMap);
          _i4 = this._getNextIndex(_i4);
          j = this._getNextIndex(j, bitMap);

          if (result[k + 1] === 0 || !isAllZero) {
            upperBound = this._getUpperBound(k, upperBound, result);
            k = this._getNextIndex(k, result);
          }
        } else if (j >= len2 || _i4 < len1 && this._getUpperBound(_i4, upperBound1) < this._getUpperBound(j, upperBound2, bitMap)) {
          /*
            the upper bound of this bitMap is lower
           */
          var _runningLength = this.bitMap[_i4 + 1];
          var _offset = 0;
          for (var len = this.bitMap[_i4] + 2; _offset < len; _offset++) {
            result[k + _offset] = this.bitMap[_i4 + _offset];
          }
          result[k + 1] = (_runningLength << 5) + upperBound1 - upperBound >> 5;

          upperBound1 = this._getUpperBound(_i4, upperBound1);
          upperBound = this._getUpperBound(k, upperBound, result);
          _i4 = this._getNextIndex(_i4);
          k = this._getNextIndex(k, result);
        } else {
          /*
            the upper bound of bitMap is lower
           */
          var _runningLength2 = bitMap[j + 1];
          var _offset2 = 0;
          for (var _len3 = bitMap[j] + 2; _offset2 < _len3; _offset2++) {
            result[k + _offset2] = bitMap[j + _offset2];
          }
          result[k + 1] = (_runningLength2 << 5) + upperBound2 - upperBound >> 5;

          upperBound2 = this._getUpperBound(j, upperBound2, bitMap);
          upperBound = this._getUpperBound(k, upperBound, result);
          j = this._getNextIndex(j, bitMap);
          k = this._getNextIndex(k, result);
        }
      }

      // create result bitMap
      var resultBitMap = new BitMap();
      resultBitMap.bitMap = result.slice(0, k);
      return resultBitMap;
    }
  }]);

  return BitMap;
}();

exports.default = BitMap;
module.exports = exports['default'];
