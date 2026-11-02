import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { applyCartridgeTheme } from '../src/cartridge/cartridge-theme.ts';

test('dark plastic preserves authored print and restores the light finish without accumulating changes',()=>{
 const root=new THREE.Group(),geometry=new THREE.BoxGeometry(),artwork=new THREE.Texture();
 const shell=new THREE.MeshPhysicalMaterial({name:'Cartridge Shell',color:'#d8541c',attenuationColor:'#d8541c',roughness:.24,transmission:.67,envMapIntensity:1,clearcoat:.18});
 const label=new THREE.MeshBasicMaterial({name:'Project label',color:'#ffffff',map:artwork,toneMapped:false});
 root.add(new THREE.Mesh(geometry,shell),new THREE.Mesh(geometry,label));
 const base=shell.color.clone(),print=label.color.clone();let dark;
 for(let i=0;i<3;i++){
  applyCartridgeTheme(root,true);assert.ok(shell.color.r<base.r);assert.ok(shell.roughness>.24);assert.ok(shell.envMapIntensity<1);
  assert.equal(label.map,artwork);assert.ok(label.color.equals(print));assert.equal(label.toneMapped,false);assert.equal(shell.transmission,.67);
  if(dark)assert.ok(shell.color.equals(dark));dark=shell.color.clone();
  applyCartridgeTheme(root,false);assert.ok(shell.color.equals(base));assert.equal(shell.roughness,.24);assert.equal(shell.envMapIntensity,1);
 }
 geometry.dispose();shell.dispose();label.dispose();artwork.dispose();
});
