//
// This node script will loop through the item database and pack thumbnails into
// a single base64-encoded blob for all items.
//
// This is useful given that the wiki often changes or breaks image links.  The
// main page will try to use original images from the wiki if they're missing from
// the blob.
const fs = require('fs');
const fetch = require('node-fetch');
const jimp = require('jimp');

function writeResult(result) {
   const outputFile = 'spritesheet/base64Thumbnails.js';

   console.log(`writing to ${outputFile}`);
   const exportString = "\nif (typeof module !== 'undefined') { module.exports = base64Thumbnails; }";
   fs.writeFile(outputFile, 'const base64Thumbnails = ' + JSON.stringify(result) + exportString, (err) => {
      if (err) {
         console.error(`error: ${err}`);
         throw err;
      }

      console.log('done');
   })
}

const limit = -1;
async function convertImages(array) {

   const result = {};

   var converted = 0;
   for (const item of array) {
      console.log(item.thumb);

      if (limit > 0 && converted > limit) break;

      const response = await fetch(item.thumb);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await Buffer.from(arrayBuffer);
      const jimpImg = await Jimp.read(buffer);
//      jimpImg.autocrop();

      const jimpBuffer = await jimpImg.getBufferAsync(Jimp.MIME_PNG);

      result[item.id] = 'data:image/png;base64,' + jimpBuffer.toString('base64');
      ++converted;
   }

   console.log(`converted ${converted} images, saving to file`);
   writeResult(result);
}

const g_items = require('./itemdata/items.js');
const Jimp = require('jimp');
console.log(`converting thumbnails for ${g_items.length} items`);

convertImages(g_items);