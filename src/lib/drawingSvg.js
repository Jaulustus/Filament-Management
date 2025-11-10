"use strict";

function DrawingSVG(opts, FontLib) {
    var tx0 = 0, tx1 = 0, tx2 = 0, tx3 = 0;
    var ty0 = 0, ty1 = 0, ty2 = 0, ty3 = 0;

    var svg = '';
    var path;
    var clipid = '';
    var clips = [];
    var lines = {};

    var ELLIPSE_MAGIC = 0.55228475 - 0.00045;

    var gs_width, gs_height;
    var gs_dx, gs_dy;

    return {
        scale() {
        },
        measure(str, font, fwidth, fheight) {
            fwidth = fwidth | 0;
            fheight = fheight | 0;

            var fontid = FontLib.lookup(font);
            var width = 0;
            var ascent = 0;
            var descent = 0;
            for (var i = 0; i < str.length; i++) {
                var ch = str.charCodeAt(i);
                var glyph = FontLib.getpaths(fontid, ch, fwidth, fheight);
                if (!glyph) {
                    continue;
                }
                ascent = Math.max(ascent, glyph.ascent);
                descent = Math.max(descent, -glyph.descent);
                width += glyph.advance;
            }
            return { width, ascent, descent };
        },

        init(width, height) {
            var padl = opts.paddingleft;
            var padr = opts.paddingright;
            var padt = opts.paddingtop;
            var padb = opts.paddingbottom;
            var rot = opts.rotate || 'N';

            width += padl + padr;
            height += padt + padb;

            switch (rot) {
            case 'R':
                tx1 = -1; tx2 = 1; ty0 = 1;
                break;
            case 'I':
                tx0 = -1; tx2 = 1; ty1 = -1; ty3 = 1;
                break;
            case 'L':
                tx1 = 1; ty0 = -1; ty3 = 1;
                break;
            default:
                tx0 = ty1 = 1;
                break;
            }

            var swap = rot == 'L' || rot == 'R';
            gs_width = swap ? height : width;
            gs_height = swap ? width : height;
            gs_dx = padl;
            gs_dy = padt;
        },

        line(x0, y0, x1, y1, lw, rgb) {
            x0 = x0 | 0;
            y0 = y0 | 0;
            x1 = x1 | 0;
            y1 = y1 | 0;
            lw = Math.round(lw);

            if (lw & 1) {
                if (x0 == x1) {
                    x0 += 0.5;
                    x1 += 0.5;
                }
                if (y0 == y1) {
                    y0 += 0.5;
                    y1 += 0.5;
                }
            }

            var key = '' + lw + '#' + rgb;
            if (!lines[key]) {
                lines[key] = '<path stroke="#' + rgb + '" stroke-width="' + lw + '" d="';
            }
            lines[key] += 'M' + transform(x0, y0) + 'L' + transform(x1, y1);
        },

        polygon(pts) {
            if (!path) {
                path = '<path d="';
            }
            path += 'M' + transform(pts[0][0], pts[0][1]);
            for (var i = 1, n = pts.length; i < n; i++) {
                var p = pts[i];
                path += 'L' + transform(p[0], p[1]);
            }
            path += 'Z';
        },

        hexagon(pts) {
            this.polygon(pts);
        },

        ellipse(x, y, rx, ry) {
            if (!path) {
                path = '<path d="';
            }
            var dx = rx * ELLIPSE_MAGIC;
            var dy = ry * ELLIPSE_MAGIC;

            path += 'M' + transform(x - rx, y) +
                    'C' + transform(x - rx, y - dy) + ' ' +
                          transform(x - dx, y - ry) + ' ' +
                          transform(x,      y - ry) +
                    'C' + transform(x + dx, y - ry) + ' ' +
                          transform(x + rx, y - dy) + ' ' +
                          transform(x + rx, y) +
                    'C' + transform(x + rx, y + dy) + ' ' +
                          transform(x + dx, y + ry) + ' ' +
                          transform(x,      y + ry) +
                    'C' + transform(x - dx, y + ry) + ' ' +
                          transform(x - rx, y + dy) + ' ' +
                          transform(x - rx, y) +
                    'Z';
        },

        fill(rgb) {
            if (path) {
                svg += path + '" fill="#' + rgb + '" fill-rule="evenodd"' +
                       (clipid ? ' clip-path="url(#' + clipid + ')"' : '') +
                       ' />\n';
                path = null;
            }
        },

        clip(polys) {
            var pathdef = '<clipPath id="clip' + clips.length + '"><path d="';
            for (let j = 0; j < polys.length; j++) {
                let pts = polys[j];
                pathdef += 'M' + transform(pts[0][0], pts[0][1]);
                for (var i = 1, n = pts.length; i < n; i++) {
                    var p = pts[i];
                    pathdef += 'L' + transform(p[0], p[1]);
                }
                pathdef += 'Z';
            }
            pathdef += '" clip-rule="nonzero" /></clipPath>';
            clipid = 'clip' + clips.length;
            clips.push(pathdef);
        },
        unclip() {
            clipid = '';
        },

        text(x, y, str, rgb, font) {
            var fontid = FontLib.lookup(font.name);
            var fwidth = font.width | 0;
            var fheight = font.height | 0;
            var dx = font.dx | 0;
            var localPath = '';
            for (var k = 0; k < str.length; k++) {
                var ch = str.charCodeAt(k);
                var glyph = FontLib.getpaths(fontid, ch, fwidth, fheight);
                if (!glyph) {
                    continue;
                }
                if (glyph.length) {
                    for (var g = 0; g < glyph.length; g++) {
                        let seg = glyph[g];
                        if (seg.type == 'M' || seg.type == 'L') {
                            localPath += seg.type + transform(seg.x + x, y - seg.y);
                        } else if (seg.type == 'Q') {
                            localPath += seg.type + transform(seg.cx + x, y - seg.cy) + ' ' +
                                           transform(seg.x + x,  y - seg.y);
                        } else if (seg.type == 'C') {
                            localPath += seg.type + transform(seg.cx1 + x, y - seg.cy1) + ' ' +
                                           transform(seg.cx2 + x, y - seg.cy2) + ' ' +
                                           transform(seg.x + x,   y - seg.y);
                        }
                    }
                    localPath += 'Z';
                }
                x += glyph.advance + dx;
            }
            if (localPath) {
                svg += '<path d="' + localPath + '" fill="#' + rgb + '" />\n';
            }
        },

        end() {
            var linesvg = '';
            for (var key in lines) {
                linesvg += lines[key] + '" />\n';
            }
            var bg = opts.backgroundcolor;
            return '<svg version="1.1" width="' + gs_width + '" height="' + gs_height +
                    '" xmlns="http://www.w3.org/2000/svg">\n' +
                    (clips.length ? '<defs>' + clips.join('') + '</defs>' : '') +
                    (/^[0-9A-Fa-f]{6}$/.test('' + bg)
                        ? '<rect width="100%" height="100%" fill="#' + bg + '" />\n'
                        : '') +
                    linesvg + svg + '</svg>\n';
        },
    };

    function transform(x, y) {
        x += gs_dx;
        y += gs_dy;
        var tx = tx0 * x + tx1 * y + tx2 * (gs_width - 1) + tx3 * (gs_height - 1);
        var ty = ty0 * x + ty1 * y + ty2 * (gs_width - 1) + ty3 * (gs_height - 1);
        return '' + ((tx | 0) == tx ? tx : tx.toFixed(2)) + ' ' +
                    ((ty | 0) == ty ? ty : ty.toFixed(2));
    }
}

export default function createDrawingSvg(opts, FontLib) {
    return DrawingSVG(opts, FontLib);
}
