import {build} from 'esbuild';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const source=fileURLToPath(new URL('../template/src/js/bootstrap-source.js',import.meta.url));
const destination=fileURLToPath(new URL('../template/src/js/bootstrap.js',import.meta.url));
const result=await build({absWorkingDir:fileURLToPath(new URL('../',import.meta.url)),entryPoints:[source],bundle:true,format:'iife',minify:false,target:'es2022',write:false});
const bytes=result.outputFiles[0].contents;
if(process.argv.includes('--check')){
 if(!Buffer.from(bytes).equals(await fs.readFile(destination)))throw new Error('Frozen bootstrap is out of date; run npm run compile.');
}else await fs.writeFile(destination,bytes);
console.log(`Frozen bootstrap: ${bytes.length} bytes.`);
