const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const exec = promisify(execFile);
async function main() {
  const meta = JSON.parse(await fs.readFile('bridge-metadata.json','utf8'));
  const photos = meta.data.latestVersion.files.filter(f => /\.JPG$/i.test(f.label));
  const dir = path.resolve('datasets/eugene-bridge/images');
  await fs.mkdir(dir,{recursive:true});
  let next=0, complete=0;
  async function worker() {
    while(next<photos.length) {
      const f=photos[next++], dest=path.join(dir,path.basename(f.label));
      const valid = async () => {
        try { const bytes=await fs.readFile(dest); return bytes.length===f.dataFile.filesize && crypto.createHash('md5').update(bytes).digest('hex')===f.dataFile.md5; }
        catch { return false; }
      };
      if (!await valid()) {
        await exec('curl.exe',['-L','--fail','--silent','--show-error','--retry','3','--max-time','180',`https://dataverse.harvard.edu/api/access/datafile/${f.dataFile.id}`,'-o',dest]);
        if (!await valid()) throw new Error('Checksum failed: '+f.label);
      }
      complete++;
      if(complete%10===0 || complete===photos.length) console.log(`Verified ${complete}/${photos.length} photos`);
    }
  }
  await Promise.all(Array.from({length:4},()=>worker()));
}
main().catch(err=>{console.error(err.message);process.exitCode=1;});
