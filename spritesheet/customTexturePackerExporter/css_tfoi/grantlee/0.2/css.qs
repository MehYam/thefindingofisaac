/*! https://mths.be/cssescape v1.5.1 by @mathias | MIT license */
;(function(root, factory) {
    // https://github.com/umdjs/umd/blob/master/returnExports.js
    if (typeof exports == 'object') {
        // For Node.js.
        module.exports = factory(root);
    } else if (typeof define == 'function' && define.amd) {
        // For AMD. Register as an anonymous module.
        define([], factory.bind(root, root));
    } else {
        // For browser globals (not exposing the function separately).
        factory(root);
    }
}(typeof global != 'undefined' ? global : this, function(root) {

    if (root.CSS && root.CSS.escape) {
        return root.CSS.escape;
    }

    // https://drafts.csswg.org/cssom/#serialize-an-identifier
    var cssEscape = function(value) {
        if (arguments.length == 0) {
            throw new TypeError('`CSS.escape` requires an argument.');
        }
        var string = String(value);
        var length = string.length;
        var index = -1;
        var codeUnit;
        var result = '';
        var firstCodeUnit = string.charCodeAt(0);
        while (++index < length) {
            codeUnit = string.charCodeAt(index);
            // Note: there’s no need to special-case astral symbols, surrogate
            // pairs, or lone surrogates.

            // If the character is NULL (U+0000), then the REPLACEMENT CHARACTER
            // (U+FFFD).
            if (codeUnit == 0x0000) {
                result += '\uFFFD';
                continue;
            }

            if (
                // If the character is in the range [\1-\1F] (U+0001 to U+001F) or is
                // U+007F, […]
                (codeUnit >= 0x0001 && codeUnit <= 0x001F) || codeUnit == 0x007F ||
                // If the character is the first character and is in the range [0-9]
                // (U+0030 to U+0039), […]
                (index == 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
                // If the character is the second character and is in the range [0-9]
                // (U+0030 to U+0039) and the first character is a `-` (U+002D), […]
                (
                    index == 1 &&
                    codeUnit >= 0x0030 && codeUnit <= 0x0039 &&
                    firstCodeUnit == 0x002D
                )
            ) {
                // https://drafts.csswg.org/cssom/#escape-a-character-as-code-point
                result += '\\' + codeUnit.toString(16) + ' ';
                continue;
            }

            if (
                // If the character is the first character and is a `-` (U+002D), and
                // there is no second character, […]
                index == 0 &&
                length == 1 &&
                codeUnit == 0x002D
            ) {
                result += '\\' + string.charAt(index);
                continue;
            }

            // If the character is not handled by one of the above rules and is
            // greater than or equal to U+0080, is `-` (U+002D) or `_` (U+005F), or
            // is in one of the ranges [0-9] (U+0030 to U+0039), [A-Z] (U+0041 to
            // U+005A), or [a-z] (U+0061 to U+007A), […]
            if (
                codeUnit >= 0x0080 ||
                codeUnit == 0x002D ||
                codeUnit == 0x005F ||
                codeUnit >= 0x0030 && codeUnit <= 0x0039 ||
                codeUnit >= 0x0041 && codeUnit <= 0x005A ||
                codeUnit >= 0x0061 && codeUnit <= 0x007A
            ) {
                // the character itself
                result += string.charAt(index);
                continue;
            }

            // Otherwise, the escaped character.
            // https://drafts.csswg.org/cssom/#escape-a-character
            result += '\\' + string.charAt(index);

        }
        return result;
    };

    if (!root.CSS) {
        root.CSS = {};
    }

    root.CSS.escape = cssEscape;
    return cssEscape;

}));

function round(value, decimals) {
  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

var ExportData = function(root)
{
    var sprites = "";
    var header = "";
    var sprites2x = "";
    var header2x = "";

    var subPath = root.settings.textureSubPath;
    var spritePrefix = root.exporterProperties.sprite_prefix;

    var comment = "";

    for(var v = 0; v<root.settings.autoSDSettings.length; v++)
    {
        var variant = root.allResults[v];
        var extension = root.settings.autoSDSettings[v].extension;
        if(extension == "-2x")
        {
            indent = "    ";
            sprites2x += spriteLines2x(variant, subPath, indent, spritePrefix);        
        }
        else
        {
            sprites += spriteLines(variant, subPath, "", spritePrefix);    
        }
    }

    if(sprites2x)
    {
        var query = root.exporterProperties.media_query_2x;

        mediaStart = "@media "+query+ " {\n";
        mediaEnd = "\n}\n";
        return  comment + header + "\n\n" + sprites + "\n\n" + mediaStart + header2x + "\n\n" + sprites2x + mediaEnd;
    }
    else
    {
        return  comment + header + "\n\n" + sprites;
    }
}

ExportData.filterName = "exportData";
Library.addFilter("ExportData");

var makeImagePath = function(variant, subPath)
{
    var imageName = variant.textures[0].fullName;
    if(subPath)
    {
        imageName = subPath+"/"+imageName;
    }
    return imageName;
}

var spriteLines = function(variant, subPath, indent, spritePrefix)
{
    var lines = [];
    var texture = variant.textures[0];

    var imageName = makeImagePath(variant, subPath, spritePrefix);

    for (var j = 0; j < texture.allSprites.length; j++)
    {
        var sprite = texture.allSprites[j];

        var cssClassName = makeSelector(sprite.trimmedName, spritePrefix);

        var line1 = cssClassName + " {"
         + "max-width:"+sprite.frameRect.width+"px; "
         + "max-height:"+sprite.frameRect.height+"px; "
         + "}";

        var x = round(100*(sprite.frameRect.x)/(texture.size.width-sprite.frameRect.width), 3);
        var y = round(100*(sprite.frameRect.y)/(texture.size.height-sprite.frameRect.height), 3);
        var ratio = round(100*sprite.frameRect.height/sprite.frameRect.width, 3);
        var width = round(100*texture.size.width/sprite.frameRect.width, 3);
        var height = round(100*texture.size.height/sprite.frameRect.height, 3);

       var line2 = cssClassName + "::after {"
            + "content: ' ';"
            + "display: inline-block; "
            + "width:"+sprite.frameRect.width+"px; "
            + "height:"+sprite.frameRect.height+"px; "
            + "background-position: "+x+"% "+y+"%;"
            + "background-size: "+width+"% "+height+"%;"
            + "background-image: url("+imageName+");"
            + "padding: 0; "
            + "}";

        var line3 = "div" + cssClassName + "::after {"
            + "max-width:"+sprite.frameRect.width+"px; "
            + "width:100%;"
            + "height:0;"
            + "padding: 0 0 "+ratio+"% 0;"
            + "}"

        // this is where I override the built-in CSS output - I'll use only line2, since that's all I need, and 
        // frame by pixels instead of percentage of width/height.
        //
        // EDIT - this works great when outputting to IMG tags, but it makes scaling the images hard.  Instead
        // we'll use the trick below
        var myCustomLine = cssClassName + " {"
            + "width:"+sprite.frameRect.width+"px; "
            + "height:"+sprite.frameRect.height+"px; "
            + "background: url("+imageName+") -"+sprite.frameRect.x+"px -"+sprite.frameRect.y+"px;"
            + "}";

        //lines.push(myCustomLine);
        //lines.push(line1+"\n"+line2+"\n"+line3);

        // scale the image while maintaining the aspect ratio.  HTML5 is clearly not ready yet for spritesheets,
        // this is a pain
        var TARGET_HEIGHT = 35;
        var toScale = 
        var myCustomLine2 = cssClassName + "::after {"
            + "content: ' ';"
            + "display: inline-block; "
            + "width:"+sprite.frameRect.width+"px; "
            + "height:"+sprite.frameRect.height+"px; "
            + "background-position: "+x+"% "+y+"%;"
            + "background-size: "+width+"% "+height+"%;"
            + "background-image: url("+imageName+");"
            + "}";

        lines.push(myCustomLine2);
    }

    lines.sort();

    return indent+lines.join('\n'+indent);
}

var spriteLines2x = function(variant, subPath, indent, spritePrefix)
{
    var lines = [];
    var texture = variant.textures[0];

    var imageName = makeImagePath(variant, subPath);

    for (var j = 0; j < texture.allSprites.length; j++)
    {
        var sprite = texture.allSprites[j];

        var x = 100*(sprite.frameRect.x)/(texture.size.width-sprite.frameRect.width);
        var y = 100*(sprite.frameRect.y)/(texture.size.height-sprite.frameRect.height);

        var line = makeSelector(sprite.trimmedName, spritePrefix) + "::after {"
         + "background-position: "+x+"% "+y+"%; "
         + "background-image: url("+imageName+"); "
         + "}";

        lines.push(line);
    }

    lines.sort();

    return indent+lines.join('\n'+indent);
}

var makeSelector = function(input, spritePrefix)
{
    input = input.replace(/\s+/g,"-");
    input = input.replace(/-link/,":link");
    input = input.replace(/-visited/,":visited");
    input = input.replace(/-focus/,":focus");
    input = input.replace(/-active/,":active");
    input = input.replace(/-hover/,":hover");

    return "."+CSS.escape(spritePrefix+input);
}
