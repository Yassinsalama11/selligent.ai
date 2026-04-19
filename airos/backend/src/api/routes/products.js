const express = require('express');
const { getActiveProducts, upsertProducts } = require('../../db/queries/products');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const products = await getActiveProducts(req.user.tenant_id, {}, req.db);
    res.json(products);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, price, description, currency, sku, stock_status } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const res2 = await req.db.query(`
      INSERT INTO products (tenant_id, name, price, description, currency, sku, stock_status, source)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'manual') RETURNING *
    `, [req.user.tenant_id, name, price, description, currency || 'USD', sku, stock_status || 'in_stock']);

    res.status(201).json(res2.rows[0]);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const allowed = ['name', 'price', 'sale_price', 'description', 'stock_status', 'stock_quantity', 'is_active'];
    const fields = Object.keys(req.body).filter(k => allowed.includes(k));
    if (!fields.length) return res.status(400).json({ error: 'No valid fields' });

    const sets = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const values = fields.map(f => req.body[f]);

    const result = await req.db.query(
      `UPDATE products SET ${sets}, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [req.params.id, req.user.tenant_id, ...values]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
