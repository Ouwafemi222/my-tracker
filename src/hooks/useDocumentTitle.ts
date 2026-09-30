import { useEffect } from 'react'
import { getAppBranding } from '../config/appVariant'

export function useDocumentTitle() {
  useEffect(() => {
    document.title = getAppBranding().documentTitle
  }, [])
}
