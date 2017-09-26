# bitmap
Compact bitmap data structure, Memory efficient array of bool flags
## Interfaces
### Init
```javascript
// init an empty bitMap
const bitMap1 = new BitMap(); // []
// init a bitMap with data
const bitMap2 = new BitMap(1, 2, 3, 5); // [1, 2, 3, 5]
```
### Add Data
```javascript
bitMap1.set(4, 5, 1); // [1, 4, 5]
```
### Delete Data
```javascript
bitMap2.remove(1, 2); // [3, 5]
```
### Parse Result
```javascript
bitMap1.get(); // [1, 4, 5]
```
### Logic Operations
```javascript
// or
bitMap1.or(bitMap2); // [1, 3, 4, 5];
// and
bitMap1.and(bitMap2); // [5];
// xor
bitMap1.xor(bitMap2); // [1, 3, 4];
```
### Find Element
```javascript
bitMap1.includes(5); // true
```

