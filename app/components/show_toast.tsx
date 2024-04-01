import {useEffect} from 'react'
import {toast as showToast} from 'sonner'
import {type Toast} from '~/utils/toast.server'

export function ShowToast({toast}: {toast: Toast}) {
  const {id, status, title, description} = toast
  useEffect(() => {
    setTimeout(() => {
      showToast[status](title, {
        id,
        description,
      })
    }, 0)
  }, [id, description, title, status])
  return null
}
