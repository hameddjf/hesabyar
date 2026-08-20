import { makeCrudRouter } from '../lib/crudFactory.js'
import { clientSchema } from '../lib/schemas.js'

export default makeCrudRouter('clients', [
  'name', 'type', 'contact', 'national_code', 'eco_code', 'phone', 'email',
  'address', 'city', 'status', 'bank_iban', 'bank_card', 'source',
], { permissionModule: 'clients', logEntity: 'client', labelField: 'name', schema: clientSchema, readableForReports: true })
