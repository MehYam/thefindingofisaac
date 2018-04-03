// To use:
//
// 1. load The Finding of Isaac in a web browser
//
// 2. from the console window, copy(JSON.stringify(g_data.items))
//
// 3. paste into the allItems.js file
// 
// 4. export the item object from that file so this script can use it
//
// 5. run this script
const fs = require('fs');

const request = require('request').defaults({ encoding: null });
const items = require('./allItems.js');

const result = {};

const maxConcurrent = 10;
var totalQueued = 0;
var pending = 0;
for (const key in items) {
   const url = items[key].thumbnail;

   ++pending;
   ++totalQueued;
   console.log("queuing", key);

   request.get(url, (error, response, body) => {

      if (error) {
         console.error("Error fetching", url, error);
      }
      else if (response.statusCode != 200) {
         console.error("statusCode", url, response.statusCode);
      }
      else {
         result[key] = "data:image/png;base64," + (new Buffer(body).toString('base64'));
      }

      console.log("done", key, result[key]);
      console.log("remaining", pending, "of", totalQueued);
      if (--pending == 0) {
         writeResult();
      }
   });

   // hammering the CDN seems to time out connections
   while (pending >= maxConcurrent) {
      sleep.sleep(1);

      console.log('sleeping');
   }
}

function writeResult() {
   fs.writeFile('spritesheet/base64Thumbnails.json', JSON.stringify(result), (err) => {
      if (err) throw err;

      console.log("done conversion");
   })
}
