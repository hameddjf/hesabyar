import { makeCrudRouter } from '../lib/crudFactory.js'

export default makeCrudRouter('partners', [
  'name', 'role', 'share', 'phone', 'join_date', 'capital', 'accounts_json',
], { permissionModule: 'partners', logEntity: 'partner', labelField: 'name', readableForReports: true })
