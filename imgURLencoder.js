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