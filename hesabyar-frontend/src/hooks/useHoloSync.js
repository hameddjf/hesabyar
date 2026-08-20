import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/apiClient'

/** مدیریت اتصال/همگام‌سازی با دیتابیس SQL Server هلو */
export function useHoloSync() {
  const [tables, setTables]   = useState([])
  const [log, setLog]         = useState([])
  const [loadingLog, setLoadingLog] = useState(true)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [testResult, setTestResult] = useState(null) // { ok, message }

  // ── مسیر جدید: آپلود مستقیم فایل .bak (بدون نیاز به SQL Server از‌قبل بالا) ──
  const [prereqs, setPrereqs] = useState(null) // null = هنوز چک نشده
  const [checkingPrereqs, setCheckingPrereqs] = useState(false)
  const [uploading, setUploading] = useState(false)

  const loadTables = useCallback(async () => {
    try { setTables(await api.holo.tables()) } catch { /* غیرحیاتی */ }
  }, [])

  const loadLog = useCallback(async () => {
    setLoadingLog(true)
    try { setLog(await api.holo.log()) }
    catch { /* غیرحیاتی */ }
    finally { setLoadingLog(false) }
  }, [])

  const checkPrereqs = useCallback(async () => {
    setCheckingPrereqs(true)
    try { setPrereqs(await api.holo.localRestorePrereqs()) }
    catch { setPrereqs({ sqlcmd: false, localdb: false, instanceRunning: false }) }
    finally { setCheckingPrereqs(false) }
  }, [])

  const [installingLocalDb, setInstallingLocalDb] = useState(false)
  const [installError, setInstallError] = useState(null)
  const installLocalDb = useCallback(async () => {
    setInstallingLocalDb(true)
    setInstallError(null)
    try {
      await api.holo.installLocalDb()
      await checkPrereqs()
    } catch (e) {
      setInstallError(e.detail || e.message)
    } finally {
      setInstallingLocalDb(false)
    }
  }, [checkPrereqs])

  useEffect(() => { loadTables(); loadLog(); checkPrereqs() }, [loadTables, loadLog, checkPrereqs])

  const testConnection = useCallback(async (conn) => {
    setTesting(true)
    setTestResult(null)
    try {
      await api.holo.testConnection(conn)
      setTestResult({ ok: true, message: 'اتصال موفق بود ✓' })
      return true
    } catch (err) {
      setTestResult({ ok: false, message: err.detail || err.message })
      return false
    } finally {
      setTesting(false)
    }
  }, [])

  const runImport = useCallback(async (conn, tablesToImport) => {
    setSyncing(true)
    try {
      const res = await api.holo.import({ ...conn, tables: tablesToImport })
      await loadLog()
      return res
    } finally {
      setSyncing(false)
    }
  }, [loadLog])

  const runExport = useCallback(async (conn, entities) => {
    setSyncing(true)
    try {
      const res = await api.holo.export({ ...conn, entities })
      await loadLog()
      return res
    } finally {
      setSyncing(false)
    }
  }, [loadLog])

  /** آپلود فایل .bak و Import خودکار (بدون نیاز به SQL Server از‌قبل در حال اجرا) */
  const uploadAndImport = useCallback(async (file, tablesToImport) => {
    setUploading(true)
    try {
      const res = await api.holo.localRestoreImport(file, tablesToImport)
      await loadLog()
      return res
    } finally {
      setUploading(false)
    }
  }, [loadLog])

  return {
    tables, log, loadingLog, testing, syncing, testResult, testConnection, runImport, runExport,
    reloadLog: loadLog,
    prereqs, checkingPrereqs, checkPrereqs, uploading, uploadAndImport,
    installingLocalDb, installError, installLocalDb,
  }
}
