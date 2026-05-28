import React, { useEffect, useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { fetchInvoiceData, invoiceSelector } from "../../ReduxApi/invoice"
import { DonutChart, BarChartCard, HorizontalBarChart } from "../../shared/charts"

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

export function DashboardGraphCard({ title, subtitle, badge, children }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-100/50 hover:-translate-y-0.5 transition-transform duration-200">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-1 truncate">{subtitle}</p>}
        </div>
        {badge && (
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            {badge}
          </span>
        )}
      </div>
      <div className="min-h-60">{children}</div>
    </div>
  )
}

function safeDate(value) {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function getInvoiceDateKey(invoice) {
  const date = safeDate(invoice?.invoice_date || invoice?.date || invoice?.createdAt)
  return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : null
}

function buildMonthSeries(months) {
  return months.map(({ year, month }) => ({
    name: `${MONTH_LABELS[month - 1]} ${year}`,
    value: 0,
  }))
}

export default function DashboardGraphs() {
  const dispatch = useDispatch()
  const { invoiceData = [], isLoading } = useSelector(invoiceSelector)

  useEffect(() => {
    if (!invoiceData.length) {
      dispatch(fetchInvoiceData())
    }
  }, [dispatch, invoiceData.length])

  const invoices = Array.isArray(invoiceData) ? invoiceData : []

  const statusData = useMemo(() => {
    const counts = { Paid: 0, Issued: 0, "On Hold": 0, New: 0, Other: 0 }
    invoices.forEach((item) => {
      const status = (item?.status || "").trim()
      if (status === "Paid") counts.Paid += 1
      else if (status === "Issued") counts.Issued += 1
      else if (status === "On Hold") counts["On Hold"] += 1
      else if (status === "New") counts.New += 1
      else counts.Other += 1
    })

    const raw = Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))

    return raw.length
      ? raw
      : [
          { name: "Paid", value: 14 },
          { name: "Issued", value: 8 },
          { name: "On Hold", value: 4 },
          { name: "New", value: 3 },
        ]
  }, [invoices])

  const invoiceTrendData = useMemo(() => {
    const today = new Date()
    const months = Array.from({ length: 6 }).map((_, index) => {
      const copy = new Date(today)
      copy.setMonth(today.getMonth() - (5 - index))
      return { year: copy.getFullYear(), month: copy.getMonth() + 1 }
    })

    const counts = buildMonthSeries(months)
    const buckets = new Map(counts.map((item) => [item.name, item]))

    invoices.forEach((invoice) => {
      const key = getInvoiceDateKey(invoice)
      if (!key) return
      const [year, month] = key.split("-").map(Number)
      const label = `${MONTH_LABELS[month - 1]} ${year}`
      const bucket = buckets.get(label)
      if (bucket) bucket.value += 1
    })

    return Array.from(buckets.values())
  }, [invoices])

  const clientData = useMemo(() => {
    const counts = {}
    invoices.forEach((invoice) => {
      const client = (invoice?.company_name || invoice?.customer_name || "Unknown Client").trim()
      if (!client) return
      counts[client] = (counts[client] || 0) + 1
    })

    const topClients = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))

    return topClients.length
      ? topClients
      : [
          { name: "Alpha Enterprises", value: 6 },
          { name: "Omega Retail", value: 4 },
          { name: "Bright Solutions", value: 3 },
        ]
  }, [invoices])

  const typeBreakdown = useMemo(() => {
    const domestic = invoices.reduce((sum, inv) => {
      return sum + (inv?.invoice_type?.trim().toLowerCase() === "international" ? 0 : 1)
    }, 0)
    const international = invoices.length - domestic
    const values = []
    if (domestic >= 0) values.push({ name: "Domestic", value: domestic })
    if (international > 0) values.push({ name: "International", value: international })

    return values.length
      ? values
      : [
          { name: "Domestic", value: 11 },
          { name: "International", value: 5 },
        ]
  }, [invoices])

  return (
    <div className="mt-2 grid grid-cols-1 xl:grid-cols-3 gap-4">
      <DashboardGraphCard
        title="Invoice Status Breakdown"
        subtitle={isLoading ? "Loading fresh invoice status..." : "Share of invoices by status"}
        badge={`${invoices.length || statusData.reduce((sum, item) => sum + item.value, 0)} total`}
      >
        <DonutChart
          title="Status split"
          subtitle="Latest chart"
          data={statusData}
          tooltipLabel="Invoices"
        />
      </DashboardGraphCard>

      <DashboardGraphCard
        title="Invoice Trend"
        subtitle="Count over the last 6 months"
        badge={`${invoiceTrendData.reduce((sum, item) => sum + item.value, 0)} invoices`}
      >
        <BarChartCard
          title="Monthly invoices"
          subtitle="Counts"
          data={invoiceTrendData}
          tooltipFormatter={(value) => [`${value} invoices`, "Month"]}
          yTickFormatter={(value) => value}
        />
      </DashboardGraphCard>

      <DashboardGraphCard
        title="Top Clients"
        subtitle="Most active billing partners"
        badge="Top 5"
      >
        <HorizontalBarChart
          title="Client activity"
          subtitle="Invoices per client"
          data={clientData}
          tooltipFormatter={(value) => [`${value} invoices`, "Client"]}
        />
      </DashboardGraphCard>
    </div>
  )
}
