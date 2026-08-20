import { makeCrudRouter } from '../lib/crudFactory.js'
import { paymentSchema } from '../lib/schemas.js'

export default makeCrudRouter('payments', [
  'date', 'amount', 'transaction_type', 'method', 'reference',
  'description', 'invoice_id', 'check_number', 'check_date',
  'check_bank', 'partner_id', 'partner_account', 'client_id',
  'category', 'has_receipt', 'status', 'source',
], { permissionModule: 'payments', logEntity: 'payment', labelField: 'id', schema: paymentSchema, readableForReports: true })
