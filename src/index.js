import 'babel-polyfill';

class BitMap {
  constructor(...data) {
    const buffer = new ArrayBuffer(32);
    this.bitMap = new Uint32Array(buffer);
    this.bitMap[0] = 6;
    this.set(...data);
  }
  set(...data) {
    const sortedData = [...data].sort((a, b) => a - b);
    sortedData.forEach(value => {
      this._set(value);
    });
  }
  _getUpperBound(runningLength, wordLength) {
    return ((runningLength + wordLength) << 5) - !runningLength;
  }
  _set(value) {
    let totalRunningLength = 0;
    let isSet = false;
    let upperBound = 0;
    const bitValue = 1 << (value % 64);
    for(let i = 0, len = this.bitMap.length; i < len;) {
      const runningLength = this.bitMap[i + 1];
      const wordLength = this.bitMap[i];
      const prevUpperBound = upperBound;
      upperBound += this._getUpperBound(runningLength, wordLength);
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
  or(bitMap) {
    const runningLengthSet = new Set();
    bitMap = bitMap.bitMap;
    const len1 = this.bitMap.length;
    const len2 = bitMap.length;
    for(let i = 0; i < len1;) {
      runningLengthSet.add(this.bitMap[i + 1]);
      i += this.bitMap[i] + 2;
    }
    for(let i = 0; i < len2;) {
      runningLengthSet.add(bitMap[i + 1]);
      i += bitMap[i] + 2;
    }
    const buffer = new ArrayBuffer((runningLengthSet.size + 1) << 4);
    const result = new Uint32Array(buffer);
    let upperBound1 = 0;
    let upperBound2 = 0;
    let upperBound = 0;
    for(let i = 0, j = 0, k = 0; i < len1 || j < len2;) {
      if(i < len1 && j < len2 && this.bitMap[i + 1] === bitMap[j + 1]) {
        const runningLength1 = this.bitMap[i + 1];
        const runningLength2 = bitMap[j + 1];
        const wordLength = bitMap[j];
        result[k] = wordLength;
        result[k + 1] = ((runningLength2 << 5) + upperBound2 - upperBound) >> 5;
        let offset = 2;
        while(offset < wordLength + 2) {
          result[k + offset] = bitMap[j + offset] | this.bitMap[i + offset];
          offset++;
        }
        upperBound1 += this._getUpperBound(runningLength1, this.bitMap[i]);
        upperBound2 += this._getUpperBound(runningLength2, bitMap[j]);
        upperBound += this._getUpperBound(result[k + 1], result[k]);
        i += offset;
        j += offset;
        k += offset;
      } else if(j >= len2 || (i < len1 && this.bitMap[i + 1] < bitMap[j + 1])) {
        const runningLength1 = this.bitMap[i + 1];
        let offset = 0;
        for(let len = this.bitMap[i] + 2; offset < len; offset++) {
          result[k + offset] = this.bitMap[i + offset];
        }
        result[k + 1] = ((runningLength1 << 5) + upperBound1 - upperBound) >> 5;
        upperBound1 += this._getUpperBound(runningLength1, this.bitMap[i]);
        upperBound += this._getUpperBound(result[k + 1], result[k]);
        i += offset;
        k += offset;
      } else {
        const runningLength2 = bitMap[j + 1];
        let offset = 0;
        for(let len = bitMap[j] + 2; offset < len; offset++) {
          result[k + offset] = bitMap[j + offset];
        }
        result[k + 1] = ((runningLength2 << 5) + upperBound2 - upperBound) >> 5;
        upperBound2 += this._getUpperBound(runningLength2, bitMap[j]);
        upperBound += this._getUpperBound(result[k + 1], result[k]);
        j += offset;
        k += offset;
      }
    }
    const resultBitMap = new BitMap();
    resultBitMap.bitMap = result;
    return resultBitMap;
  }
  and(bitMap) {
    const runningLengthSet = new Set();
    const intersection = new Set();
    bitMap = bitMap.bitMap;
    const len1 = this.bitMap.length;
    const len2 = bitMap.length;
    for(let i = 0; i < len1;) {
      runningLengthSet.add(this.bitMap[i + 1]);
      i += this.bitMap[i] + 2;
    }
    for(let i = 0; i < len2;) {
      const runningLength = bitMap[i + 1];
      if(runningLengthSet.has(runningLength)) {
        intersection.add(runningLength);
      }
      i += bitMap[i] + 2;
    }
    const buffer = new ArrayBuffer((intersection.size + 1) << 4);
    const result = new Uint32Array(buffer);
    let upperBound1 = 0;
    let upperBound2 = 0;
    let upperBound = 0;
    for(let i = 0, j = 0, k = 0; i < len1 && j < len2;) {
      if(this.bitMap[i + 1] === bitMap[j + 1]) {
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
        upperBound1 += this._getUpperBound(runningLength1, this.bitMap[i]);
        upperBound2 += this._getUpperBound(runningLength2, bitMap[j]);
        upperBound += this._getUpperBound(result[k + 1], result[k]);
        i += offset;
        j += offset;
        k += offset;
      } else if(this.bitMap[i + 1] < bitMap[j + 1]) {
        i += this.bitMap[i] + 2;
      } else {
        j += bitMap[j] + 2;
      }
    }
    const resultBitMap = new BitMap();
    resultBitMap.bitMap = result;
    return resultBitMap;
  }
  xor(bitMap) {
    const runningLengthSet = new Set();
    bitMap = bitMap.bitMap;
    const len1 = this.bitMap.length;
    const len2 = bitMap.length;
    for(let i = 0; i < len1;) {
      runningLengthSet.add(this.bitMap[i + 1]);
      i += this.bitMap[i] + 2;
    }
    for(let i = 0; i < len2;) {
      runningLengthSet.add(bitMap[i + 1]);
      i += bitMap[i] + 2;
    }
    const buffer = new ArrayBuffer((runningLengthSet.size + 1) << 4);
    const result = new Uint32Array(buffer);
    let upperBound1 = 0;
    let upperBound2 = 0;
    let upperBound = 0;
    let k = 0;
    for(let i = 0, j = 0; i < len1 || j < len2;) {
      if(i < len1 && j < len2 && this.bitMap[i + 1] === bitMap[j + 1]) {
        const runningLength1 = this.bitMap[i + 1];
        const runningLength2 = bitMap[j + 1];
        const wordLength = bitMap[j];
        result[k] = wordLength;
        result[k + 1] = ((runningLength2 << 5) + upperBound2 - upperBound) >> 5;
        let offset = 2;
        let isAllZero = true;
        while(offset < wordLength + 2) {
          result[k + offset] = bitMap[j + offset] ^ this.bitMap[i + offset];
          if(result[k + offset]) {
            isAllZero = false;
          }
          offset++;
        }
        upperBound1 += this._getUpperBound(runningLength1, this.bitMap[i]);
        upperBound2 += this._getUpperBound(runningLength2, bitMap[j]);
        i += offset;
        j += offset;
        if(result[k + 1] === 0 || !isAllZero) {
          upperBound += this._getUpperBound(result[k + 1], result[k]);
          k += offset;
        }
      } else if(j >= len2 || (i < len1 && this.bitMap[i + 1] < bitMap[j + 1])) {
        const runningLength1 = this.bitMap[i + 1];
        let offset = 0;
        for(let len = this.bitMap[i] + 2; offset < len; offset++) {
          result[k + offset] = this.bitMap[i + offset];
        }
        result[k + 1] = ((runningLength1 << 5) + upperBound1 - upperBound) >> 5;
        upperBound1 += this._getUpperBound(runningLength1, this.bitMap[i]);
        upperBound += this._getUpperBound(result[k + 1], result[k]);
        i += offset;
        k += offset;
      } else {
        const runningLength2 = bitMap[j + 1];
        let offset = 0;
        for(let len = bitMap[j] + 2; offset < len; offset++) {
          result[k + offset] = bitMap[j + offset];
        }
        result[k + 1] = ((runningLength2 << 5) + upperBound2 - upperBound) >> 5;
        upperBound2 += this._getUpperBound(runningLength2, bitMap[j]);
        upperBound += this._getUpperBound(result[k + 1], result[k]);
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