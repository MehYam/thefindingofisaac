const imgs_old = require('./spritesheet/base64Thumbnails_old.js');
const imgs_new = require('./spritesheet/base64Thumbnails.js');

var diff = 0;
var largestDiff = { id: '', diff: 0 };
var n = 0;
for (const id in imgs_new) {
    const oldId = id === 'a pony' ? 'the pony' : id;

    //console.log(`${oldId}, ${id}`);
    if (!imgs_old[oldId]) {
        console.warn(`no id found in old file for ${oldId}`);
        continue;
    }
    const thisDiff = imgs_new[id].length - imgs_old[oldId].length;

    console.log(`${id} delta: ${thisDiff}`);
    diff += thisDiff;
    ++n;

    if (thisDiff > largestDiff.diff) {
        largestDiff = { id, diff };
    }
}

console.log(`total delta for ${n} items: ${diff}, largest: ${JSON.stringify(largestDiff)}`);