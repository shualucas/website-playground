import {test} from 'node:test';
import assert from 'node:assert/strict';
import {galleryPalettes,photoRamp} from '../src/photos/gallery-palettes.ts';
const luminance=hex=>{const c=[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)/255);return c[0]*.299+c[1]*.587+c[2]*.114};
test('every chosen accent preserves increasing image brightness and useful tonal range',()=>{
 const photo=['#86b5cd','#739193','#8d8369','#242c1e','#b9d6d7'];
 for(const accent of photo){const ramp=photoRamp(photo,accent),values=ramp.map(luminance);assert.equal(ramp.length,5);assert(values.every((v,i)=>i===0||v>values[i-1]));assert(values[0]<.1);assert(values[4]>.9)}
});
test('all curated palettes have five valid tones ordered from dark to light',()=>{
 for(const palette of galleryPalettes){assert.equal(palette.length,5);const values=palette.map(luminance);assert(palette.every(color=>/^#[\da-f]{6}$/i.test(color)));assert(values.every((v,i)=>i===0||v>values[i-1]))}
});
