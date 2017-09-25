import 'babel-polyfill';

class BitMap {
  /**
   * BitMap Compressed BitMap, which optimized the space of the traditional bitMap
   * @param  {...[Int32]} data
   */
  constructor(...data) {
    // Initail bitMap with [0, 6, 0, 0, 0, 0, 0, 0]
    const buffer = new ArrayBuffer(32);
    /**
     * @type {Uint32Array}
     */
    this.bitMap = new Uint32Array(buffer);
    this.bitMap[0] = 6;

    // Set data in bitMap
    this.set(...data);
  }
  /**
   * Validate whether input is valid unsigned int32
   * @param  {[unsigned int32]} value
   * @return {bool}
   */
  _validate(value) {
    if(
      typeof value !== 'number' ||
      Number.isNaN(value) ||
      !Number.isFinite(value) ||
      value < 0 ||
      ~~value !== value
    ) {
      if(typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
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
  _getUpperBound(index, upperBound = 0, bitMap) {
    bitMap = bitMap || this.bitMap;
    return upperBound + ((bitMap[index + 1] + bitMap[index]) << 5) - !index;
  }
   /**
   * Enlarge capacity of bitMap
   * @param  {number} i insert point index
   * @param  {Object} config configuration
   * @config {number} [wordLength = 2] the number of continuous data elements
   * @config {number} runningLength the running length
   * @config {number} value the value to be set
   */
  _splice(i, config) {
    if(config) {
      // enlarge capacity
      const buffer = new ArrayBuffer(this.bitMap.buffer.byteLength + 16);
      const bitMap = new Uint32Array(buffer);

      // copy value
      [...this.bitMap.slice(0, i), config.wordLength || 2, config.runningLength || 0, ...(config.isHightBit ? [0, config.value] : [config.value, 0]), ...this.bitMap.slice(i)].forEach((value, index) => {
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
  _getNextIndex(index, bitMap) {
    bitMap = bitMap || this.bitMap;
    return index + bitMap[index] + 2;
  }
  /**
   * Set single value in bitMap
   * @param {[unsigned int32]} value
   */
  _set(value) {
    // validate input
    if(!this._validate(value)) {
      return;
    }

    let totalRunningLength = 0;
    let isSet = false;
    let upperBound = 0;
    const bitValue = 1 << (value % 32);
    const isHightBit = value % 64 > 31;
    for(let i = 0, len = this.bitMap.length; i < len;) {
      const runningLength = this.bitMap[i + 1];
      const wordLength = this.bitMap[i];
      const prevUpperBound = upperBound;
      upperBound = this._getUpperBound(i, upperBound);

      if(value <= upperBound) {
        const index = (value - upperBound + (wordLength << 5)) >> 5;
        if(index >= 0) {
          /*
            situation1. value is in cur interval [lowerBound, upperBound]
           */

          // step1 set bitValue
          this.bitMap[i + index + 2] |= bitValue;
        } else {
          /*
            situation2. value is in the interval (prevUpperBound, lowerBound)
           */
          const newRunningLength = (value - prevUpperBound) >> 6 << 1;

          // step1. modify cur running length of the cur interval
          this.bitMap[i + 1] = runningLength - newRunningLength - 2;

          // step2. insert new interval for the value
          this._splice(i, {
            runningLength: newRunningLength,
            value: bitValue,
            isHightBit
          });
        }
        isSet = true;
        break;
      }
      totalRunningLength += runningLength;
      i = this._getNextIndex(i);
    }

    if(!isSet) {
      /*
        situation3. value is greater than the upper bound
       */

      // step1 insert new interval for the value
      const newRunningLength = (value - upperBound) >> 6 << 1;
      this._splice(this.bitMap.length, {
        runningLength: newRunningLength,
        value: bitValue,
        isHightBit
      });
    }
  }
  /**
   * parse data stored in the position index
   * @param  {number} index
   * @param  {number} baseValue cur base value
   * @return {[number]}
   */
  _parseData(index, baseValue) {
    const result = [];
    const value = this.bitMap[index];

    if(!value) {
      return result;
    }

    for(let i = 0; i < 32; ++i) {
      if(1 << i & value) {
        result.push(i + baseValue);
      }
    }
    return result;
  }
  /**
   * set data
   * @param  {...[Int32]} data
   */
  set(...data) {
    // sort data ascendingly into improve set performace
    const sortedData = [...data].sort((a, b) => a - b);

    sortedData.forEach(value => {
      this._set(value);
    });
  }
  /**
   * remove data
   * @param  {...[Int32]} data [description]
   */
  remove(...data) {
    /*
      get difference set of new bitmap to this.bitMap
     */
    const removeBitMap = new BitMap(...data);
    this.bitMap = removeBitMap.xor(this.or(removeBitMap)).bitMap;
  }
  /**
   * get the list which the bitMap represent
   * @return {[Int32]} [description]
   */
  get() {
    const result = [];
    for(let i = 0, offset = 0, len = this.bitMap.length; i < len;) {
      const wordLength = this.bitMap[i] + 2;
      offset += this.bitMap[i + 1] << 5;
      let index = 2;
      for(;index < wordLength; index++) {
        result.push(...this._parseData(i + index, offset));
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
  includes(value) {
    if(!this._validate(value)) {
      return false;
    }
    let upperBound = 0;
    const bitValue = 1 << (value % 32);
    for(let i = 0, len = this.bitMap.length; i < len;) {
      upperBound = this._getUpperBound(i, upperBound);
      if(value <= upperBound) {
        const index = (value - upperBound + (this.bitMap[i] << 5)) >> 5;
        if(index >= 0) {
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
  or(bitMap) {
    return this.xor(bitMap, (a, b) => a | b);
  }
  /**
   * logic and operation
   * @param  {BitMap} bitMap
   * @return {BitMap}
   */
  and(bitMap) {
    // calulate result bitMap capacity
    const runningLengthSet = new Set();
    const intersection = new Set();
    bitMap = bitMap.bitMap;
    const len1 = this.bitMap.length;
    const len2 = bitMap.length;
    let upperBound = 0;
    for(let i = 0; i < len1;) {
      upperBound = this._getUpperBound(i, upperBound);
      runningLengthSet.add(upperBound);
      i = this._getNextIndex(i);
    }
    upperBound = 0;
    for(let i = 0; i < len2;) {
      upperBound = this._getUpperBound(i, upperBound, bitMap);
      if(runningLengthSet.has(upperBound)) {
        intersection.add(upperBound);
      }
      i = this._getNextIndex(i, bitMap);
    }

    // create result typedArray
    const buffer = new ArrayBuffer((intersection.size + 1) << 4);
    const result = new Uint32Array(buffer);

    let upperBound1 = 0;
    let upperBound2 = 0;
    upperBound = 0;
    for(let i = 0, j = 0, k = 0; i < len1 && j < len2;) {
      if(this._getUpperBound(i, upperBound1) === this._getUpperBound(j, upperBound2, bitMap)) {
        /*
          in the same interval
         */
        const runningLength1 = this.bitMap[i + 1];
        const runningLength2 = bitMap[j + 1];
        const wordLength = bitMap[j];

        result[k] = wordLength;
        result[k + 1] = ((runningLength2 << 5) + upperBound2 - upperBound) >> 5;
        let offset = 2;
        while(offset < wordLength + 2) {
          result[k + offset] = bitMap[j + offset] & this.bitMap[i + offset];
          offset++;
        }

        upperBound1 = this._getUpperBound(i, upperBound1);
        upperBound2 = this._getUpperBound(j, upperBound2, bitMap);
        upperBound = this._getUpperBound(k, upperBound, result);
        i = this._getNextIndex(i);
        j = this._getNextIndex(j, bitMap);
        k = this._getNextIndex(k, result);
      } else if(this._getUpperBound(i, upperBound1) < this._getUpperBound(j, upperBound2, bitMap)) {
        /*
          the upper bound of this bitMap is lower
         */
         i = this._getNextIndex(i);
      } else {
        /*
          the upper bound of bitMap is lower
         */
        j = this._getNextIndex(j, bitMap);;
      }
    }

    // create result bitMap
    const resultBitMap = new BitMap();
    resultBitMap.bitMap = result;
    return resultBitMap;
  }
  /**
   * logic xor operation
   * @param  {BitMap} bitMap
   * @param {Function} [callback = (a, b) => a ^ b] callback function
   * @return {BitMap}
   */
  xor(bitMap, callback = (a, b) => a ^ b) {
    // calulate result bitMap capacity
    const runningLengthSet = new Set();
    bitMap = bitMap.bitMap;
    const len1 = this.bitMap.length;
    const len2 = bitMap.length;
    let upperBound = 0;
    for(let i = 0; i < len1;) {
      upperBound = this._getUpperBound(i, upperBound);
      runningLengthSet.add(upperBound);
      i = this._getNextIndex(i);
    }
    upperBound = 0;
    for(let i = 0; i < len2;) {
      upperBound = this._getUpperBound(i, upperBound, bitMap);
      runningLengthSet.add(upperBound);
      i = this._getNextIndex(i, bitMap);
    }

    // create result typedArray
    const buffer = new ArrayBuffer((runningLengthSet.size + 1) << 4);
    const result = new Uint32Array(buffer);

    let upperBound1 = 0;
    let upperBound2 = 0;
    upperBound = 0;
    let k = 0;
    for(let i = 0, j = 0; i < len1 || j < len2;) {
      if(i < len1 && j < len2 && this._getUpperBound(i, upperBound1) === this._getUpperBound(j, upperBound2, bitMap)) {
        /*
          in the same interval
         */
        const runningLength1 = this.bitMap[i + 1];
        const runningLength2 = bitMap[j + 1];
        const wordLength = bitMap[j];
        result[k] = wordLength;
        result[k + 1] = ((runningLength2 << 5) + upperBound2 - upperBound) >> 5;
        let offset = 2;
        let isAllZero = true;
        while(offset < wordLength + 2) {
          result[k + offset] = callback(bitMap[j + offset], this.bitMap[i + offset]);
          if(result[k + offset]) {
            isAllZero = false;
          }
          offset++;
        }

        upperBound1 = this._getUpperBound(i, upperBound1);
        upperBound2 = this._getUpperBound(j, upperBound2, bitMap);
        i = this._getNextIndex(i);
        j = this._getNextIndex(j, bitMap);

        if(result[k + 1] === 0 || !isAllZero) {
          upperBound = this._getUpperBound(k, upperBound, result);
          k = this._getNextIndex(k, result);
        }
      } else if(j >= len2 || (i < len1 && this._getUpperBound(i, upperBound1) < this._getUpperBound(j, upperBound2, bitMap))) {
        /*
          the upper bound of this bitMap is lower
         */
        const runningLength1 = this.bitMap[i + 1];
        let offset = 0;
        for(let len = this.bitMap[i] + 2; offset < len; offset++) {
          result[k + offset] = this.bitMap[i + offset];
        }
        result[k + 1] = ((runningLength1 << 5) + upperBound1 - upperBound) >> 5;

        upperBound1 = this._getUpperBound(i, upperBound1);
        upperBound = this._getUpperBound(k, upperBound, result);
        i = this._getNextIndex(i);
        k = this._getNextIndex(k, result);
      } else {
        /*
          the upper bound of bitMap is lower
         */
        const runningLength2 = bitMap[j + 1];
        let offset = 0;
        for(let len = bitMap[j] + 2; offset < len; offset++) {
          result[k + offset] = bitMap[j + offset];
        }
        result[k + 1] = ((runningLength2 << 5) + upperBound2 - upperBound) >> 5;

        upperBound2 = this._getUpperBound(j, upperBound2, bitMap);
        upperBound = this._getUpperBound(k, upperBound, result);
        j = this._getNextIndex(j, bitMap);
        k = this._getNextIndex(k, result);
      }
    }

    // create result bitMap
    const resultBitMap = new BitMap();
    resultBitMap.bitMap = result.slice(0, k);
    return resultBitMap;
  }

}
export default BitMap;
https://topbuzz.onelink.me/id1049682098?af_web_dp=https%3A%2F%2Fitunes.apple.com%2Fapp%2Fapple-store%2Fid1049682098%3Fpt%3D1613620%26ct%3Dinterstitialdownload%26mt%3D8&af_dp=newsmaster%3A%2F%2Fhome%2Fnews&af_force_dp=false&pid=sharing_install&af_sub1=1106&c=line"