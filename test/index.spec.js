import expect from 'expect';
import BitMap from '../src/index';

describe('BitMap', () => {
  describe('set', () => {
    const bitMap = new BitMap();
    it('Should set data correctly', () => {
      bitMap.set(1);
      expect(bitMap.get()).toEqual([1]);
      bitMap.set(4);
      expect(bitMap.get()).toEqual([1, 4]);
      bitMap.set(64);
      expect(bitMap.get()).toEqual([1, 4, 64]);
      bitMap.set(129);
      expect(bitMap.get()).toEqual([1, 4, 64, 129]);
    });
    it('Should not accept invalid value', () => {
      const bitMap = new BitMap();
      bitMap.set('1');
      expect(bitMap.get()).toEqual([]);
      bitMap.set(+'a');
      expect(bitMap.get()).toEqual([]);
      bitMap.set(-1);
      expect(bitMap.get()).toEqual([]);
      bitMap.set(1.1);
      expect(bitMap.get()).toEqual([]);
      bitMap.set(1 / 0);
      expect(bitMap.get()).toEqual([]);
    });
    it('Should extend currectly', () => {
      bitMap.set(400000);
      expect(bitMap.get()).toEqual([1, 4, 64, 129, 400000]);
      bitMap.set(400003);
      expect(bitMap.get()).toEqual([1, 4, 64, 129, 400000, 400003]);
    });
    it('Should insert currectly', () => {
      bitMap.set(200000);
      expect(bitMap.get()).toEqual([1, 4, 64, 129, 200000, 400000, 400003]);
    });
  });
  describe('or', () => {
    it('Should or login currectly', () => {
      const bitMap1 = new BitMap(1, 129, 64, 200000);
      const bitMap2 = new BitMap(1, 4, 64, 400000, 400003);
      expect(bitMap1.or(bitMap2).get()).toEqual([1, 4, 64, 129, 200000, 400000, 400003]);
    });
    it('Should conform to the idempotent law', () => {
      const bitMap1 = new BitMap(1, 129, 64, 200000);
      const bitMap2 = new BitMap(1, 129, 64, 200000);
      expect(bitMap1.or(bitMap2).get()).toEqual(bitMap1.get());
    });
    it('Should conform to the commutative law', () => {
      const bitMap1 = new BitMap(1, 129, 64, 200000);
      const bitMap2 = new BitMap(1, 4, 64, 400000, 400003);
      expect(bitMap1.or(bitMap2).get()).toEqual(bitMap2.or(bitMap1).get());
    });
    it('Should conform to the associative law', () => {
      const bitMap1 = new BitMap(1, 129, 64, 200000);
      const bitMap2 = new BitMap(1, 4, 64, 400000, 400003);
      const bitMap3 = new BitMap(4, 64, 400000);
      expect(bitMap1.or(bitMap2).or(bitMap3).get()).toEqual(bitMap1.or(bitMap2.or(bitMap3)).get());
    });
    it('Should conform to the complementation law', () => {
      const bitMap1 = new BitMap(1, 129, 64, 200000);
      const bitMap2 = new BitMap(1, 4, 64, 400000, 400003);
      const full = bitMap1.or(bitMap2);
      const complementation = bitMap1.xor(full);
      expect(bitMap1.or(complementation).get()).toEqual(full.get());
    });
  });
  describe('and', () => {
    it('Should and login currectly', () => {
      const bitMap1 = new BitMap(1, 129, 64, 200000);
      const bitMap2 = new BitMap(1, 4, 64, 400000, 400003);
      expect(bitMap1.and(bitMap2).get()).toEqual([1, 64]);
    });
    it('Should conform to the idempotent law', () => {
      const bitMap1 = new BitMap(1, 129, 64, 200000);
      const bitMap2 = new BitMap(1, 129, 64, 200000);
      expect(bitMap1.and(bitMap2).get()).toEqual(bitMap1.get());
    });
    it('Should conform to the commutative law', () => {
      const bitMap1 = new BitMap(1, 129, 64, 200000);
      const bitMap2 = new BitMap(1, 4, 64, 400000, 400003);
      expect(bitMap1.and(bitMap2).get()).toEqual(bitMap2.and(bitMap1).get());
    });
    it('Should conform to the associative law', () => {
      const bitMap1 = new BitMap(1, 129, 64, 200000);
      const bitMap2 = new BitMap(1, 4, 64, 400000, 400003);
      const bitMap3 = new BitMap(4, 64, 400000);
      expect(bitMap1.and(bitMap2).and(bitMap3).get()).toEqual(bitMap1.and(bitMap2.and(bitMap3)).get());
    });
    it('Should conform to the complementation law', () => {
      const bitMap1 = new BitMap(1, 129, 64, 200000);
      const bitMap2 = new BitMap(1, 4, 64, 400000, 400003);
      const full = bitMap1.or(bitMap2);
      const complementation = bitMap1.xor(full);
      expect(bitMap1.and(complementation).get()).toEqual(new BitMap().get());
    });
  });
  describe('and, or', () => {
    it('Should conform to the absorption law', () => {
      const bitMap1 = new BitMap(1, 129, 64, 200000);
      const bitMap2 = new BitMap(1, 4, 64, 400000, 400003);
      expect(bitMap1.and(bitMap1.or(bitMap2)).get()).toEqual(bitMap1.get());
      expect(bitMap1.or(bitMap1.and(bitMap2)).get()).toEqual(bitMap1.get());
    });
  });
  describe('xor', () => {
    it('Should xor login currectly', () => {
      const bitMap1 = new BitMap(1, 129, 64, 200000);
      const bitMap2 = new BitMap(1, 4, 64, 400000, 400003, 129, 200000);
      expect(bitMap1.xor(bitMap2).get()).toEqual([4, 400000, 400003]);
    });
    it('Should conform to the commutative law', () => {
      const bitMap1 = new BitMap(1, 129, 64, 200000);
      const bitMap2 = new BitMap(1, 4, 64, 400000, 400003);
      expect(bitMap1.xor(bitMap2).get()).toEqual(bitMap2.xor(bitMap1).get());
    });
    it('Should conform to the associative law', () => {
      const bitMap1 = new BitMap(1, 129, 64, 200000);
      const bitMap2 = new BitMap(1, 4, 64, 400000, 400003);
      const bitMap3 = new BitMap(4, 64, 400000);
      expect(bitMap1.xor(bitMap2).xor(bitMap3).get()).toEqual(bitMap1.xor(bitMap2.xor(bitMap3)).get());
    });
  });
  describe('remove', () => {
    it('Should remove data correctly', () => {
      const bitMap1 = new BitMap(1, 4, 64, 400000, 400003);
      bitMap1.remove(1, 129, 64, 200000)
      expect(bitMap1.get()).toEqual([4, 400000, 400003]);
    });
  });
  describe('includes', () => {
    const bitMap = new BitMap(1, 4, 200000, 400000);
    it('Should recognize the value exist in the map', () => {
      expect(bitMap.includes(200000)).toBe(true);
    });
    it('Should recognize the value not exist in the map', () => {
      expect(bitMap.includes(200001)).toBe(false);
    });
  });
})