import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractPalette} from '../src/photos/photo-palette.js';

test('five distinct image colors survive weighted palette extraction',()=>{
 const colors=[[245,25,20],[20,235,30],[20,30,245],[240,230,20],[170,30,225]],pixels=[];
 for(let i=0;i<colors.length;i++)for(let j=0;j<20+i*4;j++)pixels.push(...colors[i],255);
 const hex=colors.map(rgb=>'#'+rgb.map(c=>c.toString(16).padStart(2,'0')).join(''));
 assert.deepEqual(new Set(extractPalette(pixels)),new Set(hex));
});
test('transparent pixels do not introduce colors and flat images are not given invented swatches',()=>{
 assert.deepEqual(extractPalette([255,0,0,0,20,40,60,255]),['#14283c']);
 assert.deepEqual(extractPalette([]),[]);
});
