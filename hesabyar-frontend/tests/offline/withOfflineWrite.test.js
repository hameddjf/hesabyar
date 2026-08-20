import { describe, it, expect, vi } from 'vitest'
import { withOfflineWrite } from '../../src/features/offline/withOfflineWrite.js'

describe('withOfflineWrite — الگوی مشترک update/delete آنلاین/آفلاین', () => {
  it('وقتی آنلاینیم و درخواست موفقه، مستقیم onlineFn رو صدا می‌زنه و saveOffline صدا زده نمی‌شه', async () => {
    const onlineFn = vi.fn().mockResolvedValue({ id: 'c1' })
    const saveOffline = vi.fn()

    const res = await withOfflineWrite({ isOnline: true, saveOffline, entity: 'clients', action: 'update', data: { id: 'c1' }, onlineFn })

    expect(onlineFn).toHaveBeenCalledTimes(1)
    expect(saveOffline).not.toHaveBeenCalled()
    expect(res).toEqual({ offline: false, result: { id: 'c1' } })
  })

  it('وقتی آفلاینیم، اصلاً onlineFn صدا زده نمی‌شه و مستقیم توی صف queue می‌شه', async () => {
    const onlineFn = vi.fn()
    const saveOffline = vi.fn().mockResolvedValue('queue-1')

    const res = await withOfflineWrite({ isOnline: false, saveOffline, entity: 'clients', action: 'delete', data: { id: 'c1' }, onlineFn })

    expect(onlineFn).not.toHaveBeenCalled()
    expect(saveOffline).toHaveBeenCalledWith('clients', 'delete', { id: 'c1' })
    expect(res).toEqual({ offline: true })
  })

  it('وقتی آنلاینیم ولی درخواست به‌خاطر قطعی شبکه شکست بخوره (err.status falsy)، به صف آفلاین می‌ره', async () => {
    const networkErr = new Error('قطعی شبکه')
    networkErr.status = 0
    const onlineFn = vi.fn().mockRejectedValue(networkErr)
    const saveOffline = vi.fn().mockResolvedValue('queue-1')

    const res = await withOfflineWrite({ isOnline: true, saveOffline, entity: 'clients', action: 'update', data: { id: 'c1', name: 'x' }, onlineFn })

    expect(saveOffline).toHaveBeenCalledWith('clients', 'update', { id: 'c1', name: 'x' })
    expect(res).toEqual({ offline: true })
  })

  it('وقتی خطای واقعی سرور (مثلاً 400 اعتبارسنجی) باشه، نباید صف بشه — باید throw بشه', async () => {
    const validationErr = new Error('اطلاعات نامعتبر')
    validationErr.status = 400
    const onlineFn = vi.fn().mockRejectedValue(validationErr)
    const saveOffline = vi.fn()

    await expect(
      withOfflineWrite({ isOnline: true, saveOffline, entity: 'clients', action: 'update', data: { id: 'c1' }, onlineFn })
    ).rejects.toThrow('اطلاعات نامعتبر')
    expect(saveOffline).not.toHaveBeenCalled()
  })
})
