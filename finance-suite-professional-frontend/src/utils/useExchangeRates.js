import { useState, useEffect } from 'react'

// Module-level cache — survives re-renders, cleared on page refresh
const cache = { rates: null, base: null, fetchedAt: null }
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export default function useExchangeRates(baseCurrency = 'INR') {
  const [rates, setRates] = useState(cache.base === baseCurrency ? cache.rates : null)
  const [loading, setLoading] = useState(!(cache.base === baseCurrency && cache.rates))

  useEffect(() => {
    const isFresh =
      cache.rates &&
      cache.base === baseCurrency &&
      cache.fetchedAt &&
      Date.now() - cache.fetchedAt < CACHE_TTL

    if (isFresh) {
      setRates(cache.rates)
      setLoading(false)
      return
    }

    setLoading(true)
    fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`)
      .then(r => r.json())
      .then(data => {
        if (data?.rates) {
          cache.rates = data.rates
          cache.base = baseCurrency
          cache.fetchedAt = Date.now()
          setRates(data.rates)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [baseCurrency])

  // Returns amount converted FROM fromCurrency INTO baseCurrency
  const convert = (amount, fromCurrency) => {
    const num = Number(amount) || 0
    // Treat empty/missing currency_type as INR (domestic default)
    const from = (fromCurrency || 'INR').toUpperCase()
    const base = baseCurrency.toUpperCase()
    if (from === base) return num
    if (!rates) return num
    const rate = rates[from]
    // If rate not found, skip this invoice (don't pollute the sum with unconverted foreign amount)
    if (!rate) return 0
    // rates: 1 baseCurrency = rate[from] units of `from`
    // so from → base: divide by rate
    return num / rate
  }

  return { rates, loading, convert }
}
