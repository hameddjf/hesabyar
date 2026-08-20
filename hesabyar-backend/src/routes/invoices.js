import { makeCrudRouter } from '../lib/crudFactory.js'
import { invoiceSchema } from '../lib/schemas.js'

export default makeCrudRouter('invoices', [
  'invoice_number', 'type', 'issue_date', 'due_date', 'client_id',
  'total_amount', 'discount', 'tax_amount', 'grand_total',
  'status', 'description', 'source', 'items_json',
], { permissionModule: 'invoices', logEntity: 'invoice', labelField: 'invoice_number', schema: invoiceSchema, readableForReports: true })
