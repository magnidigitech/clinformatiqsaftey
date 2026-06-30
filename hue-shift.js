const fs = require('fs');
const path = require('path');

function hexToHsl(hex) {
  let r = parseInt(hex.substring(1, 3), 16) / 255;
  let g = parseInt(hex.substring(3, 5), 16) / 255;
  let b = parseInt(hex.substring(5, 7), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

function hslToHex(h, s, l) {
  h /= 360;
  let r, g, b;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    let p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  const toHex = x => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function shiftToTeal(hex) {
  const [h, s, l] = hexToHsl(hex);
  // Only shift colors that have some saturation (not pure grays)
  // and maybe focus on blues/purples/gray-blues (hue between 180 and 280)
  // But actually, the user wants EVERYTHING medical green.
  // So if it has any saturation, just shift the hue to 165 (Teal).
  if (s > 0.05) {
    // Medical teal is around hue 165. Let's make it 165.
    // If we want slightly greener teal, 160.
    const newHex = hslToHex(165, s, l);
    return newHex;
  }
  return hex;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const regex = /(bg|text|border|from|to)-\[#([0-9a-fA-F]{6})\]/g;
      let changed = false;
      
      const newContent = content.replace(regex, (match, prefix, hexWithoutHash) => {
        const hex = `#${hexWithoutHash}`;
        const newHex = shiftToTeal(hex);
        if (newHex !== hex) {
          changed = true;
          return `${prefix}-[${newHex}]`;
        }
        return match;
      });

      if (changed) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Updated colors in ${fullPath}`);
      }
    }
  }
}

processDirectory(path.join(__dirname, 'src'));
