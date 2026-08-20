import { makeCrudRouter } from '../lib/crudFactory.js'
import { productSchema } from '../lib/schemas.js'

export default makeCrudRouter('products', [
  'sku', 'name', 'category', 'unit', 'price', 'buy_price',
  'stock', 'min_stock', 'tax_rate', 'description', 'status', 'source',
], { permissionModule: 'products', logEntity: 'product', labelField: 'name', schema: productSchema })
