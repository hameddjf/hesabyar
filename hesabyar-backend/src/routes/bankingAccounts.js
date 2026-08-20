import { makeCrudRouter } from '../lib/crudFactory.js'

export default makeCrudRouter('banking_accounts', [
  'label', 'bank', 'balance', 'card', 'iban',
], { permissionModule: 'banking_accounts', logEntity: 'bank_account', labelField: 'label' })
