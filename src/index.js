import 'babel-polyfill';

class BitMap {
  constructor(...data) {
    const buffer = new ArrayBuffer(32);
    this.bitMap = new Uint32Array(buffer);
    this.bitMap[0] = 6;
    this.set(...data);
  }
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
  set(...data) {
    const sortedData = [...data].sort((a, b) => a - b);
    sortedData.forEach(value => {
      this._set(value);
    });
  }
  _getUpperBound(index, bitMap) {
    bitMap = bitMap || this.bitMap;
    return ((bitMap[index + 1] + bitMap[index]) << 5) - !index;
  }
  _set(value) {
    if(!this._validate(value)) {
      return;
    }
    let totalRunningLength = 0;
    let isSet = false;
    let upperBound = 0;
    const bitValue = 1 << (value % 64);
    for(let i = 0, len = this.bitMap.length; i < len;) {
      const runningLength = this.bitMap[i + 1];
      const wordLength = this.bitMap[i];
      const prevUpperBound = upperBound;
      upperBound += this._getUpperBound(i);
      if(value <= upperBound) {
        const index = (value - upperBound + (wordLength << 5)) >> 5;
        if(index >= 0) {
          this.bitMap[i + index + 2] |= bitValue;
        } else {
          const newRunningLength = (value - prevUpperBound) >> 5;
          this.bitMap[i + 1] = runningLength - newRunningLength - 2;
          // 插入新节点
          this._splice(i, {
            runningLength: newRunningLength,
            value: bitValue
          });
        }
        isSet = true;
        break;
      }
      totalRunningLength += runningLength;
      i += wordLength + 2;
    }
    if(!isSet) {
      const newRunningLength = (value - upperBound) >> 5;
      this._splice(this.bitMap.length, {
        runningLength: newRunningLength,
        value: bitValue
      });
    }
  }
  _parseIndex(value, offset) {
    const result = [];
    if(!value) {
      return result;
    }
    for(let i = 0; i < 32; ++i) {
      if(1 << i & value) {
        result.push(i + offset);
      }
    }
    return result;
  }
  get() {
    const result = [];
    for(let i = 0, offset = 0, len = this.bitMap.length; i < len;) {
      const wordLength = this.bitMap[i] + 2;
      offset += this.bitMap[i + 1] << 5;
      let index = 2;
      for(;index < wordLength; index++) {
        result.push(...this._parseIndex(this.bitMap[i + index], offset));
        offset += 32;
      }
      i += index;
    }
    return result;
  }
  remove(...data) {
    const removeBitMap = new BitMap(...data);
    this.bitMap = removeBitMap.xor(this.or(removeBitMap)).bitMap;
  }
  includes(value) {
    if(!this._validate(value)) {
      return false;
    }
    let upperBound = 0;
    const bitValue = 1 << (value % 64);
    for(let i = 0, len = this.bitMap.length; i < len;) {
      upperBound += this._getUpperBound(i);
      if(value <= upperBound) {
        const index = (value - upperBound + (this.bitMap[i] << 5)) >> 5;
        if(index >= 0) {
          return !!(this.bitMap[i + index + 2] & bitValue);
        } else {
          return false;
        }
      }
      i += this.bitMap[i] + 2;
    }
    return false;
  }
  or(bitMap) {
    return this.xor(bitMap, (a, b) => a | b);
  }
  and(bitMap) {
    const runningLengthSet = new Set();
    const intersection = new Set();
    bitMap = bitMap.bitMap;
    const len1 = this.bitMap.length;
    const len2 = bitMap.length;
    let upperBound = 0;
    for(let i = 0; i < len1;) {
      upperBound += this._getUpperBound(i);
      runningLengthSet.add(upperBound);
      i += this.bitMap[i] + 2;
    }
    upperBound = 0;
    for(let i = 0; i < len2;) {
      upperBound += this._getUpperBound(i, bitMap);
      if(runningLengthSet.has(upperBound)) {
        intersection.add(upperBound);
      }
      i += bitMap[i] + 2;
    }
    const buffer = new ArrayBuffer((intersection.size + 1) << 4);
    const result = new Uint32Array(buffer);
    let upperBound1 = 0;
    let upperBound2 = 0;
    upperBound = 0;
    for(let i = 0, j = 0, k = 0; i < len1 && j < len2;) {
      if(upperBound1 + this._getUpperBound(i) === upperBound2 + this._getUpperBound(j, bitMap)) {
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
        upperBound1 += this._getUpperBound(i);
        upperBound2 += this._getUpperBound(j, bitMap);
        upperBound += this._getUpperBound(k, result);
        i += offset;
        j += offset;
        k += offset;
      } else if(upperBound1 + this._getUpperBound(i) < upperBound2 + this._getUpperBound(j, bitMap)) {
        i += this.bitMap[i] + 2;
      } else {
        j += bitMap[j] + 2;
      }
    }
    const resultBitMap = new BitMap();
    resultBitMap.bitMap = result;
    return resultBitMap;
  }
  xor(bitMap, callback = (a, b) => a ^ b) {
    const runningLengthSet = new Set();
    bitMap = bitMap.bitMap;
    const len1 = this.bitMap.length;
    const len2 = bitMap.length;
    let upperBound = 0;
    for(let i = 0; i < len1;) {
      upperBound += this._getUpperBound(i);
      runningLengthSet.add(upperBound);
      i += this.bitMap[i] + 2;
    }
    upperBound = 0;
    for(let i = 0; i < len2;) {
      upperBound += this._getUpperBound(i, bitMap);
      runningLengthSet.add(upperBound);
      i += bitMap[i] + 2;
    }
    const buffer = new ArrayBuffer((runningLengthSet.size + 1) << 4);
    const result = new Uint32Array(buffer);
    let upperBound1 = 0;
    let upperBound2 = 0;
    upperBound = 0;
    let k = 0;
    for(let i = 0, j = 0; i < len1 || j < len2;) {
      if(i < len1 && j < len2 && upperBound1 + this._getUpperBound(i) === upperBound2 + this._getUpperBound(j, bitMap)) {
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
        upperBound1 += this._getUpperBound(i);
        upperBound2 += this._getUpperBound(j, bitMap);
        i += offset;
        j += offset;
        if(result[k + 1] === 0 || !isAllZero) {
          upperBound += this._getUpperBound(k, result);
          k += offset;
        }
      } else if(j >= len2 || (i < len1 && upperBound1 + this._getUpperBound(i) < upperBound2 + this._getUpperBound(j, bitMap))) {
        const runningLength1 = this.bitMap[i + 1];
        let offset = 0;
        for(let len = this.bitMap[i] + 2; offset < len; offset++) {
          result[k + offset] = this.bitMap[i + offset];
        }
        result[k + 1] = ((runningLength1 << 5) + upperBound1 - upperBound) >> 5;
        upperBound1 += this._getUpperBound(i);
        upperBound += this._getUpperBound(i, result);
        i += offset;
        k += offset;
      } else {
        const runningLength2 = bitMap[j + 1];
        let offset = 0;
        for(let len = bitMap[j] + 2; offset < len; offset++) {
          result[k + offset] = bitMap[j + offset];
        }
        result[k + 1] = ((runningLength2 << 5) + upperBound2 - upperBound) >> 5;
        upperBound2 += this._getUpperBound(j, bitMap);
        upperBound += this._getUpperBound(k, result);
        j += offset;
        k += offset;
      }
    }
    const resultBitMap = new BitMap();
    resultBitMap.bitMap = result.slice(0, k);
    return resultBitMap;
  }
  _splice(i, config) {
    if(config) {
      const buffer = new ArrayBuffer(this.bitMap.buffer.byteLength + 16);
      const bitMap = new Uint32Array(buffer);
      [...this.bitMap.slice(0, i), config.wordLength || 2, config.runningLength || 0, config.value, 0, ...this.bitMap.slice(i)].forEach((value, index) => {
        bitMap[index] = value;
      });
      this.bitMap = bitMap;
    }
  }
}
export default BitMap;