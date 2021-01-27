// To use:
//

// NEEDS UPDATING
// 1. load The Finding of Isaac in a web browser
//
// 2. from the console window, copy(JSON.stringify(g_data.items))
//
// 3. paste into the allItems.js file
// 
// 4. export the item object from that file so this script can use it
//
// 5. run this script using node
const fs = require('fs');

const request = require('request').defaults({ encoding: null });
const items = require('./allItems.js');

const itemsArray = [];
for (const key in items) {
   itemsArray.push({key:key, thumbnail: items[key].thumbnail});
}

function writeResult() {
   fs.writeFile('spritesheet/base64Thumbnails.json', 'var base64Thumbnails = ' + JSON.stringify(result), (err) => {
      if (err) throw err;

      console.log("done conversion, completed", successful, "of", total, "requests");
   })
}

const result = {};
const total = itemsArray.length;
const maxConcurrent = 10;

var pending = 0;
var successful = 0;

function requestImages(array) {

   while (itemsArray.length > 0 && pending <= maxConcurrent) {
      const next = itemsArray.pop();

      ++pending;
      console.log("queuing", next.key);

      request.get(next.thumbnail, (error, response, body) => {

         --pending;
         if (error) {
            console.error("Error fetching", url, error);
         }
         else if (response.statusCode != 200) {
            console.error("statusCode", url, response.statusCode);
         }
         else {
            ++successful;
            result[next.key] = "data:image/png;base64," + (new Buffer(body).toString('base64'));
         }

         console.log("done", next.key, result[next.key]);
         console.log(pending, "pending, ", itemsArray.length, "remaining.");

         if (itemsArray.length == 0 && pending == 0) {
            writeResult();
         }
      });
   }

   // did we hit max concurrent?  stop for a breath and try more later
   if (itemsArray.length) {
      console.log("throttling,", pending, "to go...");
      setTimeout(requestImages, 1000, itemsArray);
   }
}

requestImages(itemsArray);