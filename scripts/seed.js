import fs from 'fs';
import path from 'path';

// This script reads products.ts and generates a full SQL INSERT statement
const productsFile = fs.readFileSync('src/data/products.ts', 'utf8');

// Extract the products array using regex (simple but effective for this file)
const match = productsFile.match(/export const products: Product\[\] = (\[[\s\S]*?\]);/);
if (!match) {
  console.error("Could not find products array");
  process.exit(1);
}

// Since it's TS, I'll clean it up to be valid JS then parse it
let productsJson = match[1]
  .replace(/\/\/.*$/gm, '') // remove comments
  .replace(/id:/g, '"id":')
  .replace(/name:/g, '"name":')
  .replace(/price:/g, '"price":')
  .replace(/originalPrice:/g, '"original_price":')
  .replace(/discount:/g, '"discount":')
  .replace(/category:/g, '"category":')
  .replace(/subcategory:/g, '"subcategory":')
  .replace(/colors:/g, '"colors":')
  .replace(/sizes:/g, '"sizes":')
  .replace(/fabric:/g, '"fabric":')
  .replace(/occasion:/g, '"occasion":')
  .replace(/description:/g, '"description":')
  .replace(/isNew:/g, '"is_new":')
  .replace(/isTrending:/g, '"is_trending":')
  .replace(/rating:/g, '"rating":')
  .replace(/reviews:/g, '"reviews_count":')
  .replace(/variants:/g, '"variants":')
  .replace(/color:/g, '"color":')
  .replace(/images:/g, '"images":')
  .replace(/image:/g, '"image_url":')
  .replace(/,(?=\s*?[\}\]])/g, ""); // remove trailing commas

try {
  const products = eval(productsJson);
  
  let sql = `-- 4. Seed with ALL initial data from your existing catalog\nINSERT INTO public.products (id, name, price, original_price, discount, category, subcategory, colors, sizes, fabric, occasion, description, is_new, is_trending, rating, reviews_count, variants, stock_quantity, image_url)\nVALUES \n`;

  const values = products.map(p => {
    const variantsJson = JSON.stringify(p.variants || []);
    const colorsArr = (p.colors || []).map(c => `'${c}'`).join(',');
    const sizesArr = (p.sizes || []).map(s => `'${s}'`).join(',');
    const occasionArr = (p.occasion || []).map(o => `'${o}'`).join(',');
    const imageUrl = p.image_url || (p.variants?.[0]?.images?.[0]) || '';
    
    return `  ('${p.id}', '${p.name.replace(/'/g, "''")}', ${p.price}, ${p.original_price || 'NULL'}, ${p.discount || 'NULL'}, '${p.category}', '${p.subcategory}', ARRAY[${colorsArr}], ARRAY[${sizesArr}], '${p.fabric ? p.fabric.replace(/'/g, "''") : ''}', ARRAY[${occasionArr}], '${p.description ? p.description.replace(/'/g, "''") : ''}', ${!!p.is_new}, ${!!p.is_trending}, ${p.rating || 0}, ${p.reviews_count || 0}, '${variantsJson}'::jsonb, 20, '${imageUrl}')`;
  });

  sql += values.join(',\n') + '\nON CONFLICT (id) DO NOTHING;';
  
  console.log(sql);
} catch (e) {
  console.error("Error parsing products:", e);
}
