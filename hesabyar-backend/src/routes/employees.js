import { makeCrudRouter } from '../lib/crudFactory.js'

export default makeCrudRouter('employees', [
  'name', 'position', 'dept', 'salary', 'hire_date', 'phone',
  'bank', 'card', 'iban', 'status',
], { permissionModule: 'employees', logEntity: 'employee', labelField: 'name' })
