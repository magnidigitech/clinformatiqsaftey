const fs = require('fs');
const path = require('path');

const colorMap = {
  '#E8EFF6': '#F0FDF4',
  '#D6E4F0': '#DCFCE7',
  '#DCE6F0': '#DCFCE7',
  '#9BB8D3': '#6EE7B7',
  '#7FA6CC': '#0F766E',
  '#B0C4DE': '#D1D5DB',
  '#F5F8FC': '#FFFFFF',
  '#EAEFF4': '#F0FDF4',
  '#0058EE': '#0F766E',
  '#3A93FF': '#14B8A6',
  '#003399': '#047857',
  '#0054E3': '#0F766E',
  '#E6F1FB': '#CCFBF1',
  '#0C447C': '#115E59',
  '#185FA5': '#0F766E',
  '#CFD9E8': '#A7F3D0',
  '#E0EAF4': '#D1FAE5',
  '#F8FAFC': '#F8FAFC',
  '#E0E8F0': '#D1FAE5',
  '#F0F4F8': '#F8FAFC'
};

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const [oldColor, newColor] of Object.entries(colorMap)) {
        // Case-insensitive replace
        const regex = new RegExp(oldColor, 'gi');
        if (regex.test(content)) {
          content = content.replace(regex, newColor);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated colors in ${fullPath}`);
      }
    }
  }
}

processDirectory(path.join(__dirname, 'src'));
