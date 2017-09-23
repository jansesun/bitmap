import expect from 'expect';
import BitMap from '../src/index';

describe('BitMap', () => {
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
  describe('or', () => {
    it('Should or login currectly', () => {
      const bitMap1 = new BitMap();
      bitMap1.set(1, 129, 64, 200000);
      const bitMap2 = new BitMap();
      bitMap2.set(1, 4, 64, 400000, 400003);
      expect(bitMap1.or(bitMap2).get()).toEqual([1, 4, 64, 129, 200000, 400000, 400003]);
    });
  });
  describe('and', () => {
    it('Should and login currectly', () => {
      const bitMap1 = new BitMap();
      bitMap1.set(1, 129, 64, 200000);
      const bitMap2 = new BitMap();
      bitMap2.set(1, 4, 64, 400000, 400003);
      expect(bitMap1.and(bitMap2).get()).toEqual([1, 64]);
    });
  });
  describe('and', () => {
    it('Should and login currectly', () => {
      const bitMap1 = new BitMap();
      bitMap1.set(1, 129, 64, 200000);
      const bitMap2 = new BitMap();
      bitMap2.set(1, 4, 64, 400000, 400003, 129, 200000);
      expect(bitMap1.xor(bitMap2).get()).toEqual([4, 400000, 400003]);
    });
  });
})