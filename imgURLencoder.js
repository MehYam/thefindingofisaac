// This code generates a base64-encoded image out of a thumbnail.  This allows us to put all the icons 
// in a single file, eliminating ~800 http calls 
//
// Workflow (steps 3 and 4 are rough right now):
//
// 1) Use the app to display all the items
// 2) Paste the following into the dev console
// 3) Loop over items in the g_data.item object, calling convertImageToBase64URL in the loop and glomming it all into a single JSON object
// 4) Save the results in spritesheet/base64Thumbnails.json
function convertImageToBase64URL(src, callback, outputFormat)
{
  var img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = function() {
    var canvas = document.createElement('CANVAS');
    var ctx = canvas.getContext('2d');
    canvas.height = this.height;
    canvas.width = this.width;
    ctx.drawImage(this, 0, 0);

    callback(src, canvas.toDataURL(outputFormat));
  };

  img.src = src;
}

// convert all the images
var nConversionsBatched = 0;
var conversionResult = {};
for (var key in g_data.items)
{
  var item = g_data.items[key];
  var url = item.thumbnail;

  ++nConversionsBatched;
  convertImageToBase64URL(url, function(url, base64encoding) {

    conversionResult[url] = base64encoding;

    if (--nConversionsBatched == 0)
    {
      conversionResult = (JSON.stringify(conversionResult));

      console.log("done conversion, type 'copy(conversionResult)' to put result on clipboard");
    }
  });
}

console.log("converting " + nConversionsBatched);