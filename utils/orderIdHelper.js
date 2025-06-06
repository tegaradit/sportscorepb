const slugify = require('slugify');

function generateOrderId(prefix, namaClub) {
  const timestamp = Date.now().toString(); // biasanya 13 karakter
  const maxLength = 50;

  const staticLength = prefix.length + 1 + 1 + timestamp.length;
  const maxSlugLength = maxLength - staticLength;

  const slug = slugify(namaClub, { lower: true, strict: true }).slice(0, maxSlugLength);

  return `${prefix}-${slug}-${timestamp}`;
}

module.exports = { generateOrderId };
