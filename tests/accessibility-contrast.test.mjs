import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const css=fs.readFileSync(path.join(root,'assets/css/site.css'),'utf8');
function token(name){const match=css.match(new RegExp(`${name}:(#[0-9a-f]{6})`,'i'));assert.ok(match,`Missing ${name}`);return match[1];}
function luminance(hex){const channels=hex.slice(1).match(/.{2}/g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];}
function contrast(foreground,background){const a=luminance(foreground),b=luminance(background);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
test('small_text_palette_pairs_meet_wcag_aa',()=>{const paper=token('--paper'),blue=token('--blue'),lime=token('--lime'),accent=token('--accent'),muted=token('--muted'),ink=token('--ink');for(const [label,fg,bg] of [['blue on paper',blue,paper],['lime on blue',lime,blue],['accent on paper',accent,paper],['pale copy on blue','#e2ecef',blue],['muted on paper',muted,paper]])assert.ok(contrast(fg,bg)>=4.5,`${label} contrast is ${contrast(fg,bg).toFixed(2)}:1`);assert.match(css,/\.dark-section \.eyebrow,\.dark-section h2 em\{color:var\(--lime\)\}/);assert.ok(contrast(lime,ink)>=4.5,'dark section highlight contrast must meet WCAG AA');});
